/**
 * Comprehensive peripheral functionality tests
 * Tests all peripheral features with real programs
 */

import { Emulator } from '../../src/emulator';
import { SystemConfigLoader } from '../../src/config/system';
import { ACIA68B50 } from '../../src/peripherals/acia';
import { VIA65C22Implementation } from '../../src/peripherals/via';

describe('Peripheral Functionality Integration Tests', () => {
  let emulator: Emulator;

  beforeEach(async () => {
    const config = SystemConfigLoader.getDefaultConfig();
    emulator = new Emulator(config);
    await emulator.initialize();
  });

  afterEach(() => {
    emulator.stop();
  });

  describe('ACIA 68B50 Functionality', () => {
    test('ACIA initialization and configuration', async () => {
      // Test program that initializes ACIA
      const testProgram = new Uint8Array([
        // Reset ACIA
        0xA9, 0x03,        // LDA #$03 (master reset)
        0x8D, 0x00, 0x50,  // STA $5000 (ACIA control register)
        
        // Configure ACIA
        0xA9, 0x11,        // LDA #$11 (8N1, /16 clock, RTS low, no interrupts)
        0x8D, 0x00, 0x50,  // STA $5000 (ACIA control register)
        
        // Check status
        0xAD, 0x00, 0x50,  // LDA $5000 (read status register)
        0x8D, 0x00, 0x02,  // STA $0200 (store status for verification)
        
        // Halt
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program
      for (let i = 0; i < 20 && emulator.getSystemBus().getCPU().getRegisters().PC !== 0x020F; i++) {
        emulator.step();
      }

      // Verify ACIA was configured
      const status = emulator.getSystemBus().getMemory().read(0x0200);
      expect(status & 0x02).toBe(0x02); // TDRE should be set (transmit data register empty)
    });

    test('ACIA data transmission', async () => {
      // Test program that sends data through ACIA
      const testProgram = new Uint8Array([
        // Initialize ACIA
        0xA9, 0x03,        // LDA #$03
        0x8D, 0x00, 0x50,  // STA $5000
        0xA9, 0x11,        // LDA #$11
        0x8D, 0x00, 0x50,  // STA $5000
        
        // Send character 'A' (0x41)
        0xA9, 0x41,        // LDA #$41
        0x8D, 0x01, 0x50,  // STA $5001 (ACIA data register)
        
        // Wait for transmission complete
        0xAD, 0x00, 0x50,  // LDA $5000 (read status)
        0x29, 0x02,        // AND #$02 (check TDRE)
        0xF0, 0xF9,        // BEQ -7 (wait until ready)
        
        // Store completion flag
        0xA9, 0xFF,        // LDA #$FF
        0x8D, 0x00, 0x02,  // STA $0200
        
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program with timeout
      let cycles = 0;
      while (cycles < 1000 && emulator.getSystemBus().getMemory().read(0x0200) !== 0xFF) {
        emulator.step();
        cycles++;
      }

      // Verify transmission completed
      expect(emulator.getSystemBus().getMemory().read(0x0200)).toBe(0xFF);
    });

    test('ACIA interrupt generation', async () => {
      // Test program that enables ACIA interrupts
      const testProgram = new Uint8Array([
        // Set up interrupt vector
        0xA9, 0x20,        // LDA #$20 (low byte of ISR)
        0x8D, 0xFE, 0xFF,  // STA $FFFE
        0xA9, 0x02,        // LDA #$02 (high byte of ISR)
        0x8D, 0xFF, 0xFF,  // STA $FFFF
        
        // Initialize ACIA with interrupts enabled
        0xA9, 0x03,        // LDA #$03
        0x8D, 0x00, 0x50,  // STA $5000
        0xA9, 0x95,        // LDA #$95 (enable RX interrupt)
        0x8D, 0x00, 0x50,  // STA $5000
        
        // Enable interrupts
        0x58,              // CLI
        
        // Wait loop
        0xEA,              // NOP
        0x4C, 0x17, 0x02,  // JMP $0217 (wait loop)
        
        // ISR at $0220
        0xAD, 0x01, 0x50,  // LDA $5001 (read ACIA data to clear interrupt)
        0x8D, 0x00, 0x02,  // STA $0200 (store received data)
        0x40               // RTI
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute initialization
      for (let i = 0; i < 30; i++) {
        emulator.step();
      }

      // Simulate received data
      const peripheralHub = emulator.getSystemBus().getPeripheralHub();
      const aciaPeripheral = peripheralHub.getPeripherals().find(p => p.name === 'ACIA');
      if (aciaPeripheral) {
        // Simulate data reception (this would normally come from serial port)
        aciaPeripheral.peripheral.write(1, 0x42); // Send 'B'
      }

      // Execute more cycles to handle interrupt
      for (let i = 0; i < 50; i++) {
        emulator.step();
      }

      // Verify interrupt was handled
      const receivedData = emulator.getSystemBus().getMemory().read(0x0200);
      expect(receivedData).toBe(0x42);
    });
  });

  describe('VIA 65C22 Functionality', () => {
    test('VIA port I/O operations', async () => {
      // Test program that configures and uses VIA ports
      const testProgram = new Uint8Array([
        // Configure Port A as output, Port B as input
        0xA9, 0xFF,        // LDA #$FF
        0x8D, 0x03, 0x60,  // STA $6003 (DDRA - all outputs)
        0xA9, 0x00,        // LDA #$00
        0x8D, 0x02, 0x60,  // STA $6002 (DDRB - all inputs)
        
        // Write to Port A
        0xA9, 0xAA,        // LDA #$AA
        0x8D, 0x01, 0x60,  // STA $6001 (ORA - output register A)
        
        // Read Port A (should reflect output)
        0xAD, 0x01, 0x60,  // LDA $6001
        0x8D, 0x00, 0x02,  // STA $0200
        
        // Read Port B
        0xAD, 0x00, 0x60,  // LDA $6000 (IRB - input register B)
        0x8D, 0x01, 0x02,  // STA $0201
        
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program
      for (let i = 0; i < 30; i++) {
        emulator.step();
      }

      // Verify Port A output
      const portAValue = emulator.getSystemBus().getMemory().read(0x0200);
      expect(portAValue).toBe(0xAA);
    });

    test('VIA timer operations', async () => {
      // Test program that uses VIA Timer 1
      const testProgram = new Uint8Array([
        // Set Timer 1 latch
        0xA9, 0x00,        // LDA #$00 (low byte)
        0x8D, 0x04, 0x60,  // STA $6004 (T1C-L)
        0xA9, 0x10,        // LDA #$10 (high byte - start timer)
        0x8D, 0x05, 0x60,  // STA $6005 (T1C-H)
        
        // Wait for timer to expire
        0xAD, 0x0D, 0x60,  // LDA $600D (IFR - interrupt flag register)
        0x29, 0x40,        // AND #$40 (check Timer 1 flag)
        0xF0, 0xF9,        // BEQ -7 (wait for timer)
        
        // Clear timer flag
        0xA9, 0x40,        // LDA #$40
        0x8D, 0x0D, 0x60,  // STA $600D (clear T1 flag)
        
        // Set completion flag
        0xA9, 0xFF,        // LDA #$FF
        0x8D, 0x00, 0x02,  // STA $0200
        
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program with timeout
      let cycles = 0;
      while (cycles < 2000 && emulator.getSystemBus().getMemory().read(0x0200) !== 0xFF) {
        emulator.step();
        cycles++;
      }

      // Verify timer operation completed
      expect(emulator.getSystemBus().getMemory().read(0x0200)).toBe(0xFF);
    });

    test('VIA interrupt system', async () => {
      // Test program that uses VIA interrupts
      const testProgram = new Uint8Array([
        // Set up interrupt vector
        0xA9, 0x30,        // LDA #$30 (low byte of ISR)
        0x8D, 0xFE, 0xFF,  // STA $FFFE
        0xA9, 0x02,        // LDA #$02 (high byte of ISR)
        0x8D, 0xFF, 0xFF,  // STA $FFFF
        
        // Enable Timer 1 interrupt
        0xA9, 0x40,        // LDA #$40 (Timer 1 enable)
        0x8D, 0x0E, 0x60,  // STA $600E (IER - interrupt enable register)
        
        // Start Timer 1
        0xA9, 0x00,        // LDA #$00
        0x8D, 0x04, 0x60,  // STA $6004 (T1C-L)
        0xA9, 0x01,        // LDA #$01 (very short timer)
        0x8D, 0x05, 0x60,  // STA $6005 (T1C-H)
        
        // Enable interrupts
        0x58,              // CLI
        
        // Wait loop
        0xEA,              // NOP
        0x4C, 0x1D, 0x02,  // JMP $021D (wait loop)
        
        // ISR at $0230
        0xAD, 0x0D, 0x60,  // LDA $600D (read IFR)
        0x8D, 0x00, 0x02,  // STA $0200 (store interrupt flags)
        0xA9, 0x40,        // LDA #$40
        0x8D, 0x0D, 0x60,  // STA $600D (clear Timer 1 flag)
        0x40               // RTI
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program
      let cycles = 0;
      while (cycles < 1000 && emulator.getSystemBus().getMemory().read(0x0200) === 0) {
        emulator.step();
        cycles++;
      }

      // Verify interrupt was handled
      const interruptFlags = emulator.getSystemBus().getMemory().read(0x0200);
      expect(interruptFlags & 0x40).toBe(0x40); // Timer 1 interrupt flag should be set
    });
  });

  describe('Multi-Peripheral Integration', () => {
    test('ACIA and VIA working together', async () => {
      // Test program that uses both ACIA and VIA
      const testProgram = new Uint8Array([
        // Initialize ACIA
        0xA9, 0x03,        // LDA #$03
        0x8D, 0x00, 0x50,  // STA $5000
        0xA9, 0x11,        // LDA #$11
        0x8D, 0x00, 0x50,  // STA $5000
        
        // Configure VIA Port A as output
        0xA9, 0xFF,        // LDA #$FF
        0x8D, 0x03, 0x60,  // STA $6003 (DDRA)
        
        // Main loop: read ACIA, output to VIA
        0xAD, 0x00, 0x50,  // LDA $5000 (ACIA status)
        0x29, 0x01,        // AND #$01 (check RDRF)
        0xF0, 0x0A,        // BEQ +10 (no data received)
        
        // Data received, read and output to VIA
        0xAD, 0x01, 0x50,  // LDA $5001 (ACIA data)
        0x8D, 0x01, 0x60,  // STA $6001 (VIA Port A)
        0x8D, 0x00, 0x02,  // STA $0200 (store for verification)
        
        // Send acknowledgment back through ACIA
        0xA9, 0x06,        // LDA #$06 (ACK character)
        0x8D, 0x01, 0x50,  // STA $5001 (ACIA data)
        
        0x4C, 0x0F, 0x02,  // JMP $020F (main loop)
        
        0x00               // BRK (should not reach here)
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute initialization
      for (let i = 0; i < 20; i++) {
        emulator.step();
      }

      // Simulate ACIA receiving data
      const peripheralHub = emulator.getSystemBus().getPeripheralHub();
      const aciaPeripheral = peripheralHub.getPeripherals().find(p => p.name === 'ACIA');
      if (aciaPeripheral) {
        // Simulate received data
        aciaPeripheral.peripheral.write(1, 0x55); // Send test data
      }

      // Execute more cycles to process the data
      for (let i = 0; i < 50; i++) {
        emulator.step();
      }

      // Verify data was processed and output to VIA
      const processedData = emulator.getSystemBus().getMemory().read(0x0200);
      expect(processedData).toBe(0x55);
    });

    test('Peripheral timing and synchronization', async () => {
      // Test program that synchronizes peripheral operations
      const testProgram = new Uint8Array([
        // Initialize both peripherals
        0xA9, 0x03,        // LDA #$03
        0x8D, 0x00, 0x50,  // STA $5000 (ACIA reset)
        0xA9, 0x11,        // LDA #$11
        0x8D, 0x00, 0x50,  // STA $5000 (ACIA config)
        
        // Start VIA Timer 1 for timing
        0xA9, 0x00,        // LDA #$00
        0x8D, 0x04, 0x60,  // STA $6004 (T1C-L)
        0xA9, 0x20,        // LDA #$20 (timer value)
        0x8D, 0x05, 0x60,  // STA $6005 (T1C-H, start timer)
        
        // Wait for timer
        0xAD, 0x0D, 0x60,  // LDA $600D (IFR)
        0x29, 0x40,        // AND #$40 (Timer 1 flag)
        0xF0, 0xF9,        // BEQ -7 (wait)
        
        // Timer expired, send timed data
        0xA9, 0x54,        // LDA #$54 ('T' for timed)
        0x8D, 0x01, 0x50,  // STA $5001 (ACIA data)
        
        // Clear timer flag
        0xA9, 0x40,        // LDA #$40
        0x8D, 0x0D, 0x60,  // STA $600D
        
        // Set completion flag
        0xA9, 0xFF,        // LDA #$FF
        0x8D, 0x00, 0x02,  // STA $0200
        
        0x00               // BRK
      ]);

      emulator.getSystemBus().getMemory().loadROM(testProgram, 0x0200);
      emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

      // Execute program with timeout
      let cycles = 0;
      while (cycles < 2000 && emulator.getSystemBus().getMemory().read(0x0200) !== 0xFF) {
        emulator.step();
        cycles++;
      }

      // Verify timed operation completed
      expect(emulator.getSystemBus().getMemory().read(0x0200)).toBe(0xFF);
    });
  });
});