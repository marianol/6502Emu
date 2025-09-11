#!/usr/bin/env node

/**
 * Command-line interface for the 6502 emulator
 * Provides program loading, execution control, and debugging commands
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
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
    console.log('6502/65C02 Homebrew Computer Emulator');
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
      name: 'disasm',
      description: 'Disassemble memory',
      usage: 'disasm <address> [length]',
      handler: this.handleDisassemble.bind(this)
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
      name: 'listbreak',
      description: 'List all breakpoints',
      usage: 'listbreak',
      handler: this.handleListBreakpoints.bind(this)
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
          console.log(`Step ${i + 1}: PC=${regs.PC.toString(16).toUpperCase().padStart(4, '0')} (${cycles} cycles)`);\n        }\n      }\n    } catch (error) {\n      console.error(`Step error: ${error}`);\n    }\n  }\n\n  private async handleLoadROM(args: string[]): Promise<void> {\n    if (args.length < 2 || args.length > 3) {\n      console.log('Usage: loadrom <file> <address> [format]');\n      return;\n    }\n\n    const file = args[0];\n    const address = parseInt(args[1], 16);\n    const format = args[2] || 'binary';\n\n    if (isNaN(address)) {\n      console.log('Invalid address format. Use hexadecimal (e.g., F000)');\n      return;\n    }\n\n    if (!['binary', 'ihex', 'srec'].includes(format)) {\n      console.log('Invalid format. Use: binary, ihex, or srec');\n      return;\n    }\n\n    if (!fs.existsSync(file)) {\n      console.log(`ROM file not found: ${file}`);\n      return;\n    }\n\n    try {\n      const memory = this.emulator.getSystemBus().getMemory();\n      const loadedROM = await memory.loadROMFromFile({\n        file,\n        loadAddress: address,\n        format: format as 'binary' | 'ihex' | 'srec'\n      });\n      \n      console.log(`ROM loaded: ${file} at $${loadedROM.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${loadedROM.data.length} bytes)`);\n    } catch (error) {\n      console.error(`Failed to load ROM: ${error}`);\n    }\n  }\n\n  private handleRegisters(): void {\n    const regs = this.emulator.getSystemBus().getCPU().getRegisters();\n    console.log(`A:  ${regs.A.toString(16).toUpperCase().padStart(2, '0')}    X:  ${regs.X.toString(16).toUpperCase().padStart(2, '0')}    Y:  ${regs.Y.toString(16).toUpperCase().padStart(2, '0')}`);\n    console.log(`PC: ${regs.PC.toString(16).toUpperCase().padStart(4, '0')}  SP: ${regs.SP.toString(16).toUpperCase().padStart(2, '0')}    P:  ${regs.P.toString(16).toUpperCase().padStart(2, '0')}`);\n    console.log(`Cycles: ${regs.cycles}`);\n    \n    // Decode status flags\n    const flags = [];\n    if (regs.P & 0x80) flags.push('N');\n    if (regs.P & 0x40) flags.push('V');\n    if (regs.P & 0x20) flags.push('-');\n    if (regs.P & 0x10) flags.push('B');\n    if (regs.P & 0x08) flags.push('D');\n    if (regs.P & 0x04) flags.push('I');\n    if (regs.P & 0x02) flags.push('Z');\n    if (regs.P & 0x01) flags.push('C');\n    console.log(`Flags: ${flags.join('')}`);\n  }\n\n  private handleMemory(args: string[]): void {\n    if (args.length < 1 || args.length > 2) {\n      console.log('Usage: mem <address> [length]');\n      return;\n    }\n\n    const address = parseInt(args[0], 16);\n    const length = args.length > 1 ? parseInt(args[1]) : 16;\n\n    if (isNaN(address) || isNaN(length)) {\n      console.log('Invalid address or length');\n      return;\n    }\n\n    const inspector = this.emulator.getMemoryInspector();\n    const dump = inspector.dumpMemory(address, length, 'hex');\n    console.log(dump);\n  }\n\n  private handleDisassemble(args: string[]): void {\n    if (args.length < 1 || args.length > 2) {\n      console.log('Usage: disasm <address> [length]');\n      return;\n    }\n\n    const address = parseInt(args[0], 16);\n    const length = args.length > 1 ? parseInt(args[1]) : 16;\n\n    if (isNaN(address) || isNaN(length)) {\n      console.log('Invalid address or length');\n      return;\n    }\n\n    const inspector = this.emulator.getMemoryInspector();\n    const dump = inspector.dumpMemory(address, length, 'disasm');\n    console.log(dump);\n  }\n\n  private handleBreakpoint(args: string[]): void {\n    if (args.length !== 1) {\n      console.log('Usage: break <address>');\n      return;\n    }\n\n    const address = parseInt(args[0], 16);\n    if (isNaN(address)) {\n      console.log('Invalid address format. Use hexadecimal (e.g., F000)');\n      return;\n    }\n\n    this.emulator.getSystemBus().getCPU().setBreakpoint(address);\n    console.log(`Breakpoint set at $${address.toString(16).toUpperCase().padStart(4, '0')}`);\n  }\n\n  private handleUnbreakpoint(args: string[]): void {\n    if (args.length !== 1) {\n      console.log('Usage: unbreak <address>');\n      return;\n    }\n\n    const address = parseInt(args[0], 16);\n    if (isNaN(address)) {\n      console.log('Invalid address format. Use hexadecimal (e.g., F000)');\n      return;\n    }\n\n    this.emulator.getSystemBus().getCPU().removeBreakpoint(address);\n    console.log(`Breakpoint removed from $${address.toString(16).toUpperCase().padStart(4, '0')}`);\n  }\n\n  private handleListBreakpoints(): void {\n    // Note: This would require extending the CPU interface to list breakpoints\n    console.log('Breakpoint listing not yet implemented');\n  }\n\n  private handleSpeed(args: string[]): void {\n    if (args.length !== 1) {\n      console.log('Usage: speed <hz>');\n      return;\n    }\n\n    const speed = parseInt(args[0]);\n    if (isNaN(speed) || speed <= 0) {\n      console.log('Invalid speed. Must be a positive number.');\n      return;\n    }\n\n    this.emulator.setClockSpeed(speed);\n    console.log(`Clock speed set to ${speed} Hz`);\n  }\n\n  private handleHelp(args: string[]): void {\n    if (args.length === 0) {\n      console.log('Available commands:');\n      for (const [name, command] of this.commands) {\n        console.log(`  ${name.padEnd(12)} - ${command.description}`);\n      }\n      console.log('\\nUse \"help <command>\" for detailed usage information.');\n    } else {\n      const commandName = args[0].toLowerCase();\n      const command = this.commands.get(commandName);\n      if (command) {\n        console.log(`${command.name}: ${command.description}`);\n        console.log(`Usage: ${command.usage}`);\n      } else {\n        console.log(`Unknown command: ${commandName}`);\n      }\n    }\n  }\n\n  private handleQuit(): void {\n    console.log('Goodbye!');\n    this.emulator.stop();\n    this.running = false;\n    this.rl.close();\n  }\n}\n\n/**\n * Main entry point for CLI\n */\nexport async function main(): Promise<void> {\n  const cli = new EmulatorCLI();\n  await cli.start();\n}\n\n// Run CLI if this file is executed directly\nif (require.main === module) {\n  main().catch(error => {\n    console.error('CLI error:', error);\n    process.exit(1);\n  });\n}\n