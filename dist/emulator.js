"use strict";
/**
 * Main emulator application
 * Coordinates CPU, memory, peripherals, and provides execution control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emulator = exports.EmulatorState = void 0;
const bus_1 = require("./core/bus");
const system_1 = require("./config/system");
const memory_inspector_1 = require("./debug/memory-inspector");
const inspector_1 = require("./debug/inspector");
const acia_1 = require("./peripherals/acia");
const via_1 = require("./peripherals/via");
const symbol_parser_1 = require("./cc65/symbol-parser");
const memory_layout_1 = require("./cc65/memory-layout");
const profiler_1 = require("./performance/profiler");
const optimizer_1 = require("./performance/optimizer");
/**
 * Execution state of the emulator
 */
var EmulatorState;
(function (EmulatorState) {
    EmulatorState["STOPPED"] = "stopped";
    EmulatorState["RUNNING"] = "running";
    EmulatorState["PAUSED"] = "paused";
    EmulatorState["STEPPING"] = "stepping";
    EmulatorState["ERROR"] = "error";
})(EmulatorState || (exports.EmulatorState = EmulatorState = {}));
/**
 * Main emulator class that coordinates all components
 */
class Emulator {
    constructor(config) {
        this.state = EmulatorState.STOPPED;
        this.targetClockSpeed = 1000000; // 1MHz default
        this.cyclesPerTick = 1000; // Execute 1000 cycles per timer tick
        // Statistics
        this.stats = {
            totalCycles: 0,
            instructionsExecuted: 0,
            executionTimeMs: 0,
            averageIPS: 0,
            clockSpeed: 0
        };
        this.startTime = 0;
        this.lastStatsUpdate = 0;
        this.config = config || system_1.SystemConfigLoader.getDefaultConfig();
        // Initialize performance components
        this.profiler = new profiler_1.EmulatorProfiler();
        this.optimizer = new optimizer_1.EmulatorOptimizer();
        this.speedController = this.optimizer.getSpeedController();
        this.systemBus = new bus_1.SystemBus();
        this.memoryInspector = new memory_inspector_1.MemoryInspectorImpl(this.systemBus.getMemory());
        this.debugInspector = new inspector_1.DebugInspectorImpl(this.systemBus.getCPU(), this.systemBus.getMemory(), this.systemBus.getInterruptController());
        this.targetClockSpeed = this.config.cpu.clockSpeed;
        this.speedController.setTargetSpeed(this.targetClockSpeed);
        this.calculateCyclesPerTick();
    }
    /**
     * Initialize the emulator from configuration
     */
    async initialize() {
        try {
            this.state = EmulatorState.STOPPED;
            // Configure CPU
            this.systemBus.getCPU().setCPUType(this.config.cpu.type);
            // Configure memory
            const memory = this.systemBus.getMemory();
            memory.configureRAM(this.config.memory.ramStart, this.config.memory.ramSize);
            // Add default reset vectors if no ROM is loaded
            if (this.config.memory.romImages.length === 0) {
                // Create a minimal ROM with reset vector pointing to RAM start
                const resetVector = new Uint8Array(6);
                resetVector[4] = this.config.memory.ramStart & 0xFF; // Reset vector low byte
                resetVector[5] = (this.config.memory.ramStart >> 8) & 0xFF; // Reset vector high byte
                memory.loadROM(resetVector, 0xFFFA); // NMI, Reset, IRQ vectors
            }
            // Load ROM images
            if (this.config.memory.romImages.length > 0) {
                await memory.loadMultipleROMs(this.config.memory.romImages);
            }
            // Configure peripherals
            await this.configurePeripherals();
            // Load CC65 symbols if specified
            if (this.config.debugging.symbolFile) {
                try {
                    this.symbolParser = new symbol_parser_1.CC65SymbolParser();
                    // Note: Symbol file loading would need to be implemented
                    console.log(`CC65 symbol file specified: ${this.config.debugging.symbolFile}`);
                    // Use standard homebrew layout for now
                    this.memoryLayout = memory_layout_1.CC65MemoryConfigurator.getHomebrewLayout();
                }
                catch (error) {
                    console.warn('Failed to load CC65 symbols:', error);
                }
            }
            // Reset system to initial state
            this.reset();
            console.log('Emulator initialized successfully');
            this.logSystemInfo();
        }
        catch (error) {
            this.state = EmulatorState.ERROR;
            throw new Error(`Failed to initialize emulator: ${error}`);
        }
    }
    /**
     * Configure peripherals based on system configuration
     */
    async configurePeripherals() {
        const peripheralHub = this.systemBus.getPeripheralHub();
        // Clear existing peripherals
        const existingPeripherals = peripheralHub.getPeripherals();
        for (const peripheral of existingPeripherals) {
            peripheralHub.unregisterPeripheral(peripheral.name);
        }
        // Configure ACIA if specified
        if (this.config.peripherals.acia) {
            const acia = new acia_1.ACIA68B50();
            acia.setBaudRate(this.config.peripherals.acia.baudRate);
            if (this.config.peripherals.acia.serialPort) {
                // TODO: Connect to actual serial port when available
                console.log(`ACIA configured for serial port: ${this.config.peripherals.acia.serialPort}`);
            }
            peripheralHub.registerPeripheral(acia, this.config.peripherals.acia.baseAddress, this.config.peripherals.acia.baseAddress + 1, 'ACIA');
            console.log(`ACIA registered at $${this.config.peripherals.acia.baseAddress.toString(16).toUpperCase().padStart(4, '0')}-$${(this.config.peripherals.acia.baseAddress + 1).toString(16).toUpperCase().padStart(4, '0')}`);
        }
        // Configure VIA if specified
        if (this.config.peripherals.via) {
            const via = new via_1.VIA65C22Implementation();
            peripheralHub.registerPeripheral(via, this.config.peripherals.via.baseAddress, this.config.peripherals.via.baseAddress + 15, 'VIA');
            console.log(`VIA registered at $${this.config.peripherals.via.baseAddress.toString(16).toUpperCase().padStart(4, '0')}-$${(this.config.peripherals.via.baseAddress + 15).toString(16).toUpperCase().padStart(4, '0')}`);
        }
    }
    /**
     * Reset the entire system
     */
    reset() {
        this.stop();
        this.systemBus.reset();
        this.resetStats();
        if (this.config.debugging.breakOnReset) {
            this.state = EmulatorState.PAUSED;
        }
        else {
            this.state = EmulatorState.STOPPED;
        }
        console.log('System reset');
    }
    /**
     * Start continuous execution
     */
    start() {
        if (this.state === EmulatorState.RUNNING) {
            return;
        }
        this.state = EmulatorState.RUNNING;
        this.startTime = Date.now();
        this.lastStatsUpdate = this.startTime;
        this.scheduleExecution();
        console.log('Execution started');
    }
    /**
     * Stop execution
     */
    stop() {
        if (this.executionTimer) {
            clearTimeout(this.executionTimer);
            this.executionTimer = undefined;
        }
        if (this.state === EmulatorState.RUNNING) {
            this.updateStats();
        }
        this.state = EmulatorState.STOPPED;
        console.log('Execution stopped');
    }
    /**
     * Pause execution
     */
    pause() {
        if (this.state === EmulatorState.RUNNING) {
            this.stop();
            this.state = EmulatorState.PAUSED;
            console.log('Execution paused');
        }
    }
    /**
     * Resume execution from paused state
     */
    resume() {
        if (this.state === EmulatorState.PAUSED) {
            this.start();
        }
    }
    /**
     * Execute a single instruction
     */
    step() {
        if (this.state === EmulatorState.ERROR) {
            throw new Error('Cannot step: emulator is in error state');
        }
        this.state = EmulatorState.STEPPING;
        try {
            const cycles = this.systemBus.step();
            // Check if execution was halted due to breakpoint (0 cycles returned)
            if (cycles === 0) {
                const pc = this.systemBus.getCPU().getRegisters().PC;
                console.log(`Breakpoint hit at ${pc.toString(16).toUpperCase().padStart(4, '0')}`);
                this.state = EmulatorState.PAUSED;
                return 0;
            }
            this.stats.totalCycles += cycles;
            this.stats.instructionsExecuted++;
            this.state = EmulatorState.PAUSED;
            return cycles;
        }
        catch (error) {
            this.state = EmulatorState.ERROR;
            throw error;
        }
    }
    /**
     * Schedule the next execution cycle
     */
    scheduleExecution() {
        if (this.state !== EmulatorState.RUNNING) {
            return;
        }
        // Calculate timing for accurate clock speed simulation
        const targetInterval = (this.cyclesPerTick / this.targetClockSpeed) * 1000;
        this.executionTimer = setTimeout(() => {
            this.executeChunk();
        }, Math.max(1, targetInterval));
    }
    /**
     * Execute a chunk of instructions
     */
    executeChunk() {
        if (this.state !== EmulatorState.RUNNING) {
            return;
        }
        try {
            const chunkStartTime = performance.now();
            let cyclesExecuted = 0;
            // Execute cycles in chunks for better performance
            while (cyclesExecuted < this.cyclesPerTick && this.state === EmulatorState.RUNNING) {
                const stepStartTime = this.profiler.startTiming();
                const cycles = this.systemBus.step();
                this.profiler.endTiming(stepStartTime, 'cpu_step');
                // Check if execution was halted due to breakpoint (0 cycles returned)
                if (cycles === 0) {
                    const pc = this.systemBus.getCPU().getRegisters().PC;
                    console.log(`Breakpoint hit at ${pc.toString(16).toUpperCase().padStart(4, '0')}`);
                    this.pause();
                    return;
                }
                cyclesExecuted += cycles;
                this.stats.totalCycles += cycles;
                this.stats.instructionsExecuted++;
            }
            // Update speed controller
            const chunkTime = performance.now() - chunkStartTime;
            this.speedController.updateActualSpeed(cyclesExecuted, chunkTime);
            // Calculate delay for speed control
            const delay = this.speedController.calculateDelay(cyclesExecuted, chunkTime);
            // Update statistics periodically
            const now = Date.now();
            if (now - this.lastStatsUpdate > 1000) {
                this.updateStats();
                this.lastStatsUpdate = now;
                // Apply optimizations based on profiling data
                if (this.profiler.getMetrics().instructionCount > 10000) {
                    const analysis = this.profiler.getAnalysis();
                    this.optimizer.applyOptimizations(analysis);
                }
            }
            // Schedule next execution with speed control delay
            setTimeout(() => this.scheduleExecution(), delay);
        }
        catch (error) {
            this.state = EmulatorState.ERROR;
            console.error('Execution error:', error);
        }
    }
    /**
     * Calculate cycles per tick based on target clock speed
     */
    calculateCyclesPerTick() {
        this.cyclesPerTick = this.speedController.getCyclesPerChunk();
    }
    /**
     * Update execution statistics
     */
    updateStats() {
        const now = Date.now();
        this.stats.executionTimeMs = now - this.startTime;
        if (this.stats.executionTimeMs > 0) {
            this.stats.averageIPS = (this.stats.instructionsExecuted * 1000) / this.stats.executionTimeMs;
            this.stats.clockSpeed = (this.stats.totalCycles * 1000) / this.stats.executionTimeMs;
        }
    }
    /**
     * Reset execution statistics
     */
    resetStats() {
        this.stats = {
            totalCycles: 0,
            instructionsExecuted: 0,
            executionTimeMs: 0,
            averageIPS: 0,
            clockSpeed: 0
        };
    }
    /**
     * Log system information
     */
    logSystemInfo() {
        console.log('=== System Configuration ===');
        console.log(`CPU: ${this.config.cpu.type} @ ${this.config.cpu.clockSpeed} Hz`);
        console.log(`RAM: ${this.config.memory.ramSize} bytes at $${this.config.memory.ramStart.toString(16).toUpperCase().padStart(4, '0')}`);
        if (this.config.memory.romImages.length > 0) {
            console.log('ROM Images:');
            this.config.memory.romImages.forEach((rom, index) => {
                console.log(`  ${index + 1}. ${rom.file} at $${rom.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${rom.format})`);
            });
        }
        const peripherals = this.systemBus.getPeripheralHub().getPeripherals();
        if (peripherals.length > 0) {
            console.log('Peripherals:');
            peripherals.forEach(p => {
                console.log(`  ${p.name}: $${p.startAddress.toString(16).toUpperCase().padStart(4, '0')}-$${p.endAddress.toString(16).toUpperCase().padStart(4, '0')}`);
            });
        }
        console.log('============================');
    }
    // Getters for accessing system components
    getState() {
        return this.state;
    }
    getStats() {
        if (this.state === EmulatorState.RUNNING) {
            this.updateStats();
        }
        return { ...this.stats };
    }
    getSystemBus() {
        return this.systemBus;
    }
    getConfig() {
        return this.config;
    }
    getMemoryInspector() {
        return this.memoryInspector;
    }
    getDebugInspector() {
        return this.debugInspector;
    }
    getSymbolParser() {
        return this.symbolParser;
    }
    getMemoryLayout() {
        return this.memoryLayout;
    }
    /**
     * Set target clock speed
     */
    setClockSpeed(speed) {
        this.targetClockSpeed = speed;
        this.speedController.setTargetSpeed(speed);
        this.calculateCyclesPerTick();
    }
    /**
     * Enable/disable performance profiling
     */
    enableProfiling(enabled) {
        if (enabled) {
            this.profiler.enable();
        }
        else {
            this.profiler.disable();
        }
    }
    /**
     * Get performance profiler
     */
    getProfiler() {
        return this.profiler;
    }
    /**
     * Get performance optimizer
     */
    getOptimizer() {
        return this.optimizer;
    }
    /**
     * Set adaptive speed control
     */
    setAdaptiveSpeed(enabled) {
        this.speedController.setAdaptiveMode(enabled);
    }
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            emulator: this.getStats(),
            profiler: this.profiler.getMetrics(),
            optimizer: this.optimizer.getStats(),
            analysis: this.profiler.getAnalysis()
        };
    }
    /**
     * Load a new configuration and reinitialize
     */
    async loadConfig(config) {
        this.stop();
        this.config = config;
        await this.initialize();
    }
    /**
     * Load configuration from file and reinitialize
     */
    async loadConfigFromFile(configPath) {
        const config = system_1.SystemConfigLoader.loadFromFile(configPath);
        await this.loadConfig(config);
    }
}
exports.Emulator = Emulator;
//# sourceMappingURL=emulator.js.map