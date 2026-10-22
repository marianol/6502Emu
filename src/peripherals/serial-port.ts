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

/**
 * PTY-based serial port — creates a pseudo-terminal pair so an external
 * terminal program (screen, minicom, picocom) can connect to the ACIA
 * while the emulator is running.
 *
 * On startup the slave PTY path is printed to the console, e.g.:
 *   ACIA PTY ready — connect with: screen /dev/ttys004
 *
 * Works on macOS, Linux, and Windows (via node-pty's ConPTY support).
 */
export class PtySerialPort implements SerialPort {
  private pty: import('node-pty').IPty | null = null;
  private receiveBuffer: number[] = [];
  private baudRate: number = 9600;
  private slavePath: string = '';
  private ready: boolean = false;

  constructor(baudRate: number = 9600) {
    this.baudRate = baudRate;
    this.open();
  }

  private open(): void {
    try {
      const nodePty = require('node-pty');
      const { execFileSync } = require('child_process');

      const ptyProcess = nodePty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'cat', [], {
        name: 'xterm-raw',
        cols: 80,
        rows: 24,
        env: process.env as { [key: string]: string }
      });

      this.pty = ptyProcess;

      // Get the slave PTY path
      const ptyAny = ptyProcess as any;
      if (ptyAny._pty) {
        this.slavePath = ptyAny._pty;
      } else if (typeof ptyAny.process === 'string') {
        this.slavePath = ptyAny.process;
      }

      // Put the slave side into raw mode so the macOS tty line discipline
      // does not echo characters back, translate CR/LF, or buffer lines.
      // Without this, terminal programs see every other character dropped
      // or duplicated due to the OS processing the data stream.
      if (this.slavePath && process.platform !== 'win32') {
        try {
          execFileSync('stty', [
            '-f', this.slavePath,  // macOS uses -f; Linux uses -F
            'raw',                 // disable all line processing
            '-echo',               // no echo
            '-echoe',              // no erase echo
            '-echok',              // no kill echo
            '-echonl',             // no newline echo
            '-onlcr',              // don't translate LF → CR+LF on output
            '-icrnl',              // don't translate CR → LF on input
            '-ixon',               // disable XON/XOFF flow control
            'cs8',                 // 8-bit characters
            '-cstopb',             // 1 stop bit
            '-parenb',             // no parity
          ]);
        } catch {
          // stty -f is macOS syntax; try Linux -F
          try {
            execFileSync('stty', ['-F', this.slavePath, 'raw', '-echo', '-onlcr', '-icrnl', 'cs8']);
          } catch {
            // stty unavailable — PTY will still work but may have line discipline issues
            console.warn('PtySerialPort: could not set raw mode on slave PTY');
          }
        }
      }

      // Incoming data from the terminal → ACIA receive buffer
      ptyProcess.onData((data: string) => {
        for (let i = 0; i < data.length; i++) {
          this.receiveBuffer.push(data.charCodeAt(i) & 0xFF);
        }
      });

      ptyProcess.onExit(() => {
        this.ready = false;
      });

      this.ready = true;
      console.log(`\n┌─────────────────────────────────────────────────┐`);
      console.log(`│  ACIA PTY ready                                 │`);
      console.log(`│  Connect with:                                  │`);
      console.log(`│  screen ${(this.slavePath + ' ' + this.baudRate).padEnd(40)} │`);
      console.log(`└─────────────────────────────────────────────────┘\n`);

    } catch (err) {
      console.warn(`PtySerialPort: failed to open PTY (${err}), falling back to console output`);
      this.ready = false;
    }
  }

  /** Send a byte from the ACIA transmitter out to the terminal */
  write(data: number): void {
    if (this.pty && this.ready) {
      this.pty.write(String.fromCharCode(data & 0xFF));
    } else {
      // Fallback: write to stdout if PTY is not available
      process.stdout.write(String.fromCharCode(data & 0xFF));
    }
  }

  /** Read the next byte received from the terminal */
  read(): number | null {
    return this.receiveBuffer.length > 0
      ? this.receiveBuffer.shift()!
      : null;
  }

  hasData(): boolean {
    return this.receiveBuffer.length > 0;
  }

  isReady(): boolean {
    return this.ready;
  }

  setBaudRate(rate: number): void {
    this.baudRate = rate;
    // Note: PTY baud rate is simulated in the ACIA timing — the host PTY
    // always runs at whatever speed the OS allows. The ACIA timing model
    // still throttles characters at the configured baud rate.
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  /** Path to the slave PTY device (e.g. /dev/ttys004) */
  getSlavePath(): string {
    return this.slavePath;
  }

  close(): void {
    if (this.pty) {
      this.pty.kill();
      this.pty = null;
    }
    this.ready = false;
    this.receiveBuffer = [];
  }
}
