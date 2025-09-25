/**
 * Main emulator application
 * Coordinates CPU, memory, peripherals, and provides execution control
 */
import { SystemBus } from './core/bus';
import { SystemConfig } from './config/system';
import { MemoryInspectorImpl } from './debug/memory-inspector';
import { DebugInspectorImpl } from './debug/inspector';
import { CC65SymbolParser } from './cc65/symbol-parser';
import { EmulatorProfiler } from './performance/profiler';
import { EmulatorOptimizer } from './performance/optimizer';
/**
 * Execution state of the emulator
 */
export declare enum EmulatorState {
    STOPPED = "stopped",
    RUNNING = "running",
    PAUSED = "paused",
    STEPPING = "stepping",
    ERROR = "error"
}
/**
 * Execution statistics
 */
export interface ExecutionStats {
    totalCycles: number;
    instructionsExecuted: number;
    executionTimeMs: number;
    averageIPS: number;
    clockSpeed: number;
}
/**
 * Main emulator class that coordinates all components
 */
export declare class Emulator {
    private systemBus;
    private config;
    private state;
    private memoryInspector;
    private debugInspector;
    private symbolParser?;
    private memoryLayout?;
    private profiler;
    private optimizer;
    private speedController;
    private executionTimer?;
    private targetClockSpeed;
    private cyclesPerTick;
    private stats;
    private startTime;
    private lastStatsUpdate;
    constructor(config?: SystemConfig);
    /**
     * Initialize the emulator from configuration
     */
    initialize(): Promise<void>;
    /**
     * Configure peripherals based on system configuration
     */
    private configurePeripherals;
    /**
     * Reset the entire system
     */
    reset(): void;
    /**
     * Start continuous execution
     */
    start(): void;
    /**
     * Stop execution
     */
    stop(): void;
    /**
     * Pause execution
     */
    pause(): void;
    /**
     * Resume execution from paused state
     */
    resume(): void;
    /**
     * Execute a single instruction
     */
    step(): number;
    /**
     * Schedule the next execution cycle
     */
    private scheduleExecution;
    /**
     * Execute a chunk of instructions
     */
    private executeChunk;
    /**
     * Calculate cycles per tick based on target clock speed
     */
    private calculateCyclesPerTick;
    /**
     * Update execution statistics
     */
    private updateStats;
    /**
     * Reset execution statistics
     */
    private resetStats;
    /**
     * Log system information
     */
    private logSystemInfo;
    getState(): EmulatorState;
    getStats(): ExecutionStats;
    getSystemBus(): SystemBus;
    getConfig(): SystemConfig;
    getMemoryInspector(): MemoryInspectorImpl;
    getDebugInspector(): DebugInspectorImpl;
    getSymbolParser(): CC65SymbolParser | undefined;
    getMemoryLayout(): any | undefined;
    /**
     * Set target clock speed
     */
    setClockSpeed(speed: number): void;
    /**
     * Enable/disable performance profiling
     */
    enableProfiling(enabled: boolean): void;
    /**
     * Get performance profiler
     */
    getProfiler(): EmulatorProfiler;
    /**
     * Get performance optimizer
     */
    getOptimizer(): EmulatorOptimizer;
    /**
     * Set adaptive speed control
     */
    setAdaptiveSpeed(enabled: boolean): void;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): any;
    /**
     * Load a new configuration and reinitialize
     */
    loadConfig(config: SystemConfig): Promise<void>;
    /**
     * Load configuration from file and reinitialize
     */
    loadConfigFromFile(configPath: string): Promise<void>;
}
//# sourceMappingURL=emulator.d.ts.map