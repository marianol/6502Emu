/**
 * Performance benchmark utility for the 6502 emulator
 * Provides standardized performance tests and measurements
 */

import { Emulator } from '../emulator';
import { SystemConfig } from '../config/system';

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
export class EmulatorBenchmark {
  private emulator: Emulator;

  constructor(emulator: Emulator) {
    this.emulator = emulator;
  }

  /**
   * Run a comprehensive benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    
    console.log('Starting emulator benchmark suite...');
    
    // CPU instruction benchmark
    results.push(await this.runCPUBenchmark());
    
    // Memory access benchmark
    results.push(await this.runMemoryBenchmark());
    
    // Peripheral I/O benchmark
    results.push(await this.runPeripheralBenchmark());
    
    // Mixed workload benchmark
    results.push(await this.runMixedWorkloadBenchmark());
    
    // Breakpoint overhead benchmark
    results.push(await this.runBreakpointBenchmark());

    const summary = this.calculateSummary(results);
    
    return {
      name: 'Emulator Performance Suite',
      results,
      summary
    };
  }

  /**
   * CPU instruction execution benchmark
   */
  private async runCPUBenchmark(): Promise<BenchmarkResult> {
    console.log('Running CPU benchmark...');
    
    // Create test program with various instructions
    const testProgram = new Uint8Array([
      0xA9, 0x01,  // LDA #$01
      0x8D, 0x00, 0x02,  // STA $0200
      0xAD, 0x00, 0x02,  // LDA $0200
      0x69, 0x01,  // ADC #$01
      0x8D, 0x01, 0x02,  // STA $0201
      0xA2, 0x10,  // LDX #$10
      0xCA,        // DEX
      0xD0, 0xFD,  // BNE -3 (loop)
      0x4C, 0x00, 0x02  // JMP $0200 (restart)
    ]);

    await this.setupBenchmark(testProgram, 0x0200);
    
    const startTime = performance.now();
    const startStats = this.emulator.getStats();
    
    // Run for 1 second
    this.emulator.start();
    await this.delay(1000);
    this.emulator.stop();
    
    const endTime = performance.now();
    const endStats = this.emulator.getStats();
    
    return {
      name: 'CPU Instructions',
      duration: endTime - startTime,
      cyclesExecuted: endStats.totalCycles - startStats.totalCycles,
      instructionsExecuted: endStats.instructionsExecuted - startStats.instructionsExecuted,
      averageIPS: endStats.averageIPS,
      averageCPS: endStats.clockSpeed,
      memoryAccesses: 0,
      peripheralAccesses: 0,
      efficiency: (endStats.clockSpeed / this.emulator.getConfig().cpu.clockSpeed) * 100
    };
  }

  /**
   * Memory access benchmark
   */
  private async runMemoryBenchmark(): Promise<BenchmarkResult> {
    console.log('Running memory benchmark...');
    
    // Create test program that heavily accesses memory
    const testProgram = new Uint8Array([
      0xA2, 0x00,  // LDX #$00
      0xBD, 0x00, 0x03,  // LDA $0300,X (read from table)
      0x9D, 0x00, 0x04,  // STA $0400,X (write to buffer)
      0xE8,        // INX
      0xE0, 0x80,  // CPX #$80
      0xD0, 0xF6,  // BNE -10 (loop)
      0x4C, 0x02, 0x02  // JMP $0202 (restart)
    ]);

    // Create test data
    const testData = new Uint8Array(128);
    for (let i = 0; i < 128; i++) {
      testData[i] = i;
    }

    await this.setupBenchmark(testProgram, 0x0200);
    this.emulator.getSystemBus().getMemory().loadROM(testData, 0x0300);
    
    const startTime = performance.now();
    const profiler = this.emulator.getProfiler();
    profiler.enable();
    profiler.reset();
    
    this.emulator.start();
    await this.delay(1000);
    this.emulator.stop();
    
    const endTime = performance.now();
    const metrics = profiler.getMetrics();
    profiler.disable();
    
    return {
      name: 'Memory Access',
      duration: endTime - startTime,
      cyclesExecuted: metrics.cycleCount,
      instructionsExecuted: metrics.instructionCount,
      averageIPS: metrics.averageIPS,
      averageCPS: metrics.averageCPS,
      memoryAccesses: metrics.memoryAccesses,
      peripheralAccesses: 0,
      efficiency: (metrics.averageCPS / this.emulator.getConfig().cpu.clockSpeed) * 100
    };
  }

  /**
   * Peripheral I/O benchmark
   */
  private async runPeripheralBenchmark(): Promise<BenchmarkResult> {
    console.log('Running peripheral benchmark...');
    
    // Create test program that accesses peripherals
    const testProgram = new Uint8Array([
      0xA9, 0x03,  // LDA #$03 (reset ACIA)
      0x8D, 0x00, 0x50,  // STA $5000 (ACIA control)
      0xA9, 0x01,  // LDA #$01
      0x8D, 0x01, 0x50,  // STA $5001 (ACIA data)
      0xAD, 0x00, 0x50,  // LDA $5000 (read status)
      0x29, 0x02,  // AND #$02 (check TDRE)
      0xF0, 0xF9,  // BEQ -7 (wait for ready)
      0x4C, 0x04, 0x02  // JMP $0204 (restart)
    ]);

    await this.setupBenchmark(testProgram, 0x0200);
    
    const startTime = performance.now();
    const profiler = this.emulator.getProfiler();
    profiler.enable();
    profiler.reset();
    
    this.emulator.start();
    await this.delay(1000);
    this.emulator.stop();
    
    const endTime = performance.now();
    const metrics = profiler.getMetrics();
    profiler.disable();
    
    return {
      name: 'Peripheral I/O',
      duration: endTime - startTime,
      cyclesExecuted: metrics.cycleCount,
      instructionsExecuted: metrics.instructionCount,
      averageIPS: metrics.averageIPS,
      averageCPS: metrics.averageCPS,
      memoryAccesses: metrics.memoryAccesses,
      peripheralAccesses: metrics.peripheralAccesses,
      efficiency: (metrics.averageCPS / this.emulator.getConfig().cpu.clockSpeed) * 100
    };
  }

  /**
   * Mixed workload benchmark
   */
  private async runMixedWorkloadBenchmark(): Promise<BenchmarkResult> {
    console.log('Running mixed workload benchmark...');
    
    // Create test program with mixed operations
    const testProgram = new Uint8Array([
      // Initialize
      0xA9, 0x00,  // LDA #$00
      0x8D, 0x00, 0x02,  // STA $0200 (counter)
      
      // Main loop
      0xAD, 0x00, 0x02,  // LDA $0200 (load counter)
      0x69, 0x01,  // ADC #$01 (increment)
      0x8D, 0x00, 0x02,  // STA $0200 (store counter)
      
      // Peripheral access
      0x8D, 0x01, 0x50,  // STA $5001 (ACIA data)
      0xAD, 0x00, 0x50,  // LDA $5000 (ACIA status)
      
      // Memory operations
      0xA2, 0x08,  // LDX #$08
      0xBD, 0x10, 0x02,  // LDA $0210,X
      0x9D, 0x20, 0x02,  // STA $0220,X
      0xCA,        // DEX
      0x10, 0xF8,  // BPL -8
      
      0x4C, 0x05, 0x02  // JMP $0205 (main loop)
    ]);

    await this.setupBenchmark(testProgram, 0x0200);
    
    const startTime = performance.now();
    const profiler = this.emulator.getProfiler();
    profiler.enable();
    profiler.reset();
    
    this.emulator.start();
    await this.delay(1000);
    this.emulator.stop();
    
    const endTime = performance.now();
    const metrics = profiler.getMetrics();
    profiler.disable();
    
    return {
      name: 'Mixed Workload',
      duration: endTime - startTime,
      cyclesExecuted: metrics.cycleCount,
      instructionsExecuted: metrics.instructionCount,
      averageIPS: metrics.averageIPS,
      averageCPS: metrics.averageCPS,
      memoryAccesses: metrics.memoryAccesses,
      peripheralAccesses: metrics.peripheralAccesses,
      efficiency: (metrics.averageCPS / this.emulator.getConfig().cpu.clockSpeed) * 100
    };
  }

  /**
   * Breakpoint overhead benchmark
   */
  private async runBreakpointBenchmark(): Promise<BenchmarkResult> {
    console.log('Running breakpoint benchmark...');
    
    const testProgram = new Uint8Array([
      0xEA,        // NOP
      0xEA,        // NOP
      0xEA,        // NOP
      0xEA,        // NOP
      0x4C, 0x00, 0x02  // JMP $0200
    ]);

    await this.setupBenchmark(testProgram, 0x0200);
    
    // Add many breakpoints to test overhead
    const cpu = this.emulator.getSystemBus().getCPU();
    for (let i = 0x1000; i < 0x1100; i++) {
      cpu.setBreakpoint(i);
    }
    
    const startTime = performance.now();
    const profiler = this.emulator.getProfiler();
    profiler.enable();
    profiler.reset();
    
    this.emulator.start();
    await this.delay(1000);
    this.emulator.stop();
    
    const endTime = performance.now();
    const metrics = profiler.getMetrics();
    profiler.disable();
    
    // Clear breakpoints
    cpu.clearBreakpoints();
    
    return {
      name: 'Breakpoint Overhead',
      duration: endTime - startTime,
      cyclesExecuted: metrics.cycleCount,
      instructionsExecuted: metrics.instructionCount,
      averageIPS: metrics.averageIPS,
      averageCPS: metrics.averageCPS,
      memoryAccesses: metrics.memoryAccesses,
      peripheralAccesses: 0,
      efficiency: (metrics.averageCPS / this.emulator.getConfig().cpu.clockSpeed) * 100
    };
  }

  /**
   * Setup benchmark environment
   */
  private async setupBenchmark(program: Uint8Array, startAddress: number): Promise<void> {
    this.emulator.reset();
    this.emulator.getSystemBus().getMemory().loadROM(program, startAddress);
    
    // Set PC to start address
    const cpu = this.emulator.getSystemBus().getCPU();
    const registers = cpu.getRegisters();
    cpu.setRegisters({ ...registers, PC: startAddress });
  }

  /**
   * Calculate benchmark summary
   */
  private calculateSummary(results: BenchmarkResult[]): BenchmarkSummary {
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgIPS = results.reduce((sum, r) => sum + r.averageIPS, 0) / results.length;
    const avgCPS = results.reduce((sum, r) => sum + r.averageCPS, 0) / results.length;
    const avgEfficiency = results.reduce((sum, r) => sum + r.efficiency, 0) / results.length;
    
    const recommendations: string[] = [];
    
    // Analyze results and provide recommendations
    const memoryResult = results.find(r => r.name === 'Memory Access');
    if (memoryResult && memoryResult.efficiency < 80) {
      recommendations.push('Consider enabling memory caching for better performance');
    }
    
    const peripheralResult = results.find(r => r.name === 'Peripheral I/O');
    if (peripheralResult && peripheralResult.efficiency < 70) {
      recommendations.push('Optimize peripheral polling frequency');
    }
    
    const breakpointResult = results.find(r => r.name === 'Breakpoint Overhead');
    if (breakpointResult && breakpointResult.efficiency < 90) {
      recommendations.push('Breakpoint checking is causing performance overhead');
    }
    
    if (avgEfficiency < 75) {
      recommendations.push('Overall performance is below target - consider enabling optimizations');
    }
    
    return {
      totalDuration,
      averageIPS: avgIPS,
      averageCPS: avgCPS,
      overallEfficiency: avgEfficiency,
      recommendations
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export benchmark results
   */
  exportResults(suite: BenchmarkSuite): string {
    const lines: string[] = [];
    
    lines.push(`# ${suite.name} Results`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('## Individual Benchmarks');
    suite.results.forEach(result => {
      lines.push(`### ${result.name}`);
      lines.push(`- Duration: ${result.duration.toFixed(2)}ms`);
      lines.push(`- Instructions: ${result.instructionsExecuted.toLocaleString()}`);
      lines.push(`- Cycles: ${result.cyclesExecuted.toLocaleString()}`);
      lines.push(`- Average IPS: ${result.averageIPS.toLocaleString()}`);
      lines.push(`- Average CPS: ${result.averageCPS.toLocaleString()}`);
      lines.push(`- Efficiency: ${result.efficiency.toFixed(1)}%`);
      lines.push('');
    });
    
    lines.push('## Summary');
    lines.push(`- Total Duration: ${suite.summary.totalDuration.toFixed(2)}ms`);
    lines.push(`- Average IPS: ${suite.summary.averageIPS.toLocaleString()}`);
    lines.push(`- Average CPS: ${suite.summary.averageCPS.toLocaleString()}`);
    lines.push(`- Overall Efficiency: ${suite.summary.overallEfficiency.toFixed(1)}%`);
    lines.push('');
    
    if (suite.summary.recommendations.length > 0) {
      lines.push('## Recommendations');
      suite.summary.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
    }
    
    return lines.join('\n');
  }
}