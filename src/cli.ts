#!/usr/bin/env node

/**
 * Command-line interface for the 6502 emulator
 * Provides program loading, execution control, and debugging commands
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Emulator, EmulatorState } from './emulator';
import { SystemConfigLoader } from './config/system';

/**
 * CLI command interface
 */
interface CLICommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<void> | void;
}

/**
 * Main CLI class
 */
export class EmulatorCLI {
  private emulator: Emulator;
  private rl: readline.Interface;
  private commands: Map<string, CLICommand> = new Map();
  private running: boolean = true;
  private lastMemoryAddress: number = 0;
  private lastMemoryLength: number = 16;
  private lastDisasmAddress: number = 0;
  private lastDisasmLength: number = 32;
  private lastCommand: string = '';

  constructor() {
    this.emulator = new Emulator();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '6502> '
    });

    this.setupCommands();
    this.setupEventHandlers();
  }

  /**
   * Start the CLI
   */
  async start(): Promise<void> {
    // Get version from package.json
    const packageJson = require('../package.json');
    console.log(`6502/65C02 Homebrew Computer Emulator v${packageJson.version}`);
    console.log('Type "help" for available commands, "quit" to exit\n');

    // Initialize with default configuration
    try {
      await this.emulator.initialize();
    } catch (error) {
      console.error('Failed to initialize emulator:', error);
      process.exit(1);
    }

    this.rl.prompt();

    return new Promise((resolve) => {
      this.rl.on('close', () => {
        resolve();
      });
    });
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    // System control commands
    this.addCommand({
      name: 'load',
      description: 'Load configuration from file',
      usage: 'load <config-file>',
      handler: this.handleLoad.bind(this)
    });

    this.addCommand({
      name: 'reset',
      description: 'Reset the system',
      usage: 'reset',
      handler: this.handleReset.bind(this)
    });

    this.addCommand({
      name: 'status',
      description: 'Show system status and statistics',
      usage: 'status',
      handler: this.handleStatus.bind(this)
    });

    // Execution control commands
    this.addCommand({
      name: 'run',
      description: 'Start continuous execution',
      usage: 'run [address]',
      handler: this.handleRun.bind(this)
    });

    this.addCommand({
      name: 'stop',
      description: 'Stop execution',
      usage: 'stop',
      handler: this.handleStop.bind(this)
    });

    this.addCommand({
      name: 'pause',
      description: 'Pause execution',
      usage: 'pause',
      handler: this.handlePause.bind(this)
    });

    this.addCommand({
      name: 'step',
      description: 'Execute single instruction',
      usage: 'step [count]',
      handler: this.handleStep.bind(this)
    });

    // ROM loading commands
    this.addCommand({
      name: 'loadrom',
      description: 'Load ROM image',
      usage: 'loadrom <file> <address> [format]',
      handler: this.handleLoadROM.bind(this)
    });

    // Debugging commands
    this.addCommand({
      name: 'regs',
      description: 'Show CPU registers',
      usage: 'regs',
      handler: this.handleRegisters.bind(this)
    });

    this.addCommand({
      name: 'setpc',
      description: 'Set program counter',
      usage: 'setpc <address>',
      handler: this.handleSetPC.bind(this)
    });

    this.addCommand({
      name: 'setreg',
      description: 'Set CPU register',
      usage: 'setreg <register> <value>',
      handler: this.handleSetRegister.bind(this)
    });

    this.addCommand({
      name: 'mem',
      description: 'Display memory contents',
      usage: 'mem [address] [length] (press return to continue)',
      handler: this.handleMemory.bind(this)
    });

    this.addCommand({
      name: 'm',
      description: 'Display memory contents (alias for mem)',
      usage: 'm [address] [length] (press return to continue)',
      handler: this.handleMemory.bind(this)
    });

    this.addCommand({
      name: 'write',
      description: 'Write byte(s) to memory',
      usage: 'write <address> <byte1> [byte2] [byte3] ...',
      handler: this.handleWrite.bind(this)
    });

    this.addCommand({
      name: 'w',
      description: 'Write byte(s) to memory (alias for write)',
      usage: 'w <address> <byte1> [byte2] [byte3] ...',
      handler: this.handleWrite.bind(this)
    });

    this.addCommand({
      name: 'poke',
      description: 'Write single byte to memory',
      usage: 'poke <address> <byte>',
      handler: this.handlePoke.bind(this)
    });

    this.addCommand({
      name: 'disasm',
      description: 'Disassemble memory contents',
      usage: 'disasm [address] [length] (press return to continue)',
      handler: this.handleDisasm.bind(this)
    });

    this.addCommand({
      name: 'd',
      description: 'Disassemble memory contents (alias for disasm)',
      usage: 'd [address] [length] (press return to continue)',
      handler: this.handleDisasm.bind(this)
    });

    this.addCommand({
      name: 'break',
      description: 'Set breakpoint',
      usage: 'break <address>',
      handler: this.handleBreakpoint.bind(this)
    });

    this.addCommand({
      name: 'unbreak',
      description: 'Remove breakpoint',
      usage: 'unbreak <address>',
      handler: this.handleUnbreakpoint.bind(this)
    });

    this.addCommand({
      name: 'breakpoints',
      description: 'List all breakpoints',
      usage: 'breakpoints',
      handler: this.handleListBreakpoints.bind(this)
    });

    this.addCommand({
      name: 'breaks',
      description: 'List all breakpoints (alias for breakpoints)',
      usage: 'breaks',
      handler: this.handleListBreakpoints.bind(this)
    });

    this.addCommand({
      name: 'clearbreaks',
      description: 'Clear all breakpoints',
      usage: 'clearbreaks',
      handler: this.handleClearBreakpoints.bind(this)
    });

    // Clock speed control
    this.addCommand({
      name: 'speed',
      description: 'Set clock speed in Hz',
      usage: 'speed <hz>',
      handler: this.handleSpeed.bind(this)
    });

    // Help and utility commands
    this.addCommand({
      name: 'regions',
      description: 'Show memory regions',
      usage: 'regions',
      handler: this.handleRegions.bind(this)
    });

    this.addCommand({
      name: 'version',
      description: 'Show emulator version',
      usage: 'version',
      handler: this.handleVersion.bind(this)
    });

    this.addCommand({
      name: 'help',
      description: 'Show available commands',
      usage: 'help [command]',
      handler: this.handleHelp.bind(this)
    });

    this.addCommand({
      name: 'quit',
      description: 'Exit the emulator',
      usage: 'quit',
      handler: this.handleQuit.bind(this)
    });

    this.addCommand({
      name: 'exit',
      description: 'Exit the emulator',
      usage: 'exit',
      handler: this.handleQuit.bind(this)
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();
      if (trimmed) {
        await this.processCommand(trimmed);
      } else {
        // Empty input - continue memory display if last command was mem or m
        if (this.lastCommand === 'mem' || this.lastCommand === 'm') {
          this.handleMemory([]);
        } else if (this.lastCommand === 'disasm' || this.lastCommand === 'd') {
          this.handleDisasm([]);
        }
      }
      if (this.running) {
        this.rl.prompt();
      }
    });

    this.rl.on('SIGINT', () => {
      console.log('\nUse "quit" to exit');
      this.rl.prompt();
    });
  }

  /**
   * Add a command to the CLI
   */
  private addCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Process a command line input
   */
  private async processCommand(input: string): Promise<void> {
    const parts = input.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (command) {
      try {
        // Track the last command for memory continuation
        this.lastCommand = commandName;
        await command.handler(args);
      } catch (error) {
        console.error(`Error executing command: ${error}`);
      }
    } else {
      console.log(`Unknown command: ${commandName}. Type "help" for available commands.`);
    }
  }

  // Command handlers
  private async handleLoad(args: string[]): Promise<void> {
    if (args.length !== 1) {
      console.log('Usage: load <config-file>');
      return;
    }

    const configFile = args[0];
    if (!fs.existsSync(configFile)) {
      console.log(`Configuration file not found: ${configFile}`);
      return;
    }

    try {
      await this.emulator.loadConfigFromFile(configFile);
      console.log(`Configuration loaded from ${configFile}`);
    } catch (error) {
      console.error(`Failed to load configuration: ${error}`);
    }
  }

  private handleReset(): void {
    this.emulator.reset();
    console.log('System reset');
  }

  private handleStatus(): void {
    const state = this.emulator.getState();
    const stats = this.emulator.getStats();
    const config = this.emulator.getConfig();

    console.log(`State: ${state}`);
    console.log(`CPU: ${config.cpu.type} @ ${config.cpu.clockSpeed} Hz`);
    console.log(`Total Cycles: ${stats.totalCycles}`);
    console.log(`Instructions: ${stats.instructionsExecuted}`);
    console.log(`Execution Time: ${stats.executionTimeMs} ms`);
    console.log(`Average IPS: ${Math.round(stats.averageIPS)}`);
    console.log(`Actual Clock: ${Math.round(stats.clockSpeed)} Hz`);
  }

  private handleRun(args: string[]): void {
    // If address is provided, set PC to that address
    if (args.length > 0) {
      const address = parseInt(args[0], 16);
      if (isNaN(address)) {
        console.log('Invalid address format. Use hexadecimal (e.g., 0200)');
        return;
      }
      
      const cpu = this.emulator.getSystemBus().getCPU();
      const currentRegs = cpu.getRegisters();
      cpu.setRegisters({ ...currentRegs, PC: address });
      console.log(`Set PC to ${address.toString(16).toUpperCase().padStart(4, '0')}`);
    }
    
    this.emulator.start();
  }

  private handleStop(): void {
    this.emulator.stop();
    
    // Display current registers after stopping
    const cpu = this.emulator.getSystemBus().getCPU();
    const regs = cpu.getRegisters();
    this.displayRegisters(regs);
  }

  private handlePause(): void {
    this.emulator.pause();
    console.log('Execution paused');
  }

  private handleStep(args: string[]): void {
    const count = args.length > 0 ? parseInt(args[0]) : 1;
    if (isNaN(count) || count < 1) {
      console.log('Usage: step [count]');
      return;
    }

    try {
      for (let i = 0; i < count; i++) {
        const cycles = this.emulator.step();
        const regs = this.emulator.getSystemBus().getCPU().getRegisters();
        
        // Always show step info and registers
        console.log(`Step ${i + 1}: PC=${regs.PC.toString(16).toUpperCase().padStart(4, '0')} (${cycles} cycles)`);
        this.displayRegisters(regs);
        
        // Add separator for multiple steps
        if (count > 1 && i < count - 1) {
          console.log('---');
        }
      }
    } catch (error) {
      console.error(`Step error: ${error}`);
    }
  }

  private displayRegisters(regs: any): void {
    console.log(`A:${regs.A.toString(16).toUpperCase().padStart(2, '0')} X:${regs.X.toString(16).toUpperCase().padStart(2, '0')} Y:${regs.Y.toString(16).toUpperCase().padStart(2, '0')} SP:${regs.SP.toString(16).toUpperCase().padStart(2, '0')} P:${regs.P.toString(2).padStart(8, '0')}`);
    this.displayFlags(regs.P);
  }

  private handleSetPC(args: string[]): void {
    if (args.length !== 1) {
      console.log('Usage: setpc <address>');
      console.log('Example: setpc 0200');
      return;
    }

    const address = parseInt(args[0], 16);
    if (isNaN(address) || address < 0 || address > 0xFFFF) {
      console.log('Invalid address. Must be 0000-FFFF');
      return;
    }

    const cpu = this.emulator.getSystemBus().getCPU();
    const currentRegs = cpu.getRegisters();
    cpu.setRegisters({ ...currentRegs, PC: address });
    
    console.log(`PC set to ${address.toString(16).toUpperCase().padStart(4, '0')}`);
  }

  private handleSetRegister(args: string[]): void {
    if (args.length !== 2) {
      console.log('Usage: setreg <register> <value>');
      console.log('Registers: A, X, Y, SP, P');
      console.log('Examples: setreg A 42, setreg P 20, setreg SP FF');
      return;
    }

    const register = args[0].toUpperCase();
    const value = parseInt(args[1], 16);

    if (isNaN(value) || value < 0 || value > 0xFF) {
      console.log('Invalid value. Must be 00-FF');
      return;
    }

    const cpu = this.emulator.getSystemBus().getCPU();
    const currentRegs = cpu.getRegisters();
    
    switch (register) {
      case 'A':
        cpu.setRegisters({ ...currentRegs, A: value });
        console.log(`A set to ${value.toString(16).toUpperCase().padStart(2, '0')}`);
        break;
      case 'X':
        cpu.setRegisters({ ...currentRegs, X: value });
        console.log(`X set to ${value.toString(16).toUpperCase().padStart(2, '0')}`);
        break;
      case 'Y':
        cpu.setRegisters({ ...currentRegs, Y: value });
        console.log(`Y set to ${value.toString(16).toUpperCase().padStart(2, '0')}`);
        break;
      case 'SP':
        cpu.setRegisters({ ...currentRegs, SP: value });
        console.log(`SP set to ${value.toString(16).toUpperCase().padStart(2, '0')}`);
        break;
      case 'P':
        cpu.setRegisters({ ...currentRegs, P: value });
        console.log(`P set to ${value.toString(16).toUpperCase().padStart(2, '0')}`);
        // Show decoded flags
        const flags = [];
        if (value & 0x80) flags.push('N');
        if (value & 0x40) flags.push('V');
        if (value & 0x20) flags.push('-');
        if (value & 0x10) flags.push('B');
        if (value & 0x08) flags.push('D');
        if (value & 0x04) flags.push('I');
        if (value & 0x02) flags.push('Z');
        if (value & 0x01) flags.push('C');
        console.log(`Flags: ${flags.join('')}`);
        break;
      default:
        console.log('Invalid register. Use: A, X, Y, SP, or P');
        return;
    }
  }

  private async handleLoadROM(args: string[]): Promise<void> {
    if (args.length < 2 || args.length > 3) {
      console.log('Usage: loadrom <file> <address> [format]');
      return;
    }

    const file = args[0];
    const address = parseInt(args[1], 16);
    const format = args[2] || 'binary';

    if (isNaN(address)) {
      console.log('Invalid address format. Use hexadecimal (e.g., F000)');
      return;
    }

    if (!['binary', 'ihex', 'srec'].includes(format)) {
      console.log('Invalid format. Use: binary, ihex, or srec');
      return;
    }

    if (!fs.existsSync(file)) {
      console.log(`ROM file not found: ${file}`);
      return;
    }

    try {
      // For binary format, load directly to avoid async issues
      if (format === 'binary') {
        const data = fs.readFileSync(file);
        const memory = this.emulator.getSystemBus().getMemory();
        memory.loadROM(data, address);
        console.log(`ROM loaded: ${file} at ${address.toString(16).toUpperCase().padStart(4, '0')} (${data.length} bytes)`);
      } else {
        // Use async method for other formats
        const memory = this.emulator.getSystemBus().getMemory();
        const loadedROM = await memory.loadROMFromFile({
          file,
          loadAddress: address,
          format: format as 'binary' | 'ihex' | 'srec'
        });
        console.log(`ROM loaded: ${file} at ${loadedROM.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${loadedROM.data.length} bytes)`);
      }
    } catch (error) {
      console.error(`Failed to load ROM: ${error}`);
    }
  }

  private handleRegisters(): void {
    const regs = this.emulator.getSystemBus().getCPU().getRegisters();
    console.log(`A:  ${regs.A.toString(16).toUpperCase().padStart(2, '0')}    X:  ${regs.X.toString(16).toUpperCase().padStart(2, '0')}    Y:  ${regs.Y.toString(16).toUpperCase().padStart(2, '0')}`);
    console.log(`PC: ${regs.PC.toString(16).toUpperCase().padStart(4, '0')}  SP: ${regs.SP.toString(16).toUpperCase().padStart(2, '0')}    P:  ${regs.P.toString(2).padStart(8, '0')}`);
    console.log(`Cycles: ${regs.cycles}`);

    // Use the same flag display as step command
    this.displayFlags(regs.P);
  }

  private displayFlags(statusReg: number): void {
    const flags = [];
    if (statusReg & 0x80) flags.push('N'); else flags.push('n');  // Bit 7: Negative
    if (statusReg & 0x40) flags.push('V'); else flags.push('v');  // Bit 6: Overflow
    flags.push('-');                                              // Bit 5: Unused (always 1)
    if (statusReg & 0x10) flags.push('B'); else flags.push('b');  // Bit 4: Break
    if (statusReg & 0x08) flags.push('D'); else flags.push('d');  // Bit 3: Decimal
    if (statusReg & 0x04) flags.push('I'); else flags.push('i');  // Bit 2: Interrupt
    if (statusReg & 0x02) flags.push('Z'); else flags.push('z');  // Bit 1: Zero
    if (statusReg & 0x01) flags.push('C'); else flags.push('c');  // Bit 0: Carry
    console.log(`Flags: ${flags.join('')} (NV-BDIZC)`);
  }

  private handleMemory(args: string[]): void {
    let address: number;
    let length: number;

    if (args.length === 0) {
      // Continue from last address if no arguments provided
      address = this.lastMemoryAddress;
      length = this.lastMemoryLength;
    } else if (args.length === 1) {
      address = parseInt(args[0], 16);
      length = 16; // Default length
      if (isNaN(address)) {
        console.log('Invalid address');
        return;
      }
    } else if (args.length === 2) {
      address = parseInt(args[0], 16);
      length = parseInt(args[1]);
      if (isNaN(address) || isNaN(length)) {
        console.log('Invalid address or length');
        return;
      }
    } else {
      console.log('Usage: mem [address] [length]');
      return;
    }

    const inspector = this.emulator.getMemoryInspector();
    const dump = inspector.dumpMemory(address, length, 'hex');
    console.log(dump);

    // Update last memory address for continuation
    this.lastMemoryAddress = address + length;
    this.lastMemoryLength = length;
  }

  private handleDisasm(args: string[]): void {
    let address: number;
    let length: number;

    if (args.length === 0) {
      // Continue from last address if no arguments provided
      address = this.lastDisasmAddress;
      length = this.lastDisasmLength;
    } else if (args.length === 1) {
      address = parseInt(args[0], 16);
      length = 16; // Default length for disassembly (covers ~6-8 instructions)
      if (isNaN(address)) {
        console.log('Invalid address');
        return;
      }
    } else if (args.length === 2) {
      address = parseInt(args[0], 16);
      length = parseInt(args[1]);
      if (isNaN(address) || isNaN(length)) {
        console.log('Invalid address or length');
        return;
      }
    } else {
      console.log('Usage: disasm [address] [length]');
      return;
    }

    const inspector = this.emulator.getMemoryInspector();
    const disassembly = inspector.dumpMemory(address, length, 'disasm');
    console.log(disassembly);

    // Update last disassembly address for continuation
    // For disassembly, we need to calculate the actual end address based on instruction lengths
    const lines = disassembly.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^([0-9A-F]{4}):/);
      if (match) {
        const lastInstructionAddr = parseInt(match[1], 16);
        // Estimate instruction length from the last instruction
        const opcodeMatch = lastLine.match(/: ([0-9A-F]{2})/);
        if (opcodeMatch) {
          const opcode = parseInt(opcodeMatch[1], 16);
          const instrLength = this.getInstructionLength(opcode);
          this.lastDisasmAddress = lastInstructionAddr + instrLength;
        } else {
          this.lastDisasmAddress = lastInstructionAddr + 1;
        }
      } else {
        this.lastDisasmAddress = address + length;
      }
    } else {
      this.lastDisasmAddress = address + length;
    }
    
    this.lastDisasmLength = length;
  }

  // Helper method to get instruction length (simplified version)
  private getInstructionLength(opcode: number): number {
    // Simplified instruction length lookup - matches the one in memory-inspector.ts
    const lengths: { [key: number]: number } = {
      // Implied/Accumulator (1 byte)
      0x00: 1, 0x08: 1, 0x0A: 1, 0x18: 1, 0x28: 1, 0x2A: 1, 0x38: 1, 0x40: 1,
      0x48: 1, 0x4A: 1, 0x58: 1, 0x60: 1, 0x68: 1, 0x6A: 1, 0x78: 1, 0x88: 1,
      0x8A: 1, 0x98: 1, 0x9A: 1, 0xA8: 1, 0xAA: 1, 0xB8: 1, 0xBA: 1, 0xC8: 1,
      0xCA: 1, 0xD8: 1, 0xE8: 1, 0xEA: 1, 0xF8: 1,
      
      // Immediate/Zero Page/Relative (2 bytes)
      0x01: 2, 0x05: 2, 0x06: 2, 0x09: 2, 0x10: 2, 0x11: 2, 0x15: 2, 0x16: 2,
      0x19: 2, 0x21: 2, 0x24: 2, 0x25: 2, 0x26: 2, 0x29: 2, 0x30: 2, 0x31: 2,
      0x35: 2, 0x36: 2, 0x39: 2, 0x41: 2, 0x45: 2, 0x46: 2, 0x49: 2, 0x50: 2,
      0x51: 2, 0x55: 2, 0x56: 2, 0x59: 2, 0x61: 2, 0x65: 2, 0x66: 2, 0x69: 2,
      0x70: 2, 0x71: 2, 0x75: 2, 0x76: 2, 0x79: 2, 0x81: 2, 0x84: 2, 0x85: 2,
      0x86: 2, 0x90: 2, 0x91: 2, 0x94: 2, 0x95: 2, 0x96: 2, 0xA0: 2, 0xA1: 2,
      0xA2: 2, 0xA4: 2, 0xA5: 2, 0xA6: 2, 0xA9: 2, 0xB0: 2, 0xB1: 2, 0xB4: 2,
      0xB5: 2, 0xB6: 2, 0xB9: 2, 0xC0: 2, 0xC1: 2, 0xC4: 2, 0xC5: 2, 0xC6: 2,
      0xC9: 2, 0xD0: 2, 0xD1: 2, 0xD5: 2, 0xD6: 2, 0xD9: 2, 0xE0: 2, 0xE1: 2,
      0xE4: 2, 0xE5: 2, 0xE6: 2, 0xE9: 2, 0xF0: 2, 0xF1: 2, 0xF5: 2, 0xF6: 2,
      0xF9: 2,
      
      // Absolute (3 bytes)
      0x0D: 3, 0x0E: 3, 0x1D: 3, 0x1E: 3, 0x20: 3, 0x2C: 3, 0x2D: 3, 0x2E: 3,
      0x3D: 3, 0x3E: 3, 0x4C: 3, 0x4D: 3, 0x4E: 3, 0x5D: 3, 0x5E: 3, 0x6C: 3,
      0x6D: 3, 0x6E: 3, 0x7D: 3, 0x7E: 3, 0x8C: 3, 0x8D: 3, 0x8E: 3, 0x99: 3,
      0x9D: 3, 0xAC: 3, 0xAD: 3, 0xAE: 3, 0xBC: 3, 0xBD: 3, 0xBE: 3, 0xCC: 3,
      0xCD: 3, 0xCE: 3, 0xDD: 3, 0xDE: 3, 0xEC: 3, 0xED: 3, 0xEE: 3, 0xFD: 3,
      0xFE: 3
    };
    
    return lengths[opcode] || 1;
  }

  private handleWrite(args: string[]): void {
    if (args.length < 2) {
      console.log('Usage: write <address> <byte1> [byte2] [byte3] ...');
      console.log('Example: write 0200 A9 42 8D 00 02');
      return;
    }

    const address = parseInt(args[0], 16);
    if (isNaN(address)) {
      console.log('Invalid address format. Use hexadecimal (e.g., 0200)');
      return;
    }

    const bytes: number[] = [];
    for (let i = 1; i < args.length; i++) {
      const byte = parseInt(args[i], 16);
      if (isNaN(byte) || byte < 0 || byte > 255) {
        console.log(`Invalid byte value: ${args[i]}. Must be 00-FF`);
        return;
      }
      bytes.push(byte);
    }

    try {
      const memory = this.emulator.getSystemBus().getMemory();
      for (let i = 0; i < bytes.length; i++) {
        memory.write(address + i, bytes[i]);
      }

      console.log(`Wrote ${bytes.length} byte(s) to ${address.toString(16).toUpperCase().padStart(4, '0')}: ${bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`);
    } catch (error) {
      console.error(`Failed to write memory: ${error}`);
    }
  }

  private handlePoke(args: string[]): void {
    if (args.length !== 2) {
      console.log('Usage: poke <address> <byte>');
      console.log('Example: poke 0200 A9');
      return;
    }

    const address = parseInt(args[0], 16);
    const byte = parseInt(args[1], 16);

    if (isNaN(address)) {
      console.log('Invalid address format. Use hexadecimal (e.g., 0200)');
      return;
    }

    if (isNaN(byte) || byte < 0 || byte > 255) {
      console.log('Invalid byte value. Must be 00-FF');
      return;
    }

    try {
      const memory = this.emulator.getSystemBus().getMemory();
      memory.write(address, byte);

      console.log(`Poked ${address.toString(16).toUpperCase().padStart(4, '0')}: ${byte.toString(16).toUpperCase().padStart(2, '0')}`);
    } catch (error) {
      console.error(`Failed to poke memory: ${error}`);
    }
  }

  private handleBreakpoint(args: string[]): void {
    if (args.length !== 1) {
      console.log('Usage: break <address>');
      return;
    }

    const address = parseInt(args[0], 16);
    if (isNaN(address)) {
      console.log('Invalid address format. Use hexadecimal (e.g., F000)');
      return;
    }

    this.emulator.getSystemBus().getCPU().setBreakpoint(address);
    console.log(`Breakpoint set at ${address.toString(16).toUpperCase().padStart(4, '0')}`);
  }

  private handleUnbreakpoint(args: string[]): void {
    if (args.length !== 1) {
      console.log('Usage: unbreak <address>');
      return;
    }

    const address = parseInt(args[0], 16);
    if (isNaN(address)) {
      console.log('Invalid address format. Use hexadecimal (e.g., F000)');
      return;
    }

    this.emulator.getSystemBus().getCPU().removeBreakpoint(address);
    console.log(`Breakpoint removed from ${address.toString(16).toUpperCase().padStart(4, '0')}`);
  }

  private handleListBreakpoints(args: string[]): void {
    if (args.length !== 0) {
      console.log('Usage: breakpoints');
      return;
    }

    const cpu = this.emulator.getSystemBus().getCPU();
    
    // We need to check which addresses have breakpoints
    // Since there's no direct method to list breakpoints, we'll check a reasonable range
    const breakpoints: number[] = [];
    
    // Check common address ranges for breakpoints
    for (let addr = 0x0000; addr <= 0xFFFF; addr++) {
      if (cpu.hasBreakpoint(addr)) {
        breakpoints.push(addr);
      }
    }

    if (breakpoints.length === 0) {
      console.log('No breakpoints set');
    } else {
      console.log(`Breakpoints (${breakpoints.length} total):`);
      breakpoints.forEach((addr, index) => {
        console.log(`  ${(index + 1).toString().padStart(2, ' ')}: ${addr.toString(16).toUpperCase().padStart(4, '0')}`);
      });
    }
  }

  private handleClearBreakpoints(args: string[]): void {
    if (args.length !== 0) {
      console.log('Usage: clearbreaks');
      return;
    }

    const cpu = this.emulator.getSystemBus().getCPU();
    
    // Find all current breakpoints and remove them
    let removedCount = 0;
    for (let addr = 0x0000; addr <= 0xFFFF; addr++) {
      if (cpu.hasBreakpoint(addr)) {
        cpu.removeBreakpoint(addr);
        removedCount++;
      }
    }

    if (removedCount === 0) {
      console.log('No breakpoints to clear');
    } else {
      console.log(`Cleared ${removedCount} breakpoint${removedCount === 1 ? '' : 's'}`);
    }
  }

  private handleSpeed(args: string[]): void {
    if (args.length !== 1) {
      console.log('Usage: speed <hz>');
      return;
    }

    const speed = parseInt(args[0]);
    if (isNaN(speed) || speed <= 0) {
      console.log('Invalid speed. Must be a positive number.');
      return;
    }

    this.emulator.setClockSpeed(speed);
    console.log(`Clock speed set to ${speed} Hz`);
  }

  private handleHelp(args: string[]): void {
    if (args.length === 0) {
      console.log('Available commands:');
      for (const [name, command] of this.commands) {
        console.log(`  ${name.padEnd(12)} - ${command.description}`);
      }
      console.log('\nUse "help <command>" for detailed usage information.');
    } else {
      const commandName = args[0].toLowerCase();
      const command = this.commands.get(commandName);
      if (command) {
        console.log(`${command.name}: ${command.description}`);
        console.log(`Usage: ${command.usage}`);
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
    }
  }

  private handleRegions(): void {
    const memory = this.emulator.getSystemBus().getMemory();
    const regions = memory.getMemoryMap();
    
    console.log(`Memory Regions (${regions.length} total):`);
    regions.forEach((region, index) => {
      console.log(`  ${index}: ${region.type}: ${region.start.toString(16).toUpperCase().padStart(4, '0')}-${region.end.toString(16).toUpperCase().padStart(4, '0')}`);
    });
  }



  private handleVersion(): void {
    const packageJson = require('../package.json');
    console.log(`6502/65C02 Homebrew Computer Emulator v${packageJson.version}`);
    console.log(`Author: ${packageJson.author}`);
    console.log(`Description: ${packageJson.description}`);
    console.log(`License: ${packageJson.license}`);
  }

  private handleQuit(): void {
    console.log('Goodbye!');
    this.emulator.stop();
    this.running = false;
    this.rl.close();
  }
}

/**
 * Main entry point for CLI
 */
export async function main(): Promise<void> {
  const cli = new EmulatorCLI();
  await cli.start();
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('CLI error:', error);
    process.exit(1);
  });
}