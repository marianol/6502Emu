/**
 * Motorola 68B50 ACIA (Asynchronous Communications Interface Adapter) Implementation
 * 
 * The 68B50 ACIA provides serial communication capabilities with configurable
 * baud rates, data formats, and interrupt generation.
 * 
 * Register Map:
 * Offset 0: Control/Status Register
 * Offset 1: Transmit/Receive Data Register
 */

import { Peripheral } from './base';
import { SerialPort } from './serial-port';

/**
 * Control Register bit definitions
 */
export enum ACIAControlBits {
  // Counter Divide Select (bits 0-1)
  DIVIDE_1 = 0x00,
  DIVIDE_16 = 0x01,
  DIVIDE_64 = 0x02,
  MASTER_RESET = 0x03,

  // Word Select (bits 2-4)
  WORD_7E2 = 0x00,  // 7 bits, even parity, 2 stop bits
  WORD_7O2 = 0x04,  // 7 bits, odd parity, 2 stop bits
  WORD_7E1 = 0x08,  // 7 bits, even parity, 1 stop bit
  WORD_7O1 = 0x0C,  // 7 bits, odd parity, 1 stop bit
  WORD_8N2 = 0x10,  // 8 bits, no parity, 2 stop bits
  WORD_8N1 = 0x14,  // 8 bits, no parity, 1 stop bit
  WORD_8E1 = 0x18,  // 8 bits, even parity, 1 stop bit
  WORD_8O1 = 0x1C,  // 8 bits, odd parity, 1 stop bit

  // Transmitter Control (bits 5-6)
  TX_RTS_LOW_INT_DISABLE = 0x00,
  TX_RTS_LOW_INT_ENABLE = 0x20,
  TX_RTS_HIGH_INT_DISABLE = 0x40,
  TX_RTS_LOW_BREAK_INT_DISABLE = 0x60,

  // Receiver Interrupt Enable (bit 7)
  RX_INT_DISABLE = 0x00,
  RX_INT_ENABLE = 0x80
}

/**
 * Status Register bit definitions
 */
export enum ACIAStatusBits {
  RDRF = 0x01,    // Receive Data Register Full
  TDRE = 0x02,    // Transmit Data Register Empty
  DCD = 0x04,     // Data Carrier Detect
  CTS = 0x08,     // Clear To Send
  FE = 0x10,      // Framing Error
  OVRN = 0x20,    // Receiver Overrun
  PE = 0x40,      // Parity Error
  IRQ = 0x80      // Interrupt Request
}

/**
 * Motorola 68B50 ACIA peripheral implementation
 */
export class ACIA68B50 implements Peripheral {
  private controlRegister: number = 0x00;
  private statusRegister: number = ACIAStatusBits.TDRE; // Start with transmit ready
  private receiveDataRegister: number = 0x00;
  private transmitDataRegister: number = 0x00;
  
  private receiveBuffer: number[] = [];
  private transmitBuffer: number[] = [];
  
  private serialPort: SerialPort | null = null;
  private baudRate: number = 9600;
  
  // Timing simulation
  private cyclesPerBit: number = 0;
  private transmitCyclesRemaining: number = 0;
  private receiveCyclesRemaining: number = 0;
  
  // Interrupt state
  private interruptPending: boolean = false;

  constructor() {
    this.updateBaudRateTiming();
  }

  /**
   * Read from ACIA register
   * @param offset Register offset (0 = Status, 1 = Data)
   * @returns Register value
   */
  read(offset: number): number {
    switch (offset) {
      case 0: // Status Register
        return this.getStatusRegister();
      
      case 1: // Receive Data Register
        return this.receiveData();
      
      default:
        return 0xFF;
    }
  }

  /**
   * Write to ACIA register
   * @param offset Register offset (0 = Control, 1 = Data)
   * @param value Value to write
   */
  write(offset: number, value: number): void {
    switch (offset) {
      case 0: // Control Register
        this.setControlRegister(value);
        break;
      
      case 1: // Transmit Data Register
        this.transmitData(value);
        break;
    }
  }

  /**
   * Reset the ACIA to initial state
   */
  reset(): void {
    this.controlRegister = 0x00;
    this.statusRegister = ACIAStatusBits.TDRE;
    this.receiveDataRegister = 0x00;
    this.transmitDataRegister = 0x00;
    this.receiveBuffer = [];
    this.transmitBuffer = [];
    this.transmitCyclesRemaining = 0;
    this.receiveCyclesRemaining = 0;
    this.interruptPending = false;
    this.updateBaudRateTiming();
  }

  /**
   * Update ACIA state each CPU cycle
   * @param cycles Number of CPU cycles elapsed
   */
  tick(cycles: number): void {
    // Handle transmit timing
    if (this.transmitCyclesRemaining > 0) {
      this.transmitCyclesRemaining -= cycles;
      if (this.transmitCyclesRemaining <= 0) {
        this.completeTransmission();
      }
    }

    // Handle receive timing
    if (this.receiveCyclesRemaining > 0) {
      this.receiveCyclesRemaining -= cycles;
      if (this.receiveCyclesRemaining <= 0) {
        this.completeReception();
      }
    }

    // Check for incoming data from serial port
    if (this.serialPort && this.serialPort.hasData()) {
      const data = this.serialPort.read();
      if (data !== null && this.receiveCyclesRemaining <= 0) {
        this.startReception(data);
      }
    }

    // Update interrupt status
    this.updateInterruptStatus();
  }

  /**
   * Check if interrupt is pending
   * @returns true if interrupt is pending
   */
  getInterruptStatus(): boolean {
    return this.interruptPending;
  }

  /**
   * Set control register and handle configuration changes
   * @param value Control register value
   */
  setControlRegister(value: number): void {
    const previousControl = this.controlRegister;
    this.controlRegister = value;

    // Handle master reset
    if ((value & 0x03) === ACIAControlBits.MASTER_RESET) {
      this.reset();
      return;
    }

    // Update baud rate timing if divide ratio changed
    if ((value & 0x03) !== (previousControl & 0x03)) {
      this.updateBaudRateTiming();
    }

    // Update interrupt enables
    this.updateInterruptStatus();
  }

  /**
   * Get current status register value
   * @returns Status register value
   */
  getStatusRegister(): number {
    let status = this.statusRegister;
    
    // Update RDRF (Receive Data Register Full)
    if (this.receiveBuffer.length > 0) {
      status |= ACIAStatusBits.RDRF;
    } else {
      status &= ~ACIAStatusBits.RDRF;
    }

    // Update TDRE (Transmit Data Register Empty)
    if (this.transmitCyclesRemaining <= 0) {
      status |= ACIAStatusBits.TDRE;
    } else {
      status &= ~ACIAStatusBits.TDRE;
    }

    // Update CTS and DCD based on serial port status
    if (this.serialPort && this.serialPort.isReady()) {
      status |= ACIAStatusBits.CTS;
      status |= ACIAStatusBits.DCD;
    } else {
      status &= ~ACIAStatusBits.CTS;
      status &= ~ACIAStatusBits.DCD;
    }

    this.statusRegister = status;
    return status;
  }

  /**
   * Transmit data through the ACIA
   * @param data Byte to transmit
   */
  transmitData(data: number): void {
    if (this.transmitCyclesRemaining > 0) {
      // Transmitter busy, ignore write
      return;
    }

    this.transmitDataRegister = data & 0xFF;
    this.transmitCyclesRemaining = this.cyclesPerBit * 10; // Start bit + 8 data bits + stop bit
    this.statusRegister &= ~ACIAStatusBits.TDRE;
  }

  /**
   * Receive data from the ACIA
   * @returns Received data byte
   */
  receiveData(): number {
    if (this.receiveBuffer.length > 0) {
      const data = this.receiveBuffer.shift()!;
      this.receiveDataRegister = data;
      
      // Clear RDRF if buffer is now empty
      if (this.receiveBuffer.length === 0) {
        this.statusRegister &= ~ACIAStatusBits.RDRF;
      }
      
      this.updateInterruptStatus();
      return data;
    }
    
    return this.receiveDataRegister;
  }

  /**
   * Set the baud rate for serial communication
   * @param rate Baud rate in bits per second
   */
  setBaudRate(rate: number): void {
    this.baudRate = rate;
    this.updateBaudRateTiming();
    
    if (this.serialPort) {
      this.serialPort.setBaudRate(rate);
    }
  }

  /**
   * Connect a serial port for external communication
   * @param port Serial port interface
   */
  connectSerial(port: SerialPort): void {
    if (this.serialPort) {
      this.serialPort.close();
    }
    
    this.serialPort = port;
    port.setBaudRate(this.baudRate);
  }

  /**
   * Disconnect the serial port
   */
  disconnectSerial(): void {
    if (this.serialPort) {
      this.serialPort.close();
      this.serialPort = null;
    }
  }

  /**
   * Get current baud rate
   * @returns Current baud rate
   */
  getBaudRate(): number {
    return this.baudRate;
  }

  /**
   * Update baud rate timing based on control register
   */
  private updateBaudRateTiming(): void {
    const divideRatio = this.controlRegister & 0x03;
    let effectiveBaudRate = this.baudRate;

    switch (divideRatio) {
      case ACIAControlBits.DIVIDE_1:
        effectiveBaudRate = this.baudRate;
        break;
      case ACIAControlBits.DIVIDE_16:
        effectiveBaudRate = this.baudRate / 16;
        break;
      case ACIAControlBits.DIVIDE_64:
        effectiveBaudRate = this.baudRate / 64;
        break;
    }

    // Assume 1MHz CPU clock for timing calculations
    const cpuFrequency = 1000000;
    this.cyclesPerBit = Math.floor(cpuFrequency / effectiveBaudRate);
  }

  /**
   * Complete transmission of current byte
   */
  private completeTransmission(): void {
    if (this.serialPort) {
      this.serialPort.write(this.transmitDataRegister);
    }
    
    this.statusRegister |= ACIAStatusBits.TDRE;
    this.transmitCyclesRemaining = 0;
    this.updateInterruptStatus();
  }

  /**
   * Start reception of a byte
   * @param data Byte being received
   */
  private startReception(data: number): void {
    this.receiveCyclesRemaining = this.cyclesPerBit * 10; // Simulate receive timing
    this.receiveBuffer.push(data & 0xFF);
    
    // Check for buffer overflow
    if (this.receiveBuffer.length > 1) {
      this.statusRegister |= ACIAStatusBits.OVRN;
    }
  }

  /**
   * Complete reception of current byte
   */
  private completeReception(): void {
    this.statusRegister |= ACIAStatusBits.RDRF;
    this.receiveCyclesRemaining = 0;
    this.updateInterruptStatus();
  }

  /**
   * Update interrupt status based on current state and control settings
   */
  private updateInterruptStatus(): void {
    let interrupt = false;

    // Check receive interrupt
    if ((this.controlRegister & ACIAControlBits.RX_INT_ENABLE) && 
        (this.statusRegister & ACIAStatusBits.RDRF)) {
      interrupt = true;
    }

    // Check transmit interrupt
    const txControl = this.controlRegister & 0x60;
    if (txControl === ACIAControlBits.TX_RTS_LOW_INT_ENABLE && 
        (this.statusRegister & ACIAStatusBits.TDRE)) {
      interrupt = true;
    }

    this.interruptPending = interrupt;
    
    if (interrupt) {
      this.statusRegister |= ACIAStatusBits.IRQ;
    } else {
      this.statusRegister &= ~ACIAStatusBits.IRQ;
    }
  }
}