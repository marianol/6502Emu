/**
 * Automated regression test suite
 * Ensures that changes don't break existing functionality
 */

import { Emulator } from '../../src/emulator';
import { SystemConfigLoader } from '../../src/config/system';
import { EmulatorBenchmark } from '../../src/performance/benchmark';
import * as fs from 'fs';
import * as path from 'path';

export interface RegressionTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  metrics?: any;
  duration: number;
}

export interface RegressionSuite {
  version: string;
  timestamp: string;
  results: RegressionTestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Regression test runner
 */
export class RegressionTestRunner {
  private emulator: Emulator;
  private testResults: RegressionTestResult[] = [];

  constructor() {
    const config = SystemConfigLoader.getDefaultConfig();
    this.emulator = new Emulator(config);
  }

  /**
   * Run complete regression test suite
   */
  async runRegressionSuite(): Promise<RegressionSuite> {
    console.log('Starting regression test suite...');
    
    await this.emulator.initialize();
    this.testResults = [];

    // Core functionality tests
    await this.runTest('CPU Basic Instructions', () => this.testCPUBasicInstructions());
    await this.runTest('Memory Management', () => this.testMemoryManagement());
    await this.runTest('Interrupt Handling', () => this.testInterruptHandling());
    
    // Peripheral tests
    await this.runTest('ACIA Functionality', () => this.testACIAFunctionality());
    await this.runTest('VIA Functionality', () => this.testVIAFunctionality());
    
    // System integration tests
    await this.runTest('ROM Loading', () => this.testROMLoading());
    await this.runTest('Configuration Loading', () => this.testConfigurationLoading());
    
    // Performance regression tests
    await this.runTest('Performance Baseline', () => this.testPerformanceBaseline());
    
    // CC65 compatibility tests
    await this.runTest('CC65 Compatibility', () => this.testCC65Compatibility());
    
    // Debug features tests
    await this.runTest('Debug Features', () => this.testDebugFeatures());

    const summary = this.calculateSummary();
    
    return {
      version: this.getVersion(),
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary
    };
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log(`Running: ${testName}`);
      const metrics = await testFunction();
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        metrics,
        duration
      });
      
      console.log(`✓ ${testName} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      
      console.log(`✗ ${testName} (${duration.toFixed(2)}ms): ${error}`);
    }
    
    // Reset emulator state between tests
    this.emulator.reset();
  }

  /**
   * Test CPU basic instructions
   */
  private async testCPUBasicInstructions(): Promise<any> {
    const testProgram = new Uint8Array([
      0xA9, 0x42,  // LDA #$42
      0x8D, 0x00, 0x02,  // STA $0200
      0xAD, 0x00, 0x02,  // LDA $0200
      0x69, 0x01,  // ADC #$01
      0x8D, 0x01, 0x02,  // STA $0201
      0x00         // BRK
    ]);

    this.emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
    this.emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

    // Execute program
    let cycles = 0;
    while (cycles < 100) {
      const stepCycles = this.emulator.step();
      if (stepCycles === 0) break; // BRK or breakpoint
      cycles += stepCycles;
    }

    // Verify results
    const value1 = this.emulator.getSystemBus().getMemory().read(0x0200);
    const value2 = this.emulator.getSystemBus().getMemory().read(0x0201);
    
    if (value1 !== 0x42) throw new Error(`Expected 0x42, got 0x${value1.toString(16)}`);
    if (value2 !== 0x43) throw new Error(`Expected 0x43, got 0x${value2.toString(16)}`);

    return { cycles, value1, value2 };
  }

  /**
   * Test memory management
   */
  private async testMemoryManagement(): Promise<any> {
    const memory = this.emulator.getSystemBus().getMemory();
    
    // Test RAM access
    memory.write(0x0300, 0xAA);
    const ramValue = memory.read(0x0300);
    if (ramValue !== 0xAA) throw new Error(`RAM test failed: expected 0xAA, got 0x${ramValue.toString(16)}`);
    
    // Test ROM loading
    const romData = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
    memory.loadROM(romData, 0xF000);
    
    const romValue1 = memory.read(0xF000);
    const romValue2 = memory.read(0xF003);
    
    if (romValue1 !== 0x11) throw new Error(`ROM test failed: expected 0x11, got 0x${romValue1.toString(16)}`);
    if (romValue2 !== 0x44) throw new Error(`ROM test failed: expected 0x44, got 0x${romValue2.toString(16)}`);
    
    // Test memory map validation
    const memoryMap = memory.getMemoryMap();
    const hasRAM = memoryMap.some(region => region.type === 'RAM');
    const hasROM = memoryMap.some(region => region.type === 'ROM');
    
    if (!hasRAM) throw new Error('No RAM region found in memory map');
    if (!hasROM) throw new Error('No ROM region found in memory map');

    return { ramValue, romValue1, romValue2, memoryMapSize: memoryMap.length };
  }

  /**
   * Test interrupt handling
   */
  private async testInterruptHandling(): Promise<any> {
    // Set up interrupt vector
    const memory = this.emulator.getSystemBus().getMemory();
    memory.write(0xFFFE, 0x10); // IRQ vector low
    memory.write(0xFFFF, 0x03); // IRQ vector high

    // ISR that sets a flag
    const isr = new Uint8Array([
      0xA9, 0xFF,  // LDA #$FF
      0x8D, 0x00, 0x02,  // STA $0200
      0x40         // RTI
    ]);
    memory.loadROM(isr, 0x0310);

    // Main program
    const mainProgram = new Uint8Array([
      0x58,        // CLI (enable interrupts)
      0xEA,        // NOP
      0xEA,        // NOP
      0x4C, 0x01, 0x02  // JMP $0201 (loop)
    ]);
    memory.loadROM(mainProgram, 0x0200);

    const cpu = this.emulator.getSystemBus().getCPU();
    cpu.setRegisters({ PC: 0x0200 });

    // Execute a few cycles
    for (let i = 0; i < 10; i++) {
      this.emulator.step();
    }

    // Trigger interrupt
    cpu.triggerIRQ();

    // Execute more cycles to handle interrupt
    for (let i = 0; i < 20; i++) {
      this.emulator.step();
    }

    // Check if interrupt was handled
    const flagValue = memory.read(0x0200);
    if (flagValue !== 0xFF) throw new Error(`Interrupt not handled: expected 0xFF, got 0x${flagValue.toString(16)}`);

    return { flagValue };
  }

  /**
   * Test ACIA functionality
   */
  private async testACIAFunctionality(): Promise<any> {
    const testProgram = new Uint8Array([
      0xA9, 0x03,        // LDA #$03 (reset)
      0x8D, 0x00, 0x50,  // STA $5000
      0xA9, 0x11,        // LDA #$11 (configure)
      0x8D, 0x00, 0x50,  // STA $5000
      0xAD, 0x00, 0x50,  // LDA $5000 (read status)
      0x8D, 0x00, 0x02,  // STA $0200
      0x00               // BRK
    ]);

    this.emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
    this.emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

    // Execute program
    for (let i = 0; i < 20; i++) {
      this.emulator.step();
    }

    const status = this.emulator.getSystemBus().getMemory().read(0x0200);
    if ((status & 0x02) === 0) throw new Error('ACIA TDRE flag not set');

    return { status };
  }

  /**
   * Test VIA functionality
   */
  private async testVIAFunctionality(): Promise<any> {
    const testProgram = new Uint8Array([
      0xA9, 0xFF,        // LDA #$FF
      0x8D, 0x03, 0x60,  // STA $6003 (DDRA)
      0xA9, 0x55,        // LDA #$55
      0x8D, 0x01, 0x60,  // STA $6001 (ORA)
      0xAD, 0x01, 0x60,  // LDA $6001
      0x8D, 0x00, 0x02,  // STA $0200
      0x00               // BRK
    ]);

    this.emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
    this.emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

    // Execute program
    for (let i = 0; i < 20; i++) {
      this.emulator.step();
    }

    const portValue = this.emulator.getSystemBus().getMemory().read(0x0200);
    if (portValue !== 0x55) throw new Error(`VIA port test failed: expected 0x55, got 0x${portValue.toString(16)}`);

    return { portValue };
  }

  /**
   * Test ROM loading
   */
  private async testROMLoading(): Promise<any> {
    const config = this.emulator.getConfig();
    const originalROMCount = config.memory.romImages.length;

    // Test loading different ROM formats (simulated)
    const testData = new Uint8Array([0xEA, 0xEA, 0x4C, 0x00, 0x02]); // NOP, NOP, JMP $0200
    this.emulator.getSystemBus().getMemory().loadROM(testData, 0x8000);

    const loadedValue = this.emulator.getSystemBus().getMemory().read(0x8000);
    if (loadedValue !== 0xEA) throw new Error(`ROM loading failed: expected 0xEA, got 0x${loadedValue.toString(16)}`);

    return { originalROMCount, loadedValue };
  }

  /**
   * Test configuration loading
   */
  private async testConfigurationLoading(): Promise<any> {
    const config = this.emulator.getConfig();
    
    // Verify default configuration values
    if (config.cpu.type !== '6502' && config.cpu.type !== '65C02') {
      throw new Error(`Invalid CPU type: ${config.cpu.type}`);
    }
    
    if (config.cpu.clockSpeed <= 0) {
      throw new Error(`Invalid clock speed: ${config.cpu.clockSpeed}`);
    }
    
    if (config.memory.ramSize <= 0) {
      throw new Error(`Invalid RAM size: ${config.memory.ramSize}`);
    }

    return {
      cpuType: config.cpu.type,
      clockSpeed: config.cpu.clockSpeed,
      ramSize: config.memory.ramSize
    };
  }

  /**
   * Test performance baseline
   */
  private async testPerformanceBaseline(): Promise<any> {
    const benchmark = new EmulatorBenchmark(this.emulator);
    
    // Run a quick CPU benchmark
    const result = await benchmark['runCPUBenchmark']();
    
    // Check if performance is within acceptable range
    const minIPS = 100000; // Minimum 100K instructions per second
    if (result.averageIPS < minIPS) {
      throw new Error(`Performance below baseline: ${result.averageIPS} IPS < ${minIPS} IPS`);
    }

    return {
      averageIPS: result.averageIPS,
      efficiency: result.efficiency
    };
  }

  /**
   * Test CC65 compatibility
   */
  private async testCC65Compatibility(): Promise<any> {
    // Test CC65-style memory layout
    const memory = this.emulator.getSystemBus().getMemory();
    
    // Simulate CC65 zero page usage
    memory.write(0x00, 0x12);
    memory.write(0x01, 0x34);
    
    const zp1 = memory.read(0x00);
    const zp2 = memory.read(0x01);
    
    if (zp1 !== 0x12 || zp2 !== 0x34) {
      throw new Error('Zero page access failed');
    }
    
    // Test stack area
    memory.write(0x01FF, 0xAB);
    const stackValue = memory.read(0x01FF);
    
    if (stackValue !== 0xAB) {
      throw new Error('Stack area access failed');
    }

    return { zp1, zp2, stackValue };
  }

  /**
   * Test debug features
   */
  private async testDebugFeatures(): Promise<any> {
    const cpu = this.emulator.getSystemBus().getCPU();
    const debugInspector = this.emulator.getDebugInspector();
    
    // Test breakpoint functionality
    cpu.setBreakpoint(0x0205);
    
    const testProgram = new Uint8Array([
      0xA9, 0x01,  // LDA #$01
      0xA9, 0x02,  // LDA #$02
      0xA9, 0x03,  // LDA #$03 (breakpoint here)
      0xA9, 0x04,  // LDA #$04
      0x00         // BRK
    ]);
    
    this.emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
    cpu.setRegisters({ PC: 0x0200 });
    
    // Execute until breakpoint
    let hitBreakpoint = false;
    for (let i = 0; i < 10; i++) {
      const cycles = this.emulator.step();
      if (cycles === 0) {
        hitBreakpoint = true;
        break;
      }
    }
    
    if (!hitBreakpoint) throw new Error('Breakpoint not hit');
    
    const pc = cpu.getRegisters().PC;
    if (pc !== 0x0205) throw new Error(`Breakpoint at wrong address: expected 0x0205, got 0x${pc.toString(16)}`);
    
    // Test memory inspection
    const memoryInspector = this.emulator.getMemoryInspector();
    const memoryRange = memoryInspector.readRange(0x0200, 5);
    
    if (memoryRange.length !== 5) throw new Error('Memory inspection failed');

    return { hitBreakpoint, pc, memoryRangeSize: memoryRange.length };
  }

  /**
   * Calculate test summary
   */
  private calculateSummary(): RegressionSuite['summary'] {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    return {
      totalTests,
      passed,
      failed,
      successRate
    };
  }

  /**
   * Get version information
   */
  private getVersion(): string {
    try {
      const packagePath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Export regression test results
   */
  exportResults(suite: RegressionSuite): string {
    const lines: string[] = [];
    
    lines.push(`# Regression Test Results`);
    lines.push(`Version: ${suite.version}`);
    lines.push(`Timestamp: ${suite.timestamp}`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push(`- Total Tests: ${suite.summary.totalTests}`);
    lines.push(`- Passed: ${suite.summary.passed}`);
    lines.push(`- Failed: ${suite.summary.failed}`);
    lines.push(`- Success Rate: ${suite.summary.successRate.toFixed(1)}%`);
    lines.push('');
    
    lines.push('## Test Results');
    suite.results.forEach(result => {
      const status = result.passed ? '✓' : '✗';
      lines.push(`${status} ${result.testName} (${result.duration.toFixed(2)}ms)`);
      if (!result.passed && result.error) {
        lines.push(`  Error: ${result.error}`);
      }
    });
    
    return lines.join('\n');
  }
}