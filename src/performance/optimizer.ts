/**
 * Performance optimizer for the 6502 emulator
 * Implements various optimization strategies based on profiling data
 */

import { MemoryManager } from '../core/memory';
import { PeripheralHub } from '../peripherals/base';

/**
 * Memory access cache for frequently accessed addresses
 */
class MemoryCache {
  private cache = new Map<number, { value: number; timestamp: number; type: 'read' | 'write' }>();
  private maxSize: number = 1000;
  private ttl: number = 1000; // 1 second TTL

  get(address: number): number | undefined {
    const entry = this.cache.get(address);
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.value;
    }
    if (entry) {
      this.cache.delete(address);
    }
    return undefined;
  }

  set(address: number, value: number, type: 'read' | 'write'): void {
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
    } else {
      // Invalidate cache on writes
      this.cache.delete(address);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need hit/miss tracking for accurate rate
    };
  }
}

/**
 * Optimized memory manager with caching
 */
export class OptimizedMemoryManager extends MemoryManager {
  private cache: MemoryCache;
  private cacheEnabled: boolean = true;
  private readHits: number = 0;
  private readMisses: number = 0;

  constructor() {
    super();
    this.cache = new MemoryCache();
  }

  read(address: number): number {
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

  write(address: number, value: number): void {
    super.write(address, value);
    
    if (this.cacheEnabled) {
      this.cache.set(address, value, 'write');
    }
  }

  enableCache(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  getCacheStats(): { hitRate: number; size: number } {
    const total = this.readHits + this.readMisses;
    return {
      hitRate: total > 0 ? (this.readHits / total) * 100 : 0,
      size: this.cache.getStats().size
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.readHits = 0;
    this.readMisses = 0;
  }
}

/**
 * Execution speed controller
 */
export class ExecutionSpeedController {
  private targetSpeed: number = 1000000; // 1MHz default
  private actualSpeed: number = 0;
  private adaptiveMode: boolean = false;
  private maxSpeed: number = 10000000; // 10MHz max
  private minSpeed: number = 1000; // 1KHz min
  
  // Timing control
  private lastExecutionTime: number = 0;
  private cyclesPerChunk: number = 1000;
  private targetChunkTime: number = 16.67; // ~60 FPS

  constructor(targetSpeed: number = 1000000) {
    this.targetSpeed = targetSpeed;
    this.calculateChunkSize();
  }

  /**
   * Set target execution speed in Hz
   */
  setTargetSpeed(speed: number): void {
    this.targetSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
    this.calculateChunkSize();
  }

  /**
   * Get current target speed
   */
  getTargetSpeed(): number {
    return this.targetSpeed;
  }

  /**
   * Enable/disable adaptive speed control
   */
  setAdaptiveMode(enabled: boolean): void {
    this.adaptiveMode = enabled;
  }

  /**
   * Calculate optimal chunk size for target speed
   */
  private calculateChunkSize(): void {
    // Calculate cycles per chunk to maintain ~60 FPS
    this.cyclesPerChunk = Math.max(1, Math.floor((this.targetSpeed * this.targetChunkTime) / 1000));
  }

  /**
   * Get cycles per execution chunk
   */
  getCyclesPerChunk(): number {
    return this.cyclesPerChunk;
  }

  /**
   * Calculate delay needed to maintain target speed
   */
  calculateDelay(cyclesExecuted: number, executionTime: number): number {
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
  updateActualSpeed(cyclesExecuted: number, timeElapsed: number): void {
    if (timeElapsed > 0) {
      this.actualSpeed = (cyclesExecuted / timeElapsed) * 1000;
    }
  }

  /**
   * Get current actual speed
   */
  getActualSpeed(): number {
    return this.actualSpeed;
  }

  /**
   * Get speed efficiency (actual/target)
   */
  getEfficiency(): number {
    return this.targetSpeed > 0 ? (this.actualSpeed / this.targetSpeed) * 100 : 0;
  }
}

/**
 * Breakpoint optimization
 */
export class OptimizedBreakpointManager {
  private breakpoints = new Set<number>();
  private sortedBreakpoints: number[] = [];
  private checkOptimization: boolean = true;

  /**
   * Add breakpoint
   */
  addBreakpoint(address: number): void {
    this.breakpoints.add(address);
    this.updateSortedList();
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
    this.updateSortedList();
  }

  /**
   * Check if address has breakpoint (optimized)
   */
  hasBreakpoint(address: number): boolean {
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
  private binarySearch(address: number): boolean {
    let left = 0;
    let right = this.sortedBreakpoints.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midValue = this.sortedBreakpoints[mid];

      if (midValue === address) {
        return true;
      } else if (midValue < address) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return false;
  }

  /**
   * Update sorted breakpoint list
   */
  private updateSortedList(): void {
    this.sortedBreakpoints = Array.from(this.breakpoints).sort((a, b) => a - b);
  }

  /**
   * Clear all breakpoints
   */
  clear(): void {
    this.breakpoints.clear();
    this.sortedBreakpoints = [];
  }

  /**
   * Get breakpoint count
   */
  getCount(): number {
    return this.breakpoints.size;
  }

  /**
   * Enable/disable breakpoint checking optimization
   */
  setOptimization(enabled: boolean): void {
    this.checkOptimization = enabled;
  }
}

/**
 * Peripheral polling optimizer
 */
export class PeripheralOptimizer {
  private pollFrequencies = new Map<string, number>();
  private lastPollTimes = new Map<string, number>();
  private adaptivePolling: boolean = true;

  /**
   * Set polling frequency for a peripheral
   */
  setPollingFrequency(peripheralName: string, frequency: number): void {
    this.pollFrequencies.set(peripheralName, frequency);
  }

  /**
   * Check if peripheral should be polled
   */
  shouldPoll(peripheralName: string, currentTime: number): boolean {
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
  setAdaptivePolling(enabled: boolean): void {
    this.adaptivePolling = enabled;
  }

  /**
   * Reset polling timers
   */
  reset(): void {
    this.lastPollTimes.clear();
  }
}

/**
 * Main performance optimizer
 */
export class EmulatorOptimizer {
  private memoryCache: OptimizedMemoryManager;
  private speedController: ExecutionSpeedController;
  private breakpointManager: OptimizedBreakpointManager;
  private peripheralOptimizer: PeripheralOptimizer;

  constructor() {
    this.memoryCache = new OptimizedMemoryManager();
    this.speedController = new ExecutionSpeedController();
    this.breakpointManager = new OptimizedBreakpointManager();
    this.peripheralOptimizer = new PeripheralOptimizer();
  }

  /**
   * Get optimized memory manager
   */
  getMemoryManager(): OptimizedMemoryManager {
    return this.memoryCache;
  }

  /**
   * Get speed controller
   */
  getSpeedController(): ExecutionSpeedController {
    return this.speedController;
  }

  /**
   * Get breakpoint manager
   */
  getBreakpointManager(): OptimizedBreakpointManager {
    return this.breakpointManager;
  }

  /**
   * Get peripheral optimizer
   */
  getPeripheralOptimizer(): PeripheralOptimizer {
    return this.peripheralOptimizer;
  }

  /**
   * Apply optimizations based on profiling data
   */
  applyOptimizations(analysis: any): void {
    // Enable memory caching if memory is a bottleneck
    const memoryBottleneck = analysis.bottlenecks.find((b: any) => b.type === 'memory');
    if (memoryBottleneck && memoryBottleneck.severity === 'high') {
      this.memoryCache.enableCache(true);
      console.log('Enabled memory caching due to memory bottleneck');
    }

    // Optimize peripheral polling if peripheral access is slow
    const peripheralBottleneck = analysis.bottlenecks.find((b: any) => b.type === 'peripheral');
    if (peripheralBottleneck) {
      this.peripheralOptimizer.setAdaptivePolling(true);
      console.log('Enabled adaptive peripheral polling');
    }

    // Optimize breakpoint checking if it's causing overhead
    const breakpointBottleneck = analysis.bottlenecks.find((b: any) => b.type === 'breakpoint');
    if (breakpointBottleneck) {
      this.breakpointManager.setOptimization(true);
      console.log('Enabled breakpoint checking optimization');
    }
  }

  /**
   * Get optimization statistics
   */
  getStats(): OptimizationStats {
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

export interface OptimizationStats {
  memoryCache: {
    hitRate: number;
    size: number;
  };
  speedControl: {
    targetSpeed: number;
    actualSpeed: number;
    efficiency: number;
  };
  breakpoints: {
    count: number;
  };
}