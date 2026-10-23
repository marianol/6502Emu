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
 * PTY-based serial port using socat to create a clean raw pseudo-terminal pair.
 *
 * socat creates two linked PTY devices with raw,echo=0 — no line discipline,
 * no echo, no CR/LF translation. Node owns one end as a plain file descriptor;
 * the other end is a /dev/ttysNNN path you connect screen/minicom to.
 *
 * Works on macOS and Linux. Requires socat to be installed:
 *   macOS:  brew install socat
 *   Linux:  apt install socat / yum install socat
 */
export class PtySerialPort implements SerialPort {
  private masterFd: number = -1;
  private slavePath: string = '';
  private receiveBuffer: number[] = [];
  private baudRate: number = 9600;
  private ready: boolean = false;
  private socatProcess: import('child_process').ChildProcess | null = null;
  private readBuffer: Buffer = Buffer.alloc(256);

  constructor(baudRate: number = 9600) {
    this.baudRate = baudRate;
    this.open();
  }

  private open(): void {
    try {
      const { spawnSync } = require('child_process');
      const fs = require('fs');

      // Ask socat to create a PTY pair and print both paths to stdout.
      // pty,raw,echo=0  — raw bytes, no echo, no line processing on both ends.
      // We use a short timeout so the paths are printed before we continue.
      const result = spawnSync('socat', [
        '-d', '-d',
        'pty,raw,echo=0,link=/tmp/6502_pty_master',
        'pty,raw,echo=0,link=/tmp/6502_pty_slave'
      ], {
        detached: true,
        stdio: ['ignore', 'ignore', 'pipe'],
        timeout: 2000
      });

      // socat prints the pty paths to stderr with -d -d
      const stderr = result.stderr?.toString() || '';
      const paths = [...stderr.matchAll(/\/dev\/ttys\w+/g)].map(m => m[0]);

      if (paths.length < 2) {
        throw new Error(`socat did not report two PTY paths. stderr: ${stderr}`);
      }

      // socat keeps running in the background bridging the two ptys.
      // We re-launch it as a background daemon process.
      const { spawn } = require('child_process');
      this.socatProcess = spawn('socat', [
        '-d', '-d',
        'pty,raw,echo=0,link=/tmp/6502_pty_master',
        'pty,raw,echo=0,link=/tmp/6502_pty_slave'
      ], {
        detached: true,
        stdio: 'ignore'
      });
      this.socatProcess!.unref();

      // Give socat a moment to create the symlinks
      const sleep = (ms: number) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {}
      };
      sleep(200);

      // Our end: open the master symlink as a raw fd
      this.masterFd = fs.openSync('/tmp/6502_pty_master', 'r+');
      this.slavePath = '/tmp/6502_pty_slave';

      // The slave path is what the user connects screen to
      // Resolve the symlink to show the real device name too
      try {
        const real = require('fs').realpathSync('/tmp/6502_pty_slave');
        this.slavePath = real;
      } catch { /* keep symlink path */ }

      this.ready = true;

      // Start async read loop
      this.scheduleRead();

      console.log(`\n┌─────────────────────────────────────────────────┐`);
      console.log(`│  ACIA PTY ready (via socat)                     │`);
      console.log(`│  Connect with:                                  │`);
      console.log(`│  screen ${(this.slavePath + ' ' + this.baudRate).padEnd(40)} │`);
      console.log(`└─────────────────────────────────────────────────┘\n`);

    } catch (err) {
      console.warn(`PtySerialPort: socat PTY failed (${err})\nFalling back to console output.`);
      console.warn(`Install socat for full PTY support: brew install socat`);
      this.ready = false;
    }
  }

  private scheduleRead(): void {
    if (this.masterFd < 0 || !this.ready) return;
    const fs = require('fs');
    // Non-blocking read from master fd
    fs.read(this.masterFd, this.readBuffer, 0, this.readBuffer.length, null,
      (err: any, bytesRead: number) => {
        if (!err && bytesRead > 0) {
          for (let i = 0; i < bytesRead; i++) {
            this.receiveBuffer.push(this.readBuffer[i]);
          }
        }
        if (this.ready) {
          // Schedule next read immediately
          setImmediate(() => this.scheduleRead());
        }
      }
    );
  }

  write(data: number): void {
    if (this.masterFd >= 0 && this.ready) {
      const fs = require('fs');
      try {
        fs.writeSync(this.masterFd, Buffer.from([data & 0xFF]));
      } catch { /* ignore write errors on closed fd */ }
    } else {
      process.stdout.write(String.fromCharCode(data & 0xFF));
    }
  }

  read(): number | null {
    return this.receiveBuffer.length > 0 ? this.receiveBuffer.shift()! : null;
  }

  hasData(): boolean {
    return this.receiveBuffer.length > 0;
  }

  isReady(): boolean {
    return this.ready;
  }

  setBaudRate(rate: number): void {
    this.baudRate = rate;
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  getSlavePath(): string {
    return this.slavePath;
  }

  close(): void {
    this.ready = false;
    if (this.masterFd >= 0) {
      try { require('fs').closeSync(this.masterFd); } catch { /* ignore */ }
      this.masterFd = -1;
    }
    if (this.socatProcess) {
      try { this.socatProcess.kill(); } catch { /* ignore */ }
      this.socatProcess = null;
    }
    // Clean up symlinks
    try { require('fs').unlinkSync('/tmp/6502_pty_master'); } catch { /* ignore */ }
    try { require('fs').unlinkSync('/tmp/6502_pty_slave'); } catch { /* ignore */ }
    this.receiveBuffer = [];
  }
}
