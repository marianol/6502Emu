/**
 * Web dashboard server for the 6502 emulator.
 *
 * Spins up a tiny localhost HTTP server (Node's built-in http module, no
 * dependencies) that serves:
 *   GET /              — a self-contained HTML dashboard page
 *   GET /api/status    — a JSON snapshot of current emulator state
 *   GET /api/memory?start=0x0000&length=256 — a memory range dump
 *
 * The dashboard page polls /api/status a few times a second and renders CPU
 * registers, run stats, the memory map, ACIA state, and a visual VIA port view.
 *
 * It is read-only: it never mutates emulator state.
 */

import * as http from 'http';
import { Emulator } from '../emulator';
import { VIA65C22Implementation } from '../peripherals/via';
import { ACIA68B50 } from '../peripherals/acia';
import { DASHBOARD_HTML } from './dashboard-page';

export class DashboardServer {
  private server: http.Server | null = null;
  private emulator: Emulator;
  private port: number;
  // Track open sockets so stop() can force them closed and free the port
  // immediately (a polling browser keeps a connection alive otherwise).
  private sockets: Set<import('net').Socket> = new Set();

  constructor(emulator: Emulator, port: number = 6502) {
    this.emulator = emulator;
    this.port = port;
  }

  /**
   * Start the server. Resolves with the actual URL, or rejects on error.
   */
  start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      // Don't keep connections alive — we want them to close promptly so the
      // port is released as soon as stop() is called.
      this.server.keepAliveTimeout = 1;

      // Track sockets so we can destroy them on stop()
      this.server.on('connection', (socket) => {
        this.sockets.add(socket);
        socket.on('close', () => this.sockets.delete(socket));
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(err);
        }
      });

      // Bind to loopback only — this is a local debugging tool, not a public server.
      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${this.port}`);
      });
    });
  }

  /** Stop the server and release the port immediately. */
  stop(): void {
    // Destroy any open connections first so close() can complete at once.
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getPort(): number {
    return this.port;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(DASHBOARD_HTML);
        return;
      }

      if (url.pathname === '/api/status') {
        const snapshot = this.buildSnapshot();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(snapshot));
        return;
      }

      if (url.pathname === '/api/memory') {
        const start = parseInt(url.searchParams.get('start') || '0', 16) || 0;
        let length = parseInt(url.searchParams.get('length') || '256', 10) || 256;
        length = Math.max(1, Math.min(length, 4096)); // clamp
        const bytes = this.peekRange(start, length);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ start, length, bytes }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  /**
   * Read a range of memory for inspection, side-effect-free and without
   * "unmapped memory" warnings. Peripheral (I/O) addresses route to the
   * peripheral hub's peek(); RAM/ROM route to the memory manager's peek().
   */
  private peekRange(start: number, length: number): number[] {
    const bus = this.emulator.getSystemBus();
    const mem = bus.getMemory();
    const hub = bus.getPeripheralHub();
    const out: number[] = [];
    for (let i = 0; i < length; i++) {
      const addr = (start + i) & 0xFFFF;
      if (hub.isPeripheralAddress(addr)) {
        out.push(hub.peek(addr) & 0xFF);
      } else {
        out.push(mem.peek(addr) & 0xFF);
      }
    }
    return out;
  }

  /**
   * Build a read-only snapshot of the current emulator state.
   */
  private buildSnapshot(): any {
    const bus = this.emulator.getSystemBus();
    const cpu = bus.getCPU();
    const regs = cpu.getRegisters();
    const config = this.emulator.getConfig();

    // Decode status flags (NV-BDIZC)
    const p = regs.P;
    const flags = {
      N: !!(p & 0x80), V: !!(p & 0x40), B: !!(p & 0x10),
      D: !!(p & 0x08), I: !!(p & 0x04), Z: !!(p & 0x02), C: !!(p & 0x01),
    };

    // Memory map (strip the handler object — not serializable/needed)
    const memoryMap = bus.getMemory().getMemoryMap().map((r: any) => ({
      start: r.start, end: r.end, type: r.type,
      size: r.end - r.start + 1,
    }));

    // Peripherals from the hub
    const peripherals = bus.getPeripheralHub().getPeripherals().map((reg: any) => ({
      name: reg.name,
      start: reg.startAddress,
      end: reg.endAddress,
      size: reg.endAddress - reg.startAddress + 1,
      irq: reg.peripheral.getInterruptStatus ? reg.peripheral.getInterruptStatus() : false,
    }));

    // ACIA
    let acia: any = null;
    const aciaInst: ACIA68B50 | null = this.emulator.getAcia();
    if (aciaInst) {
      const status = aciaInst.getStatusRegister();
      acia = {
        baudRate: aciaInst.getBaudRate(),
        control: aciaInst.getControlRegister(),
        status,
        statusBits: {
          RDRF: !!(status & 0x01), TDRE: !!(status & 0x02),
          DCD: !!(status & 0x04), CTS: !!(status & 0x08),
          FE: !!(status & 0x10), OVRN: !!(status & 0x20),
          PE: !!(status & 0x40), IRQ: !!(status & 0x80),
        },
        irq: aciaInst.getInterruptStatus(),
      };
    }

    // VIA — with per-pin port decomposition for the visual view
    let via: any = null;
    const viaInst: VIA65C22Implementation | null = this.emulator.getVia();
    if (viaInst) {
      const portA = viaInst.getPortAData();
      const portB = viaInst.getPortBData();
      const ddrA = viaInst.getPortADirection();
      const ddrB = viaInst.getPortBDirection();
      const timers = viaInst.getTimerState();
      via = {
        portA: { data: portA, ddr: ddrA, pins: decodePins(portA, ddrA) },
        portB: { data: portB, ddr: ddrB, pins: decodePins(portB, ddrB) },
        timer1: viaInst.getTimer1(),
        timer2: viaInst.getTimer2(),
        timer1Running: timers.timer1Running,
        timer2Running: timers.timer2Running,
        ifr: viaInst.getInterruptFlags(),
        ier: viaInst.getInterruptEnableRegister(),
        acr: viaInst.getAuxiliaryControlRegister(),
        pcr: viaInst.getPeripheralControlRegister(),
        shiftRegister: viaInst.getShiftRegister(),
        irq: viaInst.getInterruptStatus(),
      };
      // Attach configured pin labels from the config, if present
      const viaCfg = config.peripherals.via as any;
      if (viaCfg) {
        via.portA.connections = viaCfg.portAConnections || [];
        via.portB.connections = viaCfg.portBConnections || [];
      }
    }

    return {
      name: (config as any).name || '6502 System',
      state: this.emulator.getState(),
      stats: this.emulator.getStats(),
      cpu: {
        type: cpu.getCPUType(),
        A: regs.A, X: regs.X, Y: regs.Y,
        PC: regs.PC, SP: regs.SP, P: regs.P,
        flags,
        irqPending: cpu.isIRQPending(),
        nmiPending: cpu.isNMIPending(),
      },
      clockSpeed: config.cpu.clockSpeed,
      memoryMap,
      peripherals,
      acia,
      via,
      timestamp: Date.now(),
    };
  }
}

/** Decompose a port byte + direction into 8 pin descriptors (bit 7 .. bit 0). */
function decodePins(data: number, ddr: number): Array<{ bit: number; value: boolean; output: boolean }> {
  const pins = [];
  for (let bit = 7; bit >= 0; bit--) {
    pins.push({
      bit,
      value: !!(data & (1 << bit)),
      output: !!(ddr & (1 << bit)),
    });
  }
  return pins;
}
