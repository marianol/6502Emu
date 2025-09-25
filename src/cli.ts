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
      usage: 'run',
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
      name: 'mem',
      description: 'Display memory contents',
      usage: 'mem <address> [length]',
      handler: this.handleMemory.bind(this)
    });

    this.addCommand({
      name: 'write',
      description: 'Write byte(s) to memory',
      usage: 'write <address> <byte1> [byte2] [byte3] ...',
      handler: this.handleWrite.bind(this)
    });

    this.addCommand({
      name: 'poke',
      description: 'Write single byte to memory',
      usage: 'poke <address> <byte>',
      handler: this.handlePoke.bind(this)
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

  private handleRun(): void {
    this.emulator.start();
    console.log('Execution started');
  }

  private handleStop(): void {
    this.emulator.stop();
    console.log('Execution stopped');
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
        if (i === 0 || count <= 5) {
          const regs = this.emulator.getSystemBus().getCPU().getRegisters();
          console.log(`Step ${i + 1}: PC=${regs.PC.toString(16).toUpperCase().padStart(4, '0')} (${cycles} cycles)`);
        }
      }
    } catch (error) {
      console.error(`Step error: ${error}`);
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
    console.log(`PC: ${regs.PC.toString(16).toUpperCase().padStart(4, '0')}  SP: ${regs.SP.toString(16).toUpperCase().padStart(2, '0')}    P:  ${regs.P.toString(16).toUpperCase().padStart(2, '0')}`);
    console.log(`Cycles: ${regs.cycles}`);

    // Decode status flags
    const flags = [];
    if (regs.P & 0x80) flags.push('N');
    if (regs.P & 0x40) flags.push('V');
    if (regs.P & 0x20) flags.push('-');
    if (regs.P & 0x10) flags.push('B');
    if (regs.P & 0x08) flags.push('D');
    if (regs.P & 0x04) flags.push('I');
    if (regs.P & 0x02) flags.push('Z');
    if (regs.P & 0x01) flags.push('C');
    console.log(`Flags: ${flags.join('')}`);
  }

  private handleMemory(args: string[]): void {
    if (args.length < 1 || args.length > 2) {
      console.log('Usage: mem <address> [length]');
      return;
    }

    const address = parseInt(args[0], 16);
    const length = args.length > 1 ? parseInt(args[1]) : 16;

    if (isNaN(address) || isNaN(length)) {
      console.log('Invalid address or length');
      return;
    }

    const inspector = this.emulator.getMemoryInspector();
    const dump = inspector.dumpMemory(address, length, 'hex');
    console.log(dump);
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