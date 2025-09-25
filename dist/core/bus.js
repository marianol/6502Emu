"use strict";
/**
 * System bus that coordinates CPU, memory, and peripherals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemBus = void 0;
const cpu_1 = require("./cpu");
const memory_1 = require("./memory");
const base_1 = require("../peripherals/base");
const interrupt_controller_1 = require("./interrupt-controller");
/**
 * System bus coordinates all major components
 */
class SystemBus {
    constructor() {
        this.cpu = new cpu_1.CPU6502Emulator();
        this.memory = new memory_1.MemoryManager();
        this.peripheralHub = new base_1.PeripheralHub();
        this.interruptController = new interrupt_controller_1.InterruptController();
        this.setupConnections();
    }
    /**
     * Set up connections between components
     */
    setupConnections() {
        // Connect CPU to interrupt controller
        this.cpu.setInterruptController(this.interruptController);
        // Set up memory callbacks for CPU
        this.cpu.setMemoryCallbacks((address) => this.handleMemoryRead(address), (address, value) => this.handleMemoryWrite(address, value));
    }
    /**
     * Handle memory read operations
     * Routes to memory manager or peripheral hub based on address
     */
    handleMemoryRead(address) {
        if (this.peripheralHub.isPeripheralAddress(address)) {
            return this.peripheralHub.read(address);
        }
        return this.memory.read(address);
    }
    /**
     * Handle memory write operations
     * Routes to memory manager or peripheral hub based on address
     */
    handleMemoryWrite(address, value) {
        if (this.peripheralHub.isPeripheralAddress(address)) {
            this.peripheralHub.write(address, value);
        }
        else {
            this.memory.write(address, value);
        }
    }
    /**
     * Execute one CPU instruction and update system state
     * @returns Number of cycles consumed
     */
    step() {
        const cycles = this.cpu.step();
        // Update peripherals
        this.peripheralHub.tick(cycles);
        // Update interrupt controller with peripheral interrupt sources
        const interruptSources = this.peripheralHub.getInterruptSources();
        this.interruptController.updateFromPeripherals(interruptSources);
        return cycles;
    }
    /**
     * Reset the entire system
     */
    reset() {
        this.cpu.reset();
        this.memory.resetRAM();
        this.peripheralHub.reset();
        this.interruptController.reset();
    }
    /**
     * Get access to system components for configuration
     */
    getCPU() {
        return this.cpu;
    }
    getMemory() {
        return this.memory;
    }
    getPeripheralHub() {
        return this.peripheralHub;
    }
    getInterruptController() {
        return this.interruptController;
    }
}
exports.SystemBus = SystemBus;
//# sourceMappingURL=bus.js.map