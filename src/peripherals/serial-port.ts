/**
 * Serial port implementations for ACIA connectivity
 */

/**
 * Serial port interface for host system communication
 */
export interface SerialPort {
  /**
   * Write data to the serial port
   * @param data Byte to transmit
   */
  write(data: number): void;

  /**
   * Read data from the serial port
   * @returns Received byte or null if no data available
   */
  read(): number | null;

  /**
   * Check if data is available to read
   * @returns true if data is available
   */
  hasData(): boolean;

  /**
   * Check if the port is ready to transmit
   * @returns true if ready to transmit
   */
  isReady(): boolean;

  /**
   * Set the baud rate
   * @param rate Baud rate in bits per second
   */
  setBaudRate(rate: number): void;

  /**
   * Close the serial port
   */
  close(): void;
}

/**
 * Console-based serial port implementation for debugging and testing
 */
export class ConsoleSerialPort implements SerialPort {
  private receiveBuffer: number[] = [];
  private baudRate: number = 9600;
  private isOpen: boolean = true;

  constructor() {
    // In a real implementation, this might set up stdin/stdout handling
  }

  /**
   * Write data to console output
   * @param data Byte to transmit
   */
  write(data: number): void {
    if (!this.isOpen) return;
    
    // Convert byte to character and output to console
    const char = String.fromCharCode(data & 0xFF);
    process.stdout.write(char);
  }

  /**
   * Read data from the receive buffer
   * @returns Received byte or null if no data available
   */
  read(): number | null {
    if (this.receiveBuffer.length > 0) {
      return this.receiveBuffer.shift()!;
    }
    return null;
  }

  /**
   * Check if data is available to read
   * @returns true if data is available
   */
  hasData(): boolean {
    return this.receiveBuffer.length > 0;
  }

  /**
   * Check if the port is ready to transmit
   * @returns true if ready to transmit
   */
  isReady(): boolean {
    return this.isOpen;
  }

  /**
   * Set the baud rate
   * @param rate Baud rate in bits per second
   */
  setBaudRate(rate: number): void {
    this.baudRate = rate;
  }

  /**
   * Get current baud rate
   * @returns Current baud rate
   */
  getBaudRate(): number {
    return this.baudRate;
  }

  /**
   * Add data to the receive buffer (for testing)
   * @param data Byte to add to receive buffer
   */
  addReceiveData(data: number): void {
    this.receiveBuffer.push(data & 0xFF);
  }

  /**
   * Add string to the receive buffer (for testing)
   * @param text String to add to receive buffer
   */
  addReceiveString(text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.receiveBuffer.push(text.charCodeAt(i));
    }
  }

  /**
   * Close the serial port
   */
  close(): void {
    this.isOpen = false;
    this.receiveBuffer = [];
  }

  /**
   * Check if the port is open
   * @returns true if the port is open
   */
  isPortOpen(): boolean {
    return this.isOpen;
  }
}

/**
 * Memory-based serial port implementation for testing
 */
export class MemorySerialPort implements SerialPort {
  private transmitLog: number[] = [];
  private receiveBuffer: number[] = [];
  private baudRate: number = 9600;
  private ready: boolean = true;

  /**
   * Write data to the transmit log
   * @param data Byte to transmit
   */
  write(data: number): void {
    this.transmitLog.push(data & 0xFF);
  }

  /**
   * Read data from the receive buffer
   * @returns Received byte or null if no data available
   */
  read(): number | null {
    if (this.receiveBuffer.length > 0) {
      return this.receiveBuffer.shift()!;
    }
    return null;
  }

  /**
   * Check if data is available to read
   * @returns true if data is available
   */
  hasData(): boolean {
    return this.receiveBuffer.length > 0;
  }

  /**
   * Check if the port is ready to transmit
   * @returns true if ready to transmit
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Set the baud rate
   * @param rate Baud rate in bits per second
   */
  setBaudRate(rate: number): void {
    this.baudRate = rate;
  }

  /**
   * Get current baud rate
   * @returns Current baud rate
   */
  getBaudRate(): number {
    return this.baudRate;
  }

  /**
   * Get all transmitted data
   * @returns Array of transmitted bytes
   */
  getTransmittedData(): number[] {
    return [...this.transmitLog];
  }

  /**
   * Get transmitted data as string
   * @returns Transmitted data as string
   */
  getTransmittedString(): string {
    return String.fromCharCode(...this.transmitLog);
  }

  /**
   * Clear the transmit log
   */
  clearTransmitLog(): void {
    this.transmitLog = [];
  }

  /**
   * Add data to the receive buffer
   * @param data Byte to add to receive buffer
   */
  addReceiveData(data: number): void {
    this.receiveBuffer.push(data & 0xFF);
  }

  /**
   * Add string to the receive buffer
   * @param text String to add to receive buffer
   */
  addReceiveString(text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.receiveBuffer.push(text.charCodeAt(i));
    }
  }

  /**
   * Set the ready state
   * @param ready Whether the port is ready
   */
  setReady(ready: boolean): void {
    this.ready = ready;
  }

  /**
   * Close the serial port
   */
  close(): void {
    this.transmitLog = [];
    this.receiveBuffer = [];
    this.ready = false;
  }
}

/**
 * Null serial port implementation (no-op)
 */
export class NullSerialPort implements SerialPort {
  private baudRate: number = 9600;

  write(data: number): void {
    // No-op
  }

  read(): number | null {
    return null;
  }

  hasData(): boolean {
    return false;
  }

  isReady(): boolean {
    return true;
  }

  setBaudRate(rate: number): void {
    this.baudRate = rate;
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  close(): void {
    // No-op
  }
}