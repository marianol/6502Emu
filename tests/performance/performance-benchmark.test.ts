/**
 * Performance benchmark tests
 */

import { Emulator } from '../../src/emulator';
import { SystemConfigLoader } from '../../src/config/system';
import { EmulatorBenchmark } from '../../src/performance/benchmark';

describe('Performance Benchmarks', () => {
  let emulator: Emulator;
  let benchmark: EmulatorBenchmark;

  beforeEach(async () => {
    const config = SystemConfigLoader.getDefaultConfig();
    emulator = new Emulator(config);
    await emulator.initialize();
    benchmark = new EmulatorBenchmark(emulator);
  });

  afterEach(() => {
    emulator.stop();
  });

  test('CPU instruction benchmark', async () => {
    const result = await benchmark['runCPUBenchmark']();
    
    expect(result.name).toBe('CPU Instructions');
    expect(result.duration).toBeGreaterThan(0);
    expect(result.instructionsExecuted).toBeGreaterThan(0);
    expect(result.cyclesExecuted).toBeGreaterThan(0);
    expect(result.averageIPS).toBeGreaterThan(0);
    expect(result.efficiency).toBeGreaterThan(0);
  }, 10000);

  test('Memory access benchmark', async () => {
    const result = await benchmark['runMemoryBenchmark']();
    
    expect(result.name).toBe('Memory Access');
    expect(result.memoryAccesses).toBeGreaterThan(0);
    expect(result.averageIPS).toBeGreaterThan(0);
  }, 10000);

  test('Peripheral I/O benchmark', async () => {
    const result = await benchmark['runPeripheralBenchmark']();
    
    expect(result.name).toBe('Peripheral I/O');
    expect(result.peripheralAccesses).toBeGreaterThan(0);
  }, 10000);

  test('Full benchmark suite', async () => {
    const suite = await benchmark.runBenchmarkSuite();
    
    expect(suite.name).toBe('Emulator Performance Suite');
    expect(suite.results).toHaveLength(5);
    expect(suite.summary.totalDuration).toBeGreaterThan(0);
    expect(suite.summary.averageIPS).toBeGreaterThan(0);
    expect(suite.summary.overallEfficiency).toBeGreaterThan(0);
    
    // Verify all benchmark types are present
    const benchmarkNames = suite.results.map(r => r.name);
    expect(benchmarkNames).toContain('CPU Instructions');
    expect(benchmarkNames).toContain('Memory Access');
    expect(benchmarkNames).toContain('Peripheral I/O');
    expect(benchmarkNames).toContain('Mixed Workload');
    expect(benchmarkNames).toContain('Breakpoint Overhead');
  }, 30000);

  test('Performance profiler integration', async () => {
    emulator.enableProfiling(true);
    
    // Run a simple program
    const testProgram = new Uint8Array([
      0xA9, 0x01,  // LDA #$01
      0x8D, 0x00, 0x02,  // STA $0200
      0x4C, 0x00, 0x02  // JMP $0200
    ]);
    
    emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
    emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });
    
    emulator.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    emulator.stop();
    
    const profiler = emulator.getProfiler();
    const metrics = profiler.getMetrics();
    const analysis = profiler.getAnalysis();
    
    expect(metrics.instructionCount).toBeGreaterThan(0);
    expect(metrics.totalExecutionTime).toBeGreaterThan(0);
    expect(analysis.efficiency).toBeGreaterThanOrEqual(0);
    
    emulator.enableProfiling(false);
  });

  test('Performance optimization effects', async () => {
    const optimizer = emulator.getOptimizer();
    
    // Test memory cache optimization
    const memoryManager = optimizer.getMemoryManager();
    memoryManager.enableCache(true);
    
    // Test speed controller
    const speedController = optimizer.getSpeedController();
    speedController.setTargetSpeed(2000000); // 2MHz
    speedController.setAdaptiveMode(true);
    
    expect(speedController.getTargetSpeed()).toBe(2000000);
    
    // Test breakpoint optimization
    const breakpointManager = optimizer.getBreakpointManager();
    breakpointManager.addBreakpoint(0x1000);
    breakpointManager.addBreakpoint(0x2000);
    
    expect(breakpointManager.hasBreakpoint(0x1000)).toBe(true);
    expect(breakpointManager.hasBreakpoint(0x1500)).toBe(false);
    expect(breakpointManager.getCount()).toBe(2);
  });

  test('Benchmark result export', async () => {
    // Create a minimal benchmark suite
    const suite = {
      name: 'Test Suite',
      results: [{
        name: 'Test Benchmark',
        duration: 1000,
        cyclesExecuted: 50000,
        instructionsExecuted: 25000,
        averageIPS: 25000,
        averageCPS: 50000,
        memoryAccesses: 10000,
        peripheralAccesses: 100,
        efficiency: 85.5
      }],
      summary: {
        totalDuration: 1000,
        averageIPS: 25000,
        averageCPS: 50000,
        overallEfficiency: 85.5,
        recommendations: ['Test recommendation']
      }
    };
    
    const exported = benchmark.exportResults(suite);
    
    expect(exported).toContain('Test Suite Results');
    expect(exported).toContain('Test Benchmark');
    expect(exported).toContain('Efficiency: 85.5%');
    expect(exported).toContain('Test recommendation');
  });
});