/**
 * Integration tests for the complete emulator system
 * Tests end-to-end program execution scenarios
 */

import { Emulator, EmulatorState } from '../../src/emulator';
import { SystemConfig } from '../../src/config/system';
import * as fs from 'fs';
import * as path from 'path';

describe('Emulator Integration Tests', () => {
  let emulator: Emulator;
  let testConfig: SystemConfig;

  beforeEach(async () => {
    // Create a test configuration
    testConfig = {
      memory: {
        ramSize: 32768,
        ramStart: 0x0000,
        romImages: []
      },
      peripherals: {
        acia: {
          baseAddress: 0x8000,
          baudRate: 9600
        },
        via: {
          baseAddress: 0x8010,
          enableTimers: true
        }
      },
      cpu: {
        type: '65C02',
        clockSpeed: 1000000
      },
      debugging: {
        enableTracing: false,
        breakOnReset: false
      }
    };

    emulator = new Emulator(testConfig);
    await emulator.initialize();
  });

  afterEach(() => {
    emulator.stop();
  });

  describe('Basic System Operation', () => {
    test('should initialize successfully', async () => {
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      
      const config = emulator.getConfig();
      expect(config.cpu.type).toBe('65C02');
      expect(config.memory.ramSize).toBe(32768);
    });

    test('should reset system properly', () => {
      emulator.reset();
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      
      const stats = emulator.getStats();
      expect(stats.totalCycles).toBe(0);
      expect(stats.instructionsExecuted).toBe(0);
    });

    test('should handle state transitions', () => {
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      
      emulator.start();
      expect(emulator.getState()).toBe(EmulatorState.RUNNING);
      
      emulator.pause();
      expect(emulator.getState()).toBe(EmulatorState.PAUSED);
      
      emulator.stop();
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });
  });

  describe('Program Execution', () => {
    test('should execute simple NOP program', async () => {
      // Create a simple program: NOP, NOP, JMP $C000 (infinite loop)
      const program = new Uint8Array([
        0xEA,       // NOP
        0xEA,       // NOP  
        0x4C, 0x00, 0xC0  // JMP $C000
      ]);

      // Load program into memory at $C000 (away from peripherals)
      const memory = emulator.getSystemBus().getMemory();
      memory.loadROM(program, 0xC000);
      
      // Set up reset vector to point to our program
      const resetVector = new Uint8Array([0x00, 0xC0]); // $C000
      memory.loadROM(resetVector, 0xFFFC);

      // Reset CPU to use reset vector
      const cpu = emulator.getSystemBus().getCPU();
      cpu.reset(); // This should set PC to $8000 via reset vector

      // Execute a few steps
      const cycles1 = emulator.step(); // NOP
      expect(cycles1).toBeGreaterThan(0);
      
      const cycles2 = emulator.step(); // NOP
      expect(cycles2).toBeGreaterThan(0);
      
      const cycles3 = emulator.step(); // JMP
      expect(cycles3).toBeGreaterThan(0);

      // Check that PC is back at start (due to JMP)
      const regs = cpu.getRegisters();
      expect(regs.PC).toBe(0xC000);

      const stats = emulator.getStats();
      expect(stats.instructionsExecuted).toBe(3);
      expect(stats.totalCycles).toBeGreaterThan(0);
    });

    test('should handle breakpoints during execution', async () => {
      // Create a program with multiple instructions
      const program = new Uint8Array([
        0xEA,       // NOP at $C000
        0xEA,       // NOP at $C001
        0xEA,       // NOP at $C002
        0x4C, 0x00, 0xC0  // JMP $C000 at $C003
      ]);

      const memory = emulator.getSystemBus().getMemory();
      memory.loadROM(program, 0xC000);
      
      // Set up reset vector
      const resetVector = new Uint8Array([0x00, 0xC0]); // $C000
      memory.loadROM(resetVector, 0xFFFC);

      const cpu = emulator.getSystemBus().getCPU();
      cpu.reset();

      // Set breakpoint at $C002
      cpu.setBreakpoint(0xC002);

      // Start execution
      emulator.start();

      // Wait a bit for execution to hit breakpoint
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should be paused at breakpoint
      expect(emulator.getState()).toBe(EmulatorState.PAUSED);

      const regs = cpu.getRegisters();
      expect(regs.PC).toBe(0xC002);
    });
  });

  describe('Memory System Integration', () => {
    test('should handle RAM read/write operations', () => {
      const memory = emulator.getSystemBus().getMemory();

      // Write to RAM
      memory.write(0x0200, 0x42);
      memory.write(0x0201, 0x84);

      // Read back
      expect(memory.read(0x0200)).toBe(0x42);
      expect(memory.read(0x0201)).toBe(0x84);
    });

    test('should prevent writes to ROM', () => {
      const rom = new Uint8Array([0x60]); // RTS instruction
      const memory = emulator.getSystemBus().getMemory();
      memory.loadROM(rom, 0xF000);

      // Attempt to write to ROM (should be ignored)
      memory.write(0xF000, 0x00);

      // Should still read original ROM value
      expect(memory.read(0xF000)).toBe(0x60);
    });

    test('should return 0xFF for unmapped memory', () => {
      const memory = emulator.getSystemBus().getMemory();
      
      // Read from unmapped address
      expect(memory.read(0x9000)).toBe(0xFF);
    });
  });

  describe('Peripheral Integration', () => {
    test('should access ACIA registers', () => {
      const peripheralHub = emulator.getSystemBus().getPeripheralHub();

      // ACIA should be mapped at $8000-$8001
      // Reading status register should return a value
      const status = peripheralHub.read(0x8000);
      expect(typeof status).toBe('number');
      expect(status).toBeGreaterThanOrEqual(0);
      expect(status).toBeLessThanOrEqual(255);

      // Writing to control register should not crash
      peripheralHub.write(0x8000, 0x03); // Reset ACIA
      
      // Writing to data register should not crash
      peripheralHub.write(0x8001, 0x41); // Send 'A'
    });

    test('should access VIA registers', () => {
      const peripheralHub = emulator.getSystemBus().getPeripheralHub();

      // VIA should be mapped at $8010-$801F
      // Test Port B data register (offset 0) and direction register (offset 2)
      peripheralHub.write(0x8012, 0xFF); // Set Port B direction to output (DDRB at offset 2)
      peripheralHub.write(0x8010, 0x55); // Write to Port B (ORB at offset 0)
      
      const portBValue = peripheralHub.read(0x8010);
      expect(portBValue).toBe(0x55);
    });

    test('should handle peripheral interrupts', async () => {
      const interruptController = emulator.getSystemBus().getInterruptController();
      
      // Trigger a manual IRQ
      interruptController.triggerIRQ();
      
      // Check interrupt status
      const status = interruptController.getInterruptStatus();
      expect(status.irqPending).toBe(true);
    });
  });

  describe('Debugging Features', () => {
    test('should provide memory inspection', () => {
      const inspector = emulator.getMemoryInspector();
      
      // Write some test data
      const memory = emulator.getSystemBus().getMemory();
      memory.write(0x0300, 0x12);
      memory.write(0x0301, 0x34);
      memory.write(0x0302, 0x56);

      // Read range
      const data = inspector.readRange(0x0300, 3);
      expect(data[0]).toBe(0x12);
      expect(data[1]).toBe(0x34);
      expect(data[2]).toBe(0x56);

      // Test memory dump
      const dump = inspector.dumpMemory(0x0300, 3, 'hex');
      expect(dump).toContain('12');
      expect(dump).toContain('34');
      expect(dump).toContain('56');
    });

    test('should provide CPU state inspection', () => {
      const debugInspector = emulator.getDebugInspector();
      
      // Get CPU state
      const state = debugInspector.getCPUState();
      expect(state).toHaveProperty('A');
      expect(state).toHaveProperty('X');
      expect(state).toHaveProperty('Y');
      expect(state).toHaveProperty('PC');
      expect(state).toHaveProperty('SP');
      expect(state).toHaveProperty('P');
    });
  });

  describe('Configuration Management', () => {
    test('should load new configuration', async () => {
      const newConfig: SystemConfig = {
        ...testConfig,
        cpu: {
          type: '6502',
          clockSpeed: 2000000
        }
      };

      await emulator.loadConfig(newConfig);

      const config = emulator.getConfig();
      expect(config.cpu.type).toBe('6502');
      expect(config.cpu.clockSpeed).toBe(2000000);
    });

    test('should handle clock speed changes', () => {
      emulator.setClockSpeed(500000);
      
      // Clock speed change should not crash the system
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid ROM loading gracefully', async () => {
      const memory = emulator.getSystemBus().getMemory();
      
      // This should not crash the system
      await expect(memory.loadROMFromFile({
        file: 'nonexistent.bin',
        loadAddress: 0x8000,
        format: 'binary'
      })).rejects.toThrow();
    });

    test('should handle execution errors gracefully', () => {
      // Set PC to unmapped memory and try to execute
      const cpu = emulator.getSystemBus().getCPU();
      cpu.setRegisters({ PC: 0x9000 });

      // This should not crash, but may return 0 cycles or handle gracefully
      expect(() => emulator.step()).not.toThrow();
    });
  });

  describe('Performance and Timing', () => {
    test('should track execution statistics', async () => {
      // Execute some instructions
      const program = new Uint8Array([
        0xEA, 0xEA, 0xEA, 0xEA, 0xEA  // 5 NOPs
      ]);

      const memory = emulator.getSystemBus().getMemory();
      memory.loadROM(program, 0xC000);

      const cpu = emulator.getSystemBus().getCPU();
      cpu.setRegisters({ PC: 0xC000 });

      // Execute instructions
      for (let i = 0; i < 5; i++) {
        emulator.step();
      }

      const stats = emulator.getStats();
      expect(stats.instructionsExecuted).toBe(5);
      expect(stats.totalCycles).toBeGreaterThan(0);
    });

    test('should handle continuous execution timing', async () => {
      // Create a simple loop program
      const program = new Uint8Array([
        0xEA,       // NOP
        0x4C, 0x00, 0xC0  // JMP $C000
      ]);

      const memory = emulator.getSystemBus().getMemory();
      memory.loadROM(program, 0xC000);

      const cpu = emulator.getSystemBus().getCPU();
      cpu.setRegisters({ PC: 0xC000 });

      // Run for a short time
      emulator.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      emulator.stop();

      const stats = emulator.getStats();
      expect(stats.instructionsExecuted).toBeGreaterThan(0);
      expect(stats.totalCycles).toBeGreaterThan(0);
      expect(stats.executionTimeMs).toBeGreaterThan(0);
    });
  });
});