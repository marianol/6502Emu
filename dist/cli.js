#!/usr/bin/env node
"use strict";
/**
 * Command-line interface for the 6502 emulator
 * Provides program loading, execution control, and debugging commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulatorCLI = void 0;
exports.main = main;
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const emulator_1 = require("./emulator");
/**
 * Main CLI class
 */
class EmulatorCLI {
    constructor() {
        this.commands = new Map();
        this.running = true;
        this.emulator = new emulator_1.Emulator();
        this.rl = readline_1.default.createInterface({
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
    async start() {
        // Get version from package.json
        const packageJson = require('../package.json');
        console.log(`6502/65C02 Homebrew Computer Emulator v${packageJson.version}`);
        console.log('Type "help" for available commands, "quit" to exit\n');
        // Initialize with default configuration
        try {
            await this.emulator.initialize();
        }
        catch (error) {
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
    setupCommands() {
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
    setupEventHandlers() {
        this.rl.on('line', async (input) => {
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
    addCommand(command) {
        this.commands.set(command.name, command);
    }
    /**
     * Process a command line input
     */
    async processCommand(input) {
        const parts = input.split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const command = this.commands.get(commandName);
        if (command) {
            try {
                await command.handler(args);
            }
            catch (error) {
                console.error(`Error executing command: ${error}`);
            }
        }
        else {
            console.log(`Unknown command: ${commandName}. Type "help" for available commands.`);
        }
    }
    // Command handlers
    async handleLoad(args) {
        if (args.length !== 1) {
            console.log('Usage: load <config-file>');
            return;
        }
        const configFile = args[0];
        if (!fs_1.default.existsSync(configFile)) {
            console.log(`Configuration file not found: ${configFile}`);
            return;
        }
        try {
            await this.emulator.loadConfigFromFile(configFile);
            console.log(`Configuration loaded from ${configFile}`);
        }
        catch (error) {
            console.error(`Failed to load configuration: ${error}`);
        }
    }
    handleReset() {
        this.emulator.reset();
        console.log('System reset');
    }
    handleStatus() {
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
    handleRun(args) {
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
    handleStop() {
        this.emulator.stop();
        // Display current registers after stopping
        const cpu = this.emulator.getSystemBus().getCPU();
        const regs = cpu.getRegisters();
        this.displayRegisters(regs);
    }
    handlePause() {
        this.emulator.pause();
        console.log('Execution paused');
    }
    handleStep(args) {
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
        }
        catch (error) {
            console.error(`Step error: ${error}`);
        }
    }
    displayRegisters(regs) {
        console.log(`A:${regs.A.toString(16).toUpperCase().padStart(2, '0')} X:${regs.X.toString(16).toUpperCase().padStart(2, '0')} Y:${regs.Y.toString(16).toUpperCase().padStart(2, '0')} SP:${regs.SP.toString(16).toUpperCase().padStart(2, '0')} P:${regs.P.toString(2).padStart(8, '0')}`);
        this.displayFlags(regs.P);
    }
    handleSetPC(args) {
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
    handleSetRegister(args) {
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
                if (value & 0x80)
                    flags.push('N');
                if (value & 0x40)
                    flags.push('V');
                if (value & 0x20)
                    flags.push('-');
                if (value & 0x10)
                    flags.push('B');
                if (value & 0x08)
                    flags.push('D');
                if (value & 0x04)
                    flags.push('I');
                if (value & 0x02)
                    flags.push('Z');
                if (value & 0x01)
                    flags.push('C');
                console.log(`Flags: ${flags.join('')}`);
                break;
            default:
                console.log('Invalid register. Use: A, X, Y, SP, or P');
                return;
        }
    }
    async handleLoadROM(args) {
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
        if (!fs_1.default.existsSync(file)) {
            console.log(`ROM file not found: ${file}`);
            return;
        }
        try {
            // For binary format, load directly to avoid async issues
            if (format === 'binary') {
                const data = fs_1.default.readFileSync(file);
                const memory = this.emulator.getSystemBus().getMemory();
                memory.loadROM(data, address);
                console.log(`ROM loaded: ${file} at ${address.toString(16).toUpperCase().padStart(4, '0')} (${data.length} bytes)`);
            }
            else {
                // Use async method for other formats
                const memory = this.emulator.getSystemBus().getMemory();
                const loadedROM = await memory.loadROMFromFile({
                    file,
                    loadAddress: address,
                    format: format
                });
                console.log(`ROM loaded: ${file} at ${loadedROM.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${loadedROM.data.length} bytes)`);
            }
        }
        catch (error) {
            console.error(`Failed to load ROM: ${error}`);
        }
    }
    handleRegisters() {
        const regs = this.emulator.getSystemBus().getCPU().getRegisters();
        console.log(`A:  ${regs.A.toString(16).toUpperCase().padStart(2, '0')}    X:  ${regs.X.toString(16).toUpperCase().padStart(2, '0')}    Y:  ${regs.Y.toString(16).toUpperCase().padStart(2, '0')}`);
        console.log(`PC: ${regs.PC.toString(16).toUpperCase().padStart(4, '0')}  SP: ${regs.SP.toString(16).toUpperCase().padStart(2, '0')}    P:  ${regs.P.toString(2).padStart(8, '0')}`);
        console.log(`Cycles: ${regs.cycles}`);
        // Use the same flag display as step command
        this.displayFlags(regs.P);
    }
    displayFlags(statusReg) {
        const flags = [];
        if (statusReg & 0x80)
            flags.push('N');
        else
            flags.push('n'); // Bit 7: Negative
        if (statusReg & 0x40)
            flags.push('V');
        else
            flags.push('v'); // Bit 6: Overflow
        flags.push('-'); // Bit 5: Unused (always 1)
        if (statusReg & 0x10)
            flags.push('B');
        else
            flags.push('b'); // Bit 4: Break
        if (statusReg & 0x08)
            flags.push('D');
        else
            flags.push('d'); // Bit 3: Decimal
        if (statusReg & 0x04)
            flags.push('I');
        else
            flags.push('i'); // Bit 2: Interrupt
        if (statusReg & 0x02)
            flags.push('Z');
        else
            flags.push('z'); // Bit 1: Zero
        if (statusReg & 0x01)
            flags.push('C');
        else
            flags.push('c'); // Bit 0: Carry
        console.log(`Flags: ${flags.join('')} (NV-BDIZC)`);
    }
    handleMemory(args) {
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
    handleWrite(args) {
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
        const bytes = [];
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
        }
        catch (error) {
            console.error(`Failed to write memory: ${error}`);
        }
    }
    handlePoke(args) {
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
        }
        catch (error) {
            console.error(`Failed to poke memory: ${error}`);
        }
    }
    handleBreakpoint(args) {
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
    handleUnbreakpoint(args) {
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
    handleSpeed(args) {
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
    handleHelp(args) {
        if (args.length === 0) {
            console.log('Available commands:');
            for (const [name, command] of this.commands) {
                console.log(`  ${name.padEnd(12)} - ${command.description}`);
            }
            console.log('\nUse "help <command>" for detailed usage information.');
        }
        else {
            const commandName = args[0].toLowerCase();
            const command = this.commands.get(commandName);
            if (command) {
                console.log(`${command.name}: ${command.description}`);
                console.log(`Usage: ${command.usage}`);
            }
            else {
                console.log(`Unknown command: ${commandName}`);
            }
        }
    }
    handleRegions() {
        const memory = this.emulator.getSystemBus().getMemory();
        const regions = memory.getMemoryMap();
        console.log(`Memory Regions (${regions.length} total):`);
        regions.forEach((region, index) => {
            console.log(`  ${index}: ${region.type}: ${region.start.toString(16).toUpperCase().padStart(4, '0')}-${region.end.toString(16).toUpperCase().padStart(4, '0')}`);
        });
    }
    handleVersion() {
        const packageJson = require('../package.json');
        console.log(`6502/65C02 Homebrew Computer Emulator v${packageJson.version}`);
        console.log(`Author: ${packageJson.author}`);
        console.log(`Description: ${packageJson.description}`);
        console.log(`License: ${packageJson.license}`);
    }
    handleQuit() {
        console.log('Goodbye!');
        this.emulator.stop();
        this.running = false;
        this.rl.close();
    }
}
exports.EmulatorCLI = EmulatorCLI;
/**
 * Main entry point for CLI
 */
async function main() {
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
//# sourceMappingURL=cli.js.map