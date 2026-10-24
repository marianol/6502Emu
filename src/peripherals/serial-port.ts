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

  // Process-wide tracking so a single exit handler can kill every socat
  // child on any termination path, preventing orphaned PTY bridges.
  private static activeSocats: Set<import('child_process').ChildProcess> = new Set();
  private static exitHandlerRegistered = false;

  constructor(baudRate: number = 9600) {
    this.baudRate = baudRate;
    this.open();
  }

  private open(): void {
    try {
      const { spawnSync, spawn } = require('child_process');
      const fs = require('fs');

      const masterLink = '/tmp/6502_pty_master';
      const slaveLink  = '/tmp/6502_pty_slave';

      // Remove stale symlinks from a previous run
      try { fs.unlinkSync(masterLink); } catch { /* none */ }
      try { fs.unlinkSync(slaveLink); } catch { /* none */ }

      // Spawn socat ONCE as a long-lived background bridge. It creates two
      // linked raw PTYs and symlinks them to known paths. We do not capture
      // its stderr paths — we use the stable symlinks instead.
      // NOT detached: socat stays a child of this process so it is cleaned up
      // together with us. A process-level backstop (below) also kills it on
      // any exit path, so it never orphans and leaks PTYs.
      this.socatProcess = spawn('socat', [
        'pty,raw,echo=0,link=' + masterLink,
        'pty,raw,echo=0,link=' + slaveLink
      ], {
        stdio: 'ignore'
      });

      // Backstop: ensure socat is killed when the Node process exits by any
      // path (normal exit, SIGTERM, uncaught error). Registered once per PTY.
      if (!PtySerialPort.exitHandlerRegistered) {
        PtySerialPort.exitHandlerRegistered = true;
        const killAll = () => {
          for (const proc of PtySerialPort.activeSocats) {
            try { proc.kill('SIGKILL'); } catch { /* ignore */ }
          }
          PtySerialPort.activeSocats.clear();
        };
        process.on('exit', killAll);
      }
      if (this.socatProcess) {
        PtySerialPort.activeSocats.add(this.socatProcess);
      }

      // Wait (briefly, without busy-spinning) for socat to create the symlinks.
      const deadline = Date.now() + 2000;
      while (!fs.existsSync(masterLink) || !fs.existsSync(slaveLink)) {
        if (Date.now() > deadline) {
          throw new Error('socat did not create PTY symlinks within 2s');
        }
        // Sleep 10ms using a blocking but cheap syscall
        spawnSync('sleep', ['0.01']);
      }

      // Open the master end NON-BLOCKING so reads return immediately instead
      // of blocking the event loop (which previously prevented clean exit).
      this.masterFd = fs.openSync(masterLink, fs.constants.O_RDWR | fs.constants.O_NONBLOCK);

      // Resolve the slave symlink to the real device name for the user
      this.slavePath = slaveLink;
      try {
        this.slavePath = fs.realpathSync(slaveLink);
      } catch { /* keep symlink path */ }

      this.ready = true;

      // Start polling the master fd for incoming data
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

  private readTimer: NodeJS.Timeout | null = null;

  private scheduleRead(): void {
    if (this.masterFd < 0 || !this.ready) return;
    const fs = require('fs');
    // Poll the non-blocking fd on a timer. EAGAIN (no data) is expected and
    // harmless. Using a timer instead of a chained async read means there is
    // never a pending syscall holding the event loop open at exit.
    this.readTimer = setTimeout(() => {
      if (!this.ready || this.masterFd < 0) return;
      try {
        const bytesRead = fs.readSync(this.masterFd, this.readBuffer, 0, this.readBuffer.length, null);
        for (let i = 0; i < bytesRead; i++) {
          this.receiveBuffer.push(this.readBuffer[i]);
        }
      } catch (e: any) {
        // EAGAIN / EWOULDBLOCK = no data available right now; ignore
        if (e.code !== 'EAGAIN' && e.code !== 'EWOULDBLOCK') {
          // Any other error: stop polling
          this.ready = false;
          return;
        }
      }
      this.scheduleRead();
    }, 2);
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
    // Stop the polling timer first so no read is in flight
    if (this.readTimer) {
      clearTimeout(this.readTimer);
      this.readTimer = null;
    }
    if (this.masterFd >= 0) {
      try { require('fs').closeSync(this.masterFd); } catch { /* ignore */ }
      this.masterFd = -1;
    }
    // Kill the socat bridge process. SIGKILL to be certain it exits.
    if (this.socatProcess) {
      PtySerialPort.activeSocats.delete(this.socatProcess);
      try { this.socatProcess.kill('SIGKILL'); } catch { /* ignore */ }
      this.socatProcess = null;
    }
    // Clean up symlinks
    try { require('fs').unlinkSync('/tmp/6502_pty_master'); } catch { /* ignore */ }
    try { require('fs').unlinkSync('/tmp/6502_pty_slave'); } catch { /* ignore */ }
    this.receiveBuffer = [];
  }
}
