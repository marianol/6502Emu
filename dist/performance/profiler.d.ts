/**
 * Performance profiler for the 6502 emulator
 * Identifies bottlenecks and provides optimization insights
 */
export interface PerformanceMetrics {
    totalExecutionTime: number;
    cpuTime: number;
    memoryTime: number;
    peripheralTime: number;
    instructionCount: number;
    cycleCount: number;
    averageIPS: number;
    averageCPS: number;
    memoryAccesses: number;
    peripheralAccesses: number;
    breakpointChecks: number;
}
export interface ProfilerSample {
    timestamp: number;
    operation: 'cpu_step' | 'memory_read' | 'memory_write' | 'peripheral_access' | 'breakpoint_check';
    address?: number;
    duration: number;
}
export declare class EmulatorProfiler {
    private samples;
    private isEnabled;
    private maxSamples;
    private startTime;
    private metrics;
    /**
     * Enable profiling
     */
    enable(): void;
    /**
     * Disable profiling
     */
    disable(): void;
    /**
     * Reset profiling data
     */
    reset(): void;
    /**
     * Record a performance sample
     */
    recordSample(operation: ProfilerSample['operation'], address?: number, duration?: number): void;
    /**
     * Start timing an operation
     */
    startTiming(): number;
    /**
     * End timing and record sample
     */
    endTiming(startTime: number, operation: ProfilerSample['operation'], address?: number): void;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get performance analysis
     */
    getAnalysis(): PerformanceAnalysis;
    /**
     * Get memory access hotspots
     */
    private getHotspots;
    /**
     * Calculate overall efficiency
     */
    private calculateEfficiency;
    /**
     * Export profiling data for analysis
     */
    exportData(): ProfilerExport;
    /**
     * Set maximum number of samples to keep
     */
    setMaxSamples(max: number): void;
}
export interface PerformanceAnalysis {
    bottlenecks: Bottleneck[];
    recommendations: string[];
    hotspots: AddressHotspot[];
    efficiency: number;
}
export interface Bottleneck {
    type: 'memory' | 'peripheral' | 'cpu' | 'breakpoint';
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: number;
}
export interface AddressHotspot {
    address: number;
    accessCount: number;
}
export interface ProfilerExport {
    metrics: PerformanceMetrics;
    samples: ProfilerSample[];
    analysis: PerformanceAnalysis;
    timestamp: string;
}
//# sourceMappingURL=profiler.d.ts.map