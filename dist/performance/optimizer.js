"use strict";
/**
 * Performance optimizer for the 6502 emulator
 * Implements various optimization strategies based on profiling data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulatorOptimizer = exports.PeripheralOptimizer = exports.OptimizedBreakpointManager = exports.ExecutionSpeedController = exports.OptimizedMemoryManager = void 0;
const memory_1 = require("../core/memory");
/**
 * Memory access cache for frequently accessed addresses
 */
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 1000;
        this.ttl = 1000; // 1 second TTL
    }
    get(address) {
        const entry = this.cache.get(address);
        if (entry && Date.now() - entry.timestamp < this.ttl) {
            return entry.value;
        }
        if (entry) {
            this.cache.delete(address);
        }
        return undefined;
    }
    set(address, value, type) {
        // Only cache read operations to avoid stale data
        if (type === 'read') {
            if (this.cache.size >= this.maxSize) {
                // Remove oldest entry
                const oldestKey = this.cache.keys().next().value;
                if (oldestKey !== undefined) {
                    this.cache.delete(oldestKey);
                }
            }
            this.cache.set(address, { value, timestamp: Date.now(), type });
        }
        else {
            // Invalidate cache on writes
            this.cache.delete(address);
        }
    }
    clear() {
        this.cache.clear();
    }
    getStats() {
        return {
            size: this.cache.size,
            hitRate: 0 // Would need hit/miss tracking for accurate rate
        };
    }
}
/**
 * Optimized memory manager with caching
 */
class OptimizedMemoryManager extends memory_1.MemoryManager {
    constructor() {
        super();
        this.cacheEnabled = true;
        this.readHits = 0;
        this.readMisses = 0;
        this.cache = new MemoryCache();
    }
    read(address) {
        if (this.cacheEnabled) {
            const cached = this.cache.get(address);
            if (cached !== undefined) {
                this.readHits++;
                return cached;
            }
        }
        this.readMisses++;
        const value = super.read(address);
        if (this.cacheEnabled) {
            this.cache.set(address, value, 'read');
        }
        return value;
    }
    write(address, value) {
        super.write(address, value);
        if (this.cacheEnabled) {
            this.cache.set(address, value, 'write');
        }
    }
    enableCache(enabled) {
        this.cacheEnabled = enabled;
        if (!enabled) {
            this.cache.clear();
        }
    }
    getCacheStats() {
        const total = this.readHits + this.readMisses;
        return {
            hitRate: total > 0 ? (this.readHits / total) * 100 : 0,
            size: this.cache.getStats().size
        };
    }
    clearCache() {
        this.cache.clear();
        this.readHits = 0;
        this.readMisses = 0;
    }
}
exports.OptimizedMemoryManager = OptimizedMemoryManager;
/**
 * Execution speed controller
 */
class ExecutionSpeedController {
    constructor(targetSpeed = 1000000) {
        this.targetSpeed = 1000000; // 1MHz default
        this.actualSpeed = 0;
        this.adaptiveMode = false;
        this.maxSpeed = 10000000; // 10MHz max
        this.minSpeed = 1000; // 1KHz min
        // Timing control
        this.lastExecutionTime = 0;
        this.cyclesPerChunk = 1000;
        this.targetChunkTime = 16.67; // ~60 FPS
        this.targetSpeed = targetSpeed;
        this.calculateChunkSize();
    }
    /**
     * Set target execution speed in Hz
     */
    setTargetSpeed(speed) {
        this.targetSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
        this.calculateChunkSize();
    }
    /**
     * Get current target speed
     */
    getTargetSpeed() {
        return this.targetSpeed;
    }
    /**
     * Enable/disable adaptive speed control
     */
    setAdaptiveMode(enabled) {
        this.adaptiveMode = enabled;
    }
    /**
     * Calculate optimal chunk size for target speed
     */
    calculateChunkSize() {
        // Calculate cycles per chunk to maintain ~60 FPS
        this.cyclesPerChunk = Math.max(1, Math.floor((this.targetSpeed * this.targetChunkTime) / 1000));
    }
    /**
     * Get cycles per execution chunk
     */
    getCyclesPerChunk() {
        return this.cyclesPerChunk;
    }
    /**
     * Calculate delay needed to maintain target speed
     */
    calculateDelay(cyclesExecuted, executionTime) {
        if (!this.adaptiveMode) {
            // Fixed timing based on target speed
            const targetTime = (cyclesExecuted / this.targetSpeed) * 1000;
            return Math.max(0, targetTime - executionTime);
        }
        // Adaptive timing
        const currentSpeed = cyclesExecuted / (executionTime / 1000);
        this.actualSpeed = currentSpeed;
        if (currentSpeed > this.targetSpeed * 1.1) {
            // Running too fast, add delay
            const excessTime = ((currentSpeed - this.targetSpeed) / this.targetSpeed) * executionTime;
            return Math.min(100, excessTime); // Cap delay at 100ms
        }
        return 0;
    }
    /**
     * Update actual speed measurement
     */
    updateActualSpeed(cyclesExecuted, timeElapsed) {
        if (timeElapsed > 0) {
            this.actualSpeed = (cyclesExecuted / timeElapsed) * 1000;
        }
    }
    /**
     * Get current actual speed
     */
    getActualSpeed() {
        return this.actualSpeed;
    }
    /**
     * Get speed efficiency (actual/target)
     */
    getEfficiency() {
        return this.targetSpeed > 0 ? (this.actualSpeed / this.targetSpeed) * 100 : 0;
    }
}
exports.ExecutionSpeedController = ExecutionSpeedController;
/**
 * Breakpoint optimization
 */
class OptimizedBreakpointManager {
    constructor() {
        this.breakpoints = new Set();
        this.sortedBreakpoints = [];
        this.checkOptimization = true;
    }
    /**
     * Add breakpoint
     */
    addBreakpoint(address) {
        this.breakpoints.add(address);
        this.updateSortedList();
    }
    /**
     * Remove breakpoint
     */
    removeBreakpoint(address) {
        this.breakpoints.delete(address);
        this.updateSortedList();
    }
    /**
     * Check if address has breakpoint (optimized)
     */
    hasBreakpoint(address) {
        if (!this.checkOptimization || this.breakpoints.size === 0) {
            return false;
        }
        // For small numbers of breakpoints, Set lookup is fastest
        if (this.breakpoints.size <= 10) {
            return this.breakpoints.has(address);
        }
        // For larger numbers, binary search on sorted array might be faster
        return this.binarySearch(address);
    }
    /**
     * Binary search for breakpoint (for large breakpoint sets)
     */
    binarySearch(address) {
        let left = 0;
        let right = this.sortedBreakpoints.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midValue = this.sortedBreakpoints[mid];
            if (midValue === address) {
                return true;
            }
            else if (midValue < address) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        return false;
    }
    /**
     * Update sorted breakpoint list
     */
    updateSortedList() {
        this.sortedBreakpoints = Array.from(this.breakpoints).sort((a, b) => a - b);
    }
    /**
     * Clear all breakpoints
     */
    clear() {
        this.breakpoints.clear();
        this.sortedBreakpoints = [];
    }
    /**
     * Get breakpoint count
     */
    getCount() {
        return this.breakpoints.size;
    }
    /**
     * Enable/disable breakpoint checking optimization
     */
    setOptimization(enabled) {
        this.checkOptimization = enabled;
    }
}
exports.OptimizedBreakpointManager = OptimizedBreakpointManager;
/**
 * Peripheral polling optimizer
 */
class PeripheralOptimizer {
    constructor() {
        this.pollFrequencies = new Map();
        this.lastPollTimes = new Map();
        this.adaptivePolling = true;
    }
    /**
     * Set polling frequency for a peripheral
     */
    setPollingFrequency(peripheralName, frequency) {
        this.pollFrequencies.set(peripheralName, frequency);
    }
    /**
     * Check if peripheral should be polled
     */
    shouldPoll(peripheralName, currentTime) {
        if (!this.adaptivePolling) {
            return true;
        }
        const frequency = this.pollFrequencies.get(peripheralName) || 1000; // Default 1KHz
        const lastPoll = this.lastPollTimes.get(peripheralName) || 0;
        const interval = 1000 / frequency; // Convert to milliseconds
        if (currentTime - lastPoll >= interval) {
            this.lastPollTimes.set(peripheralName, currentTime);
            return true;
        }
        return false;
    }
    /**
     * Enable/disable adaptive polling
     */
    setAdaptivePolling(enabled) {
        this.adaptivePolling = enabled;
    }
    /**
     * Reset polling timers
     */
    reset() {
        this.lastPollTimes.clear();
    }
}
exports.PeripheralOptimizer = PeripheralOptimizer;
/**
 * Main performance optimizer
 */
class EmulatorOptimizer {
    constructor() {
        this.memoryCache = new OptimizedMemoryManager();
        this.speedController = new ExecutionSpeedController();
        this.breakpointManager = new OptimizedBreakpointManager();
        this.peripheralOptimizer = new PeripheralOptimizer();
    }
    /**
     * Get optimized memory manager
     */
    getMemoryManager() {
        return this.memoryCache;
    }
    /**
     * Get speed controller
     */
    getSpeedController() {
        return this.speedController;
    }
    /**
     * Get breakpoint manager
     */
    getBreakpointManager() {
        return this.breakpointManager;
    }
    /**
     * Get peripheral optimizer
     */
    getPeripheralOptimizer() {
        return this.peripheralOptimizer;
    }
    /**
     * Apply optimizations based on profiling data
     */
    applyOptimizations(analysis) {
        // Enable memory caching if memory is a bottleneck
        const memoryBottleneck = analysis.bottlenecks.find((b) => b.type === 'memory');
        if (memoryBottleneck && memoryBottleneck.severity === 'high') {
            this.memoryCache.enableCache(true);
            console.log('Enabled memory caching due to memory bottleneck');
        }
        // Optimize peripheral polling if peripheral access is slow
        const peripheralBottleneck = analysis.bottlenecks.find((b) => b.type === 'peripheral');
        if (peripheralBottleneck) {
            this.peripheralOptimizer.setAdaptivePolling(true);
            console.log('Enabled adaptive peripheral polling');
        }
        // Optimize breakpoint checking if it's causing overhead
        const breakpointBottleneck = analysis.bottlenecks.find((b) => b.type === 'breakpoint');
        if (breakpointBottleneck) {
            this.breakpointManager.setOptimization(true);
            console.log('Enabled breakpoint checking optimization');
        }
    }
    /**
     * Get optimization statistics
     */
    getStats() {
        return {
            memoryCache: this.memoryCache.getCacheStats(),
            speedControl: {
                targetSpeed: this.speedController.getTargetSpeed(),
                actualSpeed: this.speedController.getActualSpeed(),
                efficiency: this.speedController.getEfficiency()
            },
            breakpoints: {
                count: this.breakpointManager.getCount()
            }
        };
    }
}
exports.EmulatorOptimizer = EmulatorOptimizer;
//# sourceMappingURL=optimizer.js.map