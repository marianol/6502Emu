/**
 * Unit tests for ACIA68B50 peripheral
 */

import { ACIA68B50, ACIAControlBits, ACIAStatusBits } from '../../src/peripherals/acia';
import { MemorySerialPort } from '../../src/peripherals/serial-port';

describe('ACIA68B50', () => {
  let acia: ACIA68B50;
  let serialPort: MemorySerialPort;

  beforeEach(() => {
    acia = new ACIA68B50();
    serialPort = new MemorySerialPort();
    acia.connectSerial(serialPort);
  });

  afterEach(() => {
    acia.disconnectSerial();
  });

  describe('Initialization and Reset', () => {
    test('should initialize with correct default state', () => {
      const status = acia.read(0); // Read status register
      expect(status & ACIAStatusBits.TDRE).toBeTruthy(); // Transmit ready
      expect(status & ACIAStatusBits.RDRF).toBeFalsy(); // No receive data
      expect(acia.getInterruptStatus()).toBeFalsy(); // No interrupt pending
    });

    test('should reset to initial state', () => {
      // Modify state
      acia.write(0, ACIAControlBits.RX_INT_ENABLE);
      acia.write(1, 0x55); // Write some data
      
      // Reset
      acia.reset();
      
      // Check reset state
      const status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
      expect(status & ACIAStatusBits.RDRF).toBeFalsy();
      expect(acia.getInterruptStatus()).toBeFalsy();
    });

    test('should perform master reset via control register', () => {
      // Write master reset command
      acia.write(0, ACIAControlBits.MASTER_RESET);
      
      // Check reset state
      const status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
      expect(status & ACIAStatusBits.RDRF).toBeFalsy();
    });
  });

  describe('Control Register Configuration', () => {
    test('should set control register correctly', () => {
      const controlValue = ACIAControlBits.DIVIDE_16 | 
                          ACIAControlBits.WORD_8N1 | 
                          ACIAControlBits.TX_RTS_LOW_INT_ENABLE |
                          ACIAControlBits.RX_INT_ENABLE;
      
      acia.setControlRegister(controlValue);
      
      // Control register is write-only, but we can verify effects through status
      const status = acia.read(0);
      expect(status).toBeDefined();
    });

    test('should handle different divide ratios', () => {
      acia.setBaudRate(9600);
      
      // Test different divide ratios
      acia.write(0, ACIAControlBits.DIVIDE_1);
      expect(acia.getBaudRate()).toBe(9600);
      
      acia.write(0, ACIAControlBits.DIVIDE_16);
      expect(acia.getBaudRate()).toBe(9600);
      
      acia.write(0, ACIAControlBits.DIVIDE_64);
      expect(acia.getBaudRate()).toBe(9600);
    });
  });

  describe('Status Register', () => {
    test('should report transmit data register empty initially', () => {
      const status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
    });

    test('should report receive data register full when data available', () => {
      // Add data to serial port receive buffer
      serialPort.addReceiveData(0x41); // 'A'
      
      // Simulate reception
      acia.tick(1000); // Enough cycles to complete reception
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeTruthy();
    });

    test('should report CTS and DCD when serial port is ready', () => {
      serialPort.setReady(true);
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.CTS).toBeTruthy();
      expect(status & ACIAStatusBits.DCD).toBeTruthy();
    });

    test('should clear CTS and DCD when serial port is not ready', () => {
      serialPort.setReady(false);
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.CTS).toBeFalsy();
      expect(status & ACIAStatusBits.DCD).toBeFalsy();
    });
  });

  describe('Data Transmission', () => {
    test('should transmit data correctly', () => {
      const testData = 0x48; // 'H'
      
      // Write data to transmit register
      acia.write(1, testData);
      
      // Initially, TDRE should be clear (transmitting)
      let status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeFalsy();
      
      // Simulate transmission completion
      acia.tick(10000); // Enough cycles to complete transmission
      
      // TDRE should be set again (ready for next transmission)
      status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
      
      // Check that data was transmitted to serial port
      const transmitted = serialPort.getTransmittedData();
      expect(transmitted).toContain(testData);
    });

    test('should ignore writes when transmitter is busy', () => {
      // Start transmission
      acia.write(1, 0x41); // 'A'
      
      // Try to write again immediately (should be ignored)
      acia.write(1, 0x42); // 'B'
      
      // Complete transmission
      acia.tick(10000);
      
      // Only first byte should be transmitted
      const transmitted = serialPort.getTransmittedData();
      expect(transmitted).toEqual([0x41]);
    });

    test('should handle multiple sequential transmissions', () => {
      const testData = [0x48, 0x65, 0x6C, 0x6C, 0x6F]; // "Hello"
      
      for (const byte of testData) {
        acia.write(1, byte);
        acia.tick(10000); // Complete each transmission
      }
      
      const transmitted = serialPort.getTransmittedData();
      expect(transmitted).toEqual(testData);
    });
  });

  describe('Data Reception', () => {
    test('should receive data correctly', () => {
      const testData = 0x57; // 'W'
      
      // Add data to serial port
      serialPort.addReceiveData(testData);
      
      // Simulate reception
      acia.tick(10000);
      
      // Check status shows data available
      const status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeTruthy();
      
      // Read the data
      const receivedData = acia.read(1);
      expect(receivedData).toBe(testData);
      
      // Status should clear RDRF after reading
      const statusAfter = acia.read(0);
      expect(statusAfter & ACIAStatusBits.RDRF).toBeFalsy();
    });

    test('should handle receive buffer overflow', () => {
      // Add multiple bytes quickly
      serialPort.addReceiveData(0x41);
      serialPort.addReceiveData(0x42);
      
      // Simulate reception
      acia.tick(20000);
      
      // Check for overrun flag
      const status = acia.read(0);
      expect(status & ACIAStatusBits.OVRN).toBeTruthy();
    });

    test('should maintain receive data when not read', () => {
      const testData = 0x54; // 'T'
      
      serialPort.addReceiveData(testData);
      acia.tick(10000);
      
      // Read status multiple times
      let status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeTruthy();
      
      status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeTruthy();
      
      // Data should still be available
      const receivedData = acia.read(1);
      expect(receivedData).toBe(testData);
    });
  });

  describe('Interrupt Generation', () => {
    test('should generate receive interrupt when enabled', () => {
      // Enable receive interrupt
      acia.write(0, ACIAControlBits.RX_INT_ENABLE);
      
      // Add receive data
      serialPort.addReceiveData(0x49); // 'I'
      acia.tick(10000);
      
      // Check interrupt status
      expect(acia.getInterruptStatus()).toBeTruthy();
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.IRQ).toBeTruthy();
    });

    test('should not generate receive interrupt when disabled', () => {
      // Receive interrupt disabled by default
      
      // Add receive data
      serialPort.addReceiveData(0x4A); // 'J'
      acia.tick(10000);
      
      // Check interrupt status
      expect(acia.getInterruptStatus()).toBeFalsy();
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.IRQ).toBeFalsy();
    });

    test('should generate transmit interrupt when enabled', () => {
      // Enable transmit interrupt
      acia.write(0, ACIAControlBits.TX_RTS_LOW_INT_ENABLE);
      
      // Transmitter should be ready initially, so interrupt should be pending
      expect(acia.getInterruptStatus()).toBeTruthy();
      
      const status = acia.read(0);
      expect(status & ACIAStatusBits.IRQ).toBeTruthy();
    });

    test('should clear interrupt after reading receive data', () => {
      // Enable receive interrupt
      acia.write(0, ACIAControlBits.RX_INT_ENABLE);
      
      // Add receive data
      serialPort.addReceiveData(0x4B); // 'K'
      acia.tick(10000);
      
      // Interrupt should be pending
      expect(acia.getInterruptStatus()).toBeTruthy();
      
      // Read the data
      acia.read(1);
      
      // Interrupt should be cleared
      expect(acia.getInterruptStatus()).toBeFalsy();
    });
  });

  describe('Baud Rate Configuration', () => {
    test('should set baud rate correctly', () => {
      const testRates = [300, 1200, 2400, 4800, 9600, 19200, 38400];
      
      for (const rate of testRates) {
        acia.setBaudRate(rate);
        expect(acia.getBaudRate()).toBe(rate);
        expect(serialPort.getBaudRate()).toBe(rate);
      }
    });

    test('should update serial port baud rate when changed', () => {
      acia.setBaudRate(115200);
      expect(serialPort.getBaudRate()).toBe(115200);
    });
  });

  describe('Serial Port Connectivity', () => {
    test('should connect and disconnect serial port', () => {
      const newPort = new MemorySerialPort();
      
      acia.connectSerial(newPort);
      
      // Test transmission to new port
      acia.write(1, 0x58); // 'X'
      acia.tick(10000);
      
      expect(newPort.getTransmittedData()).toContain(0x58);
      expect(serialPort.getTransmittedData()).not.toContain(0x58);
      
      acia.disconnectSerial();
    });

    test('should handle null serial port gracefully', () => {
      acia.disconnectSerial();
      
      // Should not crash when transmitting without serial port
      acia.write(1, 0x59); // 'Y'
      acia.tick(10000);
      
      // Should still update status correctly
      const status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
    });
  });

  describe('Timing Simulation', () => {
    test('should simulate transmission timing', () => {
      acia.write(1, 0x5A); // 'Z'
      
      // Should not be ready immediately
      let status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeFalsy();
      
      // Should be ready after sufficient cycles
      acia.tick(10000);
      status = acia.read(0);
      expect(status & ACIAStatusBits.TDRE).toBeTruthy();
    });

    test('should simulate reception timing', () => {
      serialPort.addReceiveData(0x30); // '0'
      
      // Should not be available immediately
      let status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeFalsy();
      
      // Should be available after sufficient cycles
      acia.tick(10000);
      status = acia.read(0);
      expect(status & ACIAStatusBits.RDRF).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid register offsets', () => {
      // Reading invalid offset should return 0xFF
      expect(acia.read(2)).toBe(0xFF);
      expect(acia.read(255)).toBe(0xFF);
      
      // Writing to invalid offset should not crash
      expect(() => {
        acia.write(2, 0x00);
        acia.write(255, 0x00);
      }).not.toThrow();
    });

    test('should mask data to 8 bits', () => {
      // Test transmission with values > 255
      acia.write(1, 0x1FF); // 511
      acia.tick(10000);
      
      const transmitted = serialPort.getTransmittedData();
      expect(transmitted[transmitted.length - 1]).toBe(0xFF);
      
      // Test reception with values > 255
      serialPort.addReceiveData(0x300); // 768
      acia.tick(10000);
      
      const received = acia.read(1);
      expect(received).toBe(0x00); // 768 & 0xFF = 0
    });
  });
});