/**
 * Performance benchmark utility for the 6502 emulator
 * Provides standardized performance tests and measurements
 */
import { Emulator } from '../emulator';
export interface BenchmarkResult {
    name: string;
    duration: number;
    cyclesExecuted: number;
    instructionsExecuted: number;
    averageIPS: number;
    averageCPS: number;
    memoryAccesses: number;
    peripheralAccesses: number;
    efficiency: number;
}
export interface BenchmarkSuite {
    name: string;
    results: BenchmarkResult[];
    summary: BenchmarkSummary;
}
export interface BenchmarkSummary {
    totalDuration: number;
    averageIPS: number;
    averageCPS: number;
    overallEfficiency: number;
    recommendations: string[];
}
/**
 * Performance benchmark runner
 */
export declare class EmulatorBenchmark {
    private emulator;
    constructor(emulator: Emulator);
    /**
     * Run a comprehensive benchmark suite
     */
    runBenchmarkSuite(): Promise<BenchmarkSuite>;
    /**
     * CPU instruction execution benchmark
     */
    private runCPUBenchmark;
    /**
     * Memory access benchmark
     */
    private runMemoryBenchmark;
    /**
     * Peripheral I/O benchmark
     */
    private runPeripheralBenchmark;
    /**
     * Mixed workload benchmark
     */
    private runMixedWorkloadBenchmark;
    /**
     * Breakpoint overhead benchmark
     */
    private runBreakpointBenchmark;
    /**
     * Setup benchmark environment
     */
    private setupBenchmark;
    /**
     * Calculate benchmark summary
     */
    private calculateSummary;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Export benchmark results
     */
    exportResults(suite: BenchmarkSuite): string;
}
//# sourceMappingURL=benchmark.d.ts.map