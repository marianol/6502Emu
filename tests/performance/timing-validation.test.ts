/**
 * Timing validation tests
 * Ensures emulator timing accuracy and performance characteristics
 */

import { Emulator } from '../../src/emulator';
import { SystemConfigLoader } from '../../src/config/system';

describe('Timing Validation', () => {
  let emulator: Emulator;

  beforeEach(async () => {
    const config = SystemConfigLoader.getDefaultConfig();
    emulator = new Emulator(config);
    await emulator.initialize();
  });

  afterEach(() => {
    emulator.stop();
  });

  describe('CPU Instruction Timing', () => {
    test('Basic instruction cycle counts', async () => {
      // Test program with known cycle counts
      const testProgram = new Uint8Array([
        0xEA,        // NOP (2 cycles)
        0xA9, 0x01,  // LDA #$01 (2 cycles)
        0x8D, 0x00, 0x02,  // STA $0200 (4 cycles)
        0xAD, 0x00, 0x02,  // LDA $0200 (4 cycles)
        0x00         // BRK (7 cycles)
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      const initialStats = emulator.getStats();
      let totalCycles = 0;

      // Execute each instruction and verify cycle count
      totalCycles += emulator.step(); // NOP
      expect(totalCycles).toBe(2);

      totalCycles += emulator.step(); // LDA #$01
      expect(totalCycles).toBe(4);

      totalCycles += emulator.step(); // STA $0200
      expect(totalCycles).toBe(8);

      totalCycles += emulator.step(); // LDA $0200
      expect(totalCycles).toBe(12);

      // Verify total cycle count matches expected
      const finalStats = emulator.getStats();
      const actualCycles = finalStats.totalCycles - initialStats.totalCycles;
      expect(actualCycles).toBe(12);
    });

    test('Branch instruction timing', async () => {
      // Test branch taken vs not taken timing
      const testProgram = new Uint8Array([
        0xA9, 0x00,  // LDA #$00 (2 cycles)
        0xF0, 0x02,  // BEQ +2 (3 cycles - branch taken, same page)
        0xEA,        // NOP (should be skipped)
        0xEA,        // NOP (should be skipped)
        0xA9, 0x01,  // LDA #$01 (2 cycles)
        0xD0, 0xFE,  // BNE -2 (2 cycles - branch not taken)
        0x00         // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      let totalCycles = 0;

      totalCycles += emulator.step(); // LDA #$00
      expect(totalCycles).toBe(2);

      totalCycles += emulator.step(); // BEQ +2 (taken)
      expect(totalCycles).toBe(5); // 2 + 3

      totalCycles += emulator.step(); // LDA #$01
      expect(totalCycles).toBe(7); // 5 + 2

      totalCycles += emulator.step(); // BNE -2 (not taken)
      expect(totalCycles).toBe(9); // 7 + 2
    });

    test('Page boundary crossing timing', async () => {
      // Test instructions that cross page boundaries
      const testProgram = new Uint8Array([
        0xAD, 0xFF, 0x02,  // LDA $02FF (4 cycles + 1 if page crossed)
        0xBD, 0xFF, 0x02,  // LDA $02FF,X (4 cycles + 1 if page crossed)
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      
      // Set up memory
      emulator.getSystemBus().getMemory().write(0x02FF, 0x42);
      emulator.getSystemBus().getMemory().write(0x0300, 0x43);

      // Test without page crossing
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200, X: 0x00 });
      
      let cycles1 = emulator.step(); // LDA $02FF
      expect(cycles1).toBe(4);

      cycles1 = emulator.step(); // LDA $02FF,X (X=0, no page cross)
      expect(cycles1).toBe(4);

      // Reset and test with page crossing
      emulator.reset();
      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200, X: 0x01 });

      emulator.step(); // LDA $02FF
      let cycles2 = emulator.step(); // LDA $02FF,X (X=1, page cross to $0300)
      expect(cycles2).toBe(5); // 4 + 1 for page crossing
    });
  });

  describe('Peripheral Timing', () => {
    test('ACIA timing characteristics', async () => {
      // Test ACIA access timing
      const testProgram = new Uint8Array([
        0xA9, 0x03,        // LDA #$03
        0x8D, 0x00, 0x50,  // STA $5000 (ACIA control)
        0xAD, 0x00, 0x50,  // LDA $5000 (ACIA status)
        0x8D, 0x01, 0x50,  // STA $5001 (ACIA data)
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      const startTime = performance.now();
      let totalCycles = 0;

      totalCycles += emulator.step(); // LDA #$03
      totalCycles += emulator.step(); // STA $5000
      totalCycles += emulator.step(); // LDA $5000
      totalCycles += emulator.step(); // STA $5001

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Verify peripheral access doesn't add excessive overhead
      expect(executionTime).toBeLessThan(10); // Should complete in under 10ms
      expect(totalCycles).toBe(14); // 2 + 4 + 4 + 4
    });

    test('VIA timer accuracy', async () => {
      // Test VIA Timer 1 timing
      const testProgram = new Uint8Array([
        // Set Timer 1 to a known value
        0xA9, 0x00,        // LDA #$00 (low byte)
        0x8D, 0x04, 0x60,  // STA $6004 (T1C-L)
        0xA9, 0x10,        // LDA #$10 (high byte, starts timer)
        0x8D, 0x05, 0x60,  // STA $6005 (T1C-H)
        
        // Wait for timer to expire
        0xAD, 0x0D, 0x60,  // LDA $600D (IFR)
        0x29, 0x40,        // AND #$40 (Timer 1 flag)
        0xF0, 0xF9,        // BEQ -7 (wait)
        
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      const startTime = performance.now();
      let cycles = 0;
      const maxCycles = 10000;

      // Execute until timer expires or timeout
      while (cycles < maxCycles) {
        const stepCycles = emulator.step();
        if (stepCycles === 0) break; // BRK reached
        cycles += stepCycles;
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Timer should have expired within reasonable time
      expect(cycles).toBeLessThan(maxCycles);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Real-time Performance', () => {
    test('Target clock speed accuracy', async () => {
      const targetSpeed = 1000000; // 1MHz
      emulator.setClockSpeed(targetSpeed);
      emulator.setAdaptiveSpeed(false);

      // Simple loop program
      const testProgram = new Uint8Array([
        0xA2, 0x00,  // LDX #$00
        0xE8,        // INX
        0xE0, 0x10,  // CPX #$10
        0xD0, 0xFB,  // BNE -5
        0x4C, 0x00, 0x02  // JMP $0200 (restart)
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      const startTime = performance.now();
      emulator.start();
      
      // Run for 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      emulator.stop();
      const endTime = performance.now();
      
      const stats = emulator.getStats();
      const actualTime = endTime - startTime;
      const actualSpeed = (stats.totalCycles / actualTime) * 1000;
      
      // Should be within 20% of target speed
      const speedRatio = actualSpeed / targetSpeed;
      expect(speedRatio).toBeGreaterThan(0.8);
      expect(speedRatio).toBeLessThan(1.2);
    });

    test('Adaptive speed control', async () => {
      emulator.setClockSpeed(2000000); // 2MHz
      emulator.setAdaptiveSpeed(true);

      const testProgram = new Uint8Array([
        0xEA,        // NOP
        0x4C, 0x00, 0x02  // JMP $0200
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      emulator.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      emulator.stop();

      const stats = emulator.getStats();
      const speedController = emulator.getOptimizer().getSpeedController();
      
      expect(stats.averageIPS).toBeGreaterThan(0);
      expect(speedController.getEfficiency()).toBeGreaterThan(0);
    });

    test('Performance under load', async () => {
      // Complex program that exercises multiple systems
      const testProgram = new Uint8Array([
        // Memory operations
        0xA2, 0x00,        // LDX #$00
        0xBD, 0x00, 0x03,  // LDA $0300,X
        0x9D, 0x00, 0x04,  // STA $0400,X
        
        // Peripheral access
        0x8D, 0x01, 0x50,  // STA $5001 (ACIA)
        0xAD, 0x00, 0x50,  // LDA $5000 (ACIA)
        
        // VIA access
        0x8D, 0x01, 0x60,  // STA $6001 (VIA)
        0xAD, 0x00, 0x60,  // LDA $6000 (VIA)
        
        // Loop control
        0xE8,              // INX
        0xE0, 0x80,        // CPX #$80
        0xD0, 0xED,        // BNE -19
        
        0x4C, 0x02, 0x02   // JMP $0202 (restart)
      ]);

      // Set up test data
      const testData = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        testData[i] = i;
      }
      emulator.getSystemBus().getMemory().loadROM(testData, 0x0300);
      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Enable profiling
      emulator.enableProfiling(true);

      const startTime = performance.now();
      emulator.start();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      emulator.stop();
      const endTime = performance.now();

      const profiler = emulator.getProfiler();
      const metrics = profiler.getMetrics();
      const analysis = profiler.getAnalysis();

      expect(metrics.instructionCount).toBeGreaterThan(1000);
      expect(metrics.memoryAccesses).toBeGreaterThan(500);
      expect(metrics.peripheralAccesses).toBeGreaterThan(100);
      expect(analysis.efficiency).toBeGreaterThan(50);

      emulator.enableProfiling(false);
    });
  });

  describe('Timing Regression Tests', () => {
    test('Consistent timing across runs', async () => {
      const testProgram = new Uint8Array([
        0xA9, 0x01,  // LDA #$01
        0x69, 0x01,  // ADC #$01
        0x69, 0x01,  // ADC #$01
        0x69, 0x01,  // ADC #$01
        0x00         // BRK
      ]);

      const results: number[] = [];

      // Run the same program multiple times
      for (let run = 0; run < 5; run++) {
        emulator.reset();
        emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
        emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

        const startStats = emulator.getStats();
        
        // Execute complete program
        while (true) {
          const cycles = emulator.step();
          if (cycles === 0) break; // BRK
        }

        const endStats = emulator.getStats();
        results.push(endStats.totalCycles - startStats.totalCycles);
      }

      // All runs should have identical cycle counts
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });

      expect(firstResult).toBe(9); // 2 + 2 + 2 + 2 + 1 (BRK detection)
    });

    test('Memory access timing consistency', async () => {
      const testProgram = new Uint8Array([
        0xAD, 0x00, 0x03,  // LDA $0300 (4 cycles)
        0xAD, 0x01, 0x03,  // LDA $0301 (4 cycles)
        0xAD, 0x02, 0x03,  // LDA $0302 (4 cycles)
        0x00               // BRK
      ]);

      // Set up test data
      emulator.getSystemBus().getMemory().write(0x0300, 0x11);
      emulator.getSystemBus().getMemory().write(0x0301, 0x22);
      emulator.getSystemBus().getMemory().write(0x0302, 0x33);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      let totalCycles = 0;
      
      totalCycles += emulator.step(); // LDA $0300
      expect(totalCycles).toBe(4);
      
      totalCycles += emulator.step(); // LDA $0301
      expect(totalCycles).toBe(8);
      
      totalCycles += emulator.step(); // LDA $0302
      expect(totalCycles).toBe(12);

      // Verify data was read correctly
      const registers = emulator.getSystemBus().getCPU().getRegisters();
      expect(registers.A).toBe(0x33); // Last value loaded
    });
  });
});