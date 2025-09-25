#!/usr/bin/env node
/**
 * Command-line interface for the 6502 emulator
 * Provides program loading, execution control, and debugging commands
 */
/**
 * Main CLI class
 */
export declare class EmulatorCLI {
    private emulator;
    private rl;
    private commands;
    private running;
    constructor();
    /**
     * Start the CLI
     */
    start(): Promise<void>;
    /**
     * Setup CLI commands
     */
    private setupCommands;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Add a command to the CLI
     */
    private addCommand;
    /**
     * Process a command line input
     */
    private processCommand;
    private handleLoad;
    private handleReset;
    private handleStatus;
    private handleRun;
    private handleStop;
    private handlePause;
    private handleStep;
    private handleLoadROM;
    private handleRegisters;
    private handleMemory;
    private handleWrite;
    private handlePoke;
    private handleBreakpoint;
    private handleUnbreakpoint;
    private handleSpeed;
    private handleHelp;
    private handleQuit;
}
/**
 * Main entry point for CLI
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=cli.d.ts.map