/**
 * Performance optimizer for the 6502 emulator
 * Implements various optimization strategies based on profiling data
 */
import { MemoryManager } from '../core/memory';
/**
 * Optimized memory manager with caching
 */
export declare class OptimizedMemoryManager extends MemoryManager {
    private cache;
    private cacheEnabled;
    private readHits;
    private readMisses;
    constructor();
    read(address: number): number;
    write(address: number, value: number): void;
    enableCache(enabled: boolean): void;
    getCacheStats(): {
        hitRate: number;
        size: number;
    };
    clearCache(): void;
}
/**
 * Execution speed controller
 */
export declare class ExecutionSpeedController {
    private targetSpeed;
    private actualSpeed;
    private adaptiveMode;
    private maxSpeed;
    private minSpeed;
    private lastExecutionTime;
    private cyclesPerChunk;
    private targetChunkTime;
    constructor(targetSpeed?: number);
    /**
     * Set target execution speed in Hz
     */
    setTargetSpeed(speed: number): void;
    /**
     * Get current target speed
     */
    getTargetSpeed(): number;
    /**
     * Enable/disable adaptive speed control
     */
    setAdaptiveMode(enabled: boolean): void;
    /**
     * Calculate optimal chunk size for target speed
     */
    private calculateChunkSize;
    /**
     * Get cycles per execution chunk
     */
    getCyclesPerChunk(): number;
    /**
     * Calculate delay needed to maintain target speed
     */
    calculateDelay(cyclesExecuted: number, executionTime: number): number;
    /**
     * Update actual speed measurement
     */
    updateActualSpeed(cyclesExecuted: number, timeElapsed: number): void;
    /**
     * Get current actual speed
     */
    getActualSpeed(): number;
    /**
     * Get speed efficiency (actual/target)
     */
    getEfficiency(): number;
}
/**
 * Breakpoint optimization
 */
export declare class OptimizedBreakpointManager {
    private breakpoints;
    private sortedBreakpoints;
    private checkOptimization;
    /**
     * Add breakpoint
     */
    addBreakpoint(address: number): void;
    /**
     * Remove breakpoint
     */
    removeBreakpoint(address: number): void;
    /**
     * Check if address has breakpoint (optimized)
     */
    hasBreakpoint(address: number): boolean;
    /**
     * Binary search for breakpoint (for large breakpoint sets)
     */
    private binarySearch;
    /**
     * Update sorted breakpoint list
     */
    private updateSortedList;
    /**
     * Clear all breakpoints
     */
    clear(): void;
    /**
     * Get breakpoint count
     */
    getCount(): number;
    /**
     * Enable/disable breakpoint checking optimization
     */
    setOptimization(enabled: boolean): void;
}
/**
 * Peripheral polling optimizer
 */
export declare class PeripheralOptimizer {
    private pollFrequencies;
    private lastPollTimes;
    private adaptivePolling;
    /**
     * Set polling frequency for a peripheral
     */
    setPollingFrequency(peripheralName: string, frequency: number): void;
    /**
     * Check if peripheral should be polled
     */
    shouldPoll(peripheralName: string, currentTime: number): boolean;
    /**
     * Enable/disable adaptive polling
     */
    setAdaptivePolling(enabled: boolean): void;
    /**
     * Reset polling timers
     */
    reset(): void;
}
/**
 * Main performance optimizer
 */
export declare class EmulatorOptimizer {
    private memoryCache;
    private speedController;
    private breakpointManager;
    private peripheralOptimizer;
    constructor();
    /**
     * Get optimized memory manager
     */
    getMemoryManager(): OptimizedMemoryManager;
    /**
     * Get speed controller
     */
    getSpeedController(): ExecutionSpeedController;
    /**
     * Get breakpoint manager
     */
    getBreakpointManager(): OptimizedBreakpointManager;
    /**
     * Get peripheral optimizer
     */
    getPeripheralOptimizer(): PeripheralOptimizer;
    /**
     * Apply optimizations based on profiling data
     */
    applyOptimizations(analysis: any): void;
    /**
     * Get optimization statistics
     */
    getStats(): OptimizationStats;
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
//# sourceMappingURL=optimizer.d.ts.map