import { VIA65C22Implementation, VIAInterruptSource } from '../../src/peripherals/via';

describe('VIA65C22Implementation', () => {
  let via: VIA65C22Implementation;

  beforeEach(() => {
    via = new VIA65C22Implementation();
  });

  describe('Port I/O functionality', () => {
    test('should initialize ports to zero', () => {
      expect(via.readPortA()).toBe(0x00);
      expect(via.readPortB()).toBe(0x00);
    });

    test('should handle Port A data direction control', () => {
      // Set all pins as outputs
      via.setPortADirection(0xFF);
      via.writePortA(0xAA);
      expect(via.readPortA()).toBe(0xAA);

      // Set all pins as inputs
      via.setPortADirection(0x00);
      via.writePortA(0x55);
      expect(via.readPortA()).toBe(0xAA); // Should retain previous value for input pins
    });

    test('should handle Port B data direction control', () => {
      // Set lower 4 bits as outputs, upper 4 as inputs
      via.setPortBDirection(0x0F);
      via.writePortB(0xFF);
      expect(via.readPortB()).toBe(0x0F); // Only lower 4 bits should be set
    });

    test('should handle mixed input/output configuration', () => {
      // Port A: bits 0,2,4,6 as outputs, others as inputs
      via.setPortADirection(0x55);
      via.writePortA(0xFF);
      expect(via.readPortA()).toBe(0x55);
    });

    test('should access ports via register interface', () => {
      // Test Port A via register 0x01
      via.write(0x03, 0xFF); // Set DDRA to all outputs
      via.write(0x01, 0xAA); // Write to Port A
      expect(via.read(0x01)).toBe(0xAA);

      // Test Port B via register 0x00
      via.write(0x02, 0xFF); // Set DDRB to all outputs
      via.write(0x00, 0x55); // Write to Port B
      expect(via.read(0x00)).toBe(0x55);
    });
  });

  describe('Timer operations', () => {
    test('should initialize timers to zero', () => {
      expect(via.getTimer1()).toBe(0);
      expect(via.getTimer2()).toBe(0);
    });

    test('should set and read Timer 1', () => {
      via.setTimer1(0x1234);
      expect(via.getTimer1()).toBe(0x1234);
    });

    test('should set and read Timer 2', () => {
      via.setTimer2(0x5678);
      expect(via.getTimer2()).toBe(0x5678);
    });

    test('should decrement Timer 1 on tick', () => {
      via.setTimer1(100);
      via.tick(10);
      expect(via.getTimer1()).toBe(90);
    });

    test('should decrement Timer 2 on tick', () => {
      via.setTimer2(50);
      via.tick(25);
      expect(via.getTimer2()).toBe(25);
    });

    test('should generate Timer 1 interrupt when reaching zero', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.setTimer1(5);
      
      expect(via.getInterruptStatus()).toBe(false);
      via.tick(10);
      expect(via.getInterruptStatus()).toBe(true);
      expect(via.getInterruptFlags() & VIAInterruptSource.TIMER1).toBeTruthy();
    });

    test('should generate Timer 2 interrupt when reaching zero', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER2);
      via.setTimer2(3);
      
      expect(via.getInterruptStatus()).toBe(false);
      via.tick(5);
      expect(via.getInterruptStatus()).toBe(true);
      expect(via.getInterruptFlags() & VIAInterruptSource.TIMER2).toBeTruthy();
    });

    test('should access Timer 1 via registers', () => {
      // Write Timer 1 latch low byte
      via.write(0x06, 0x34);
      // Write Timer 1 latch high byte (starts timer)
      via.write(0x07, 0x12);
      
      expect(via.read(0x04)).toBe(0x34); // T1C_L
      expect(via.read(0x05)).toBe(0x12); // T1C_H
    });

    test('should access Timer 2 via registers', () => {
      // Write Timer 2 counter low byte
      via.write(0x08, 0x78);
      // Write Timer 2 counter high byte (starts timer)
      via.write(0x09, 0x56);
      
      expect(via.read(0x08)).toBe(0x78); // T2C_L
      expect(via.read(0x09)).toBe(0x56); // T2C_H
    });

    test('should clear Timer 1 interrupt flag on counter read', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.setTimer1(1);
      via.tick(2);
      
      expect(via.getInterruptStatus()).toBe(true);
      via.read(0x04); // Read T1C_L clears interrupt
      expect(via.getInterruptStatus()).toBe(false);
    });

    test('should clear Timer 2 interrupt flag on counter read', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER2);
      via.setTimer2(1);
      via.tick(2);
      
      expect(via.getInterruptStatus()).toBe(true);
      via.read(0x08); // Read T2C_L clears interrupt
      expect(via.getInterruptStatus()).toBe(false);
    });
  });

  describe('Interrupt system', () => {
    test('should enable and disable interrupts', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      expect(via.read(0x0E) & VIAInterruptSource.TIMER1).toBeTruthy(); // IER

      via.disableInterrupt(VIAInterruptSource.TIMER1);
      expect(via.read(0x0E) & VIAInterruptSource.TIMER1).toBeFalsy();
    });

    test('should set interrupt flags', () => {
      via.setTimer1(1);
      via.tick(2);
      expect(via.getInterruptFlags() & VIAInterruptSource.TIMER1).toBeTruthy();
    });

    test('should only generate interrupts when enabled', () => {
      // Timer 1 interrupt disabled
      via.setTimer1(1);
      via.tick(2);
      expect(via.getInterruptStatus()).toBe(false);

      // Enable Timer 1 interrupt
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      expect(via.getInterruptStatus()).toBe(true);
    });

    test('should handle multiple interrupt sources', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.enableInterrupt(VIAInterruptSource.TIMER2);
      
      via.setTimer1(1);
      via.setTimer2(1);
      via.tick(2);
      
      expect(via.getInterruptStatus()).toBe(true);
      expect(via.getInterruptFlags() & VIAInterruptSource.TIMER1).toBeTruthy();
      expect(via.getInterruptFlags() & VIAInterruptSource.TIMER2).toBeTruthy();
    });

    test('should access interrupt registers via memory interface', () => {
      // Test IER (Interrupt Enable Register)
      via.write(0x0E, 0x80 | VIAInterruptSource.TIMER1); // Set bit 7 to enable
      expect(via.read(0x0E) & VIAInterruptSource.TIMER1).toBeTruthy();

      via.write(0x0E, VIAInterruptSource.TIMER1); // Clear bit 7 to disable
      expect(via.read(0x0E) & VIAInterruptSource.TIMER1).toBeFalsy();
    });

    test('should clear interrupt flags via IFR write', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.setTimer1(1);
      via.tick(2);
      
      expect(via.getInterruptStatus()).toBe(true);
      
      // Clear Timer 1 interrupt flag
      via.write(0x0D, VIAInterruptSource.TIMER1);
      expect(via.getInterruptStatus()).toBe(false);
    });

    test('should show master interrupt status in IFR bit 7', () => {
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.setTimer1(1);
      via.tick(2);
      
      const ifr = via.read(0x0D);
      expect(ifr & 0x80).toBeTruthy(); // Master interrupt bit should be set
    });
  });

  describe('Shift register', () => {
    test('should set and get shift register value', () => {
      via.setShiftRegister(0xAA);
      expect(via.getShiftRegister()).toBe(0xAA);
    });

    test('should access shift register via memory interface', () => {
      via.write(0x0A, 0x55); // Write to SR
      expect(via.read(0x0A)).toBe(0x55); // Read from SR
    });
  });

  describe('Control registers', () => {
    test('should access Auxiliary Control Register', () => {
      via.write(0x0B, 0x40); // Set ACR
      expect(via.read(0x0B)).toBe(0x40);
    });

    test('should access Peripheral Control Register', () => {
      via.write(0x0C, 0x0E); // Set PCR
      expect(via.read(0x0C)).toBe(0x0E);
    });
  });

  describe('Reset functionality', () => {
    test('should reset all registers to initial state', () => {
      // Set some values
      via.writePortA(0xFF);
      via.writePortB(0xFF);
      via.setPortADirection(0xFF);
      via.setPortBDirection(0xFF);
      via.setTimer1(0x1234);
      via.setTimer2(0x5678);
      via.enableInterrupt(VIAInterruptSource.TIMER1);
      via.setShiftRegister(0xAA);

      // Reset
      via.reset();

      // Check all values are reset
      expect(via.readPortA()).toBe(0x00);
      expect(via.readPortB()).toBe(0x00);
      expect(via.read(0x03)).toBe(0x00); // DDRA
      expect(via.read(0x02)).toBe(0x00); // DDRB
      expect(via.getTimer1()).toBe(0);
      expect(via.getTimer2()).toBe(0);
      expect(via.getShiftRegister()).toBe(0x00);
      expect(via.getInterruptFlags()).toBe(0x00);
      expect(via.read(0x0E) & 0x7F).toBe(0x00); // IER (excluding bit 7)
      expect(via.getInterruptStatus()).toBe(false);
    });
  });

  describe('Register address mapping', () => {
    test('should handle all register addresses correctly', () => {
      const testValue = 0x42;
      
      // Test writable registers
      const writableRegisters = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F];
      
      writableRegisters.forEach(addr => {
        via.write(addr, testValue);
        // Just verify no exceptions are thrown
      });
    });

    test('should return 0xFF for invalid register addresses', () => {
      expect(via.read(0x10)).toBe(0xFF);
      expect(via.read(0xFF)).toBe(0xFF);
    });

    test('should handle ORA with and without handshake', () => {
      via.write(0x03, 0xFF); // Set DDRA to all outputs
      
      // Write via regular ORA (0x01)
      via.write(0x01, 0xAA);
      expect(via.read(0x01)).toBe(0xAA);
      
      // Write via ORA no handshake (0x0F)
      via.write(0x0F, 0x55);
      expect(via.read(0x0F)).toBe(0x55);
      expect(via.read(0x01)).toBe(0x55); // Should be same value
    });
  });
});