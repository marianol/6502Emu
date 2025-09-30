"use strict";
/**
 * CPU emulator integration layer
 * Wraps the fake6502 emulator with a TypeScript interface
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPU6502Emulator = void 0;
// Import the native addon
let nativeAddon;
try {
    nativeAddon = require('../../build/Release/fake6502_addon.node');
    console.log('Native addon loaded successfully');
}
catch (error) {
    console.warn('Native addon not available, using fallback implementation:', error instanceof Error ? error.message : String(error));
    nativeAddon = null;
}
/**
 * Implementation of CPU6502 interface using fake6502 emulator
 * This class wraps the native addon that contains the fake6502 C code
 */
class CPU6502Emulator {
    constructor() {
        this.cpuType = '6502';
        this.breakpoints = new Set();
        // Fallback state for when native addon is not available
        this.fallbackState = {
            A: 0,
            X: 0,
            Y: 0,
            PC: 0,
            SP: 0xFF,
            P: 0x20, // Interrupt disable flag set by default
            cycles: 0
        };
        this.useNativeAddon = nativeAddon !== null;
        // Default memory callbacks that do nothing
        this.memoryRead = () => 0xFF;
        this.memoryWrite = () => { };
        if (this.useNativeAddon) {
            // Set up memory callbacks for native addon
            nativeAddon.setMemoryCallbacks((address) => this.memoryRead(address), (address, value) => this.memoryWrite(address, value));
        }
        this.reset();
    }
    reset() {
        // Always read reset vector from our memory system
        let resetPC = 0x0000; // Default to 0 if no reset vector
        try {
            resetPC = this.readWord(0xFFFC); // Try to read reset vector
            console.log(`Reset vector read: 0x${resetPC.toString(16).padStart(4, '0')}`);
        }
        catch (error) {
            // If memory read fails, use default
            console.warn('Failed to read reset vector, using default PC=0x0000');
            resetPC = 0x0000;
        }
        if (this.useNativeAddon) {
            // Reset native addon and then set PC to reset vector
            nativeAddon.reset();
            // Set the PC to the reset vector we read from memory
            const currentState = nativeAddon.getState();
            nativeAddon.setState({
                ...currentState,
                pc: resetPC
            });
        }
        else {
            // Fallback implementation
            this.fallbackState = {
                A: 0,
                X: 0,
                Y: 0,
                PC: resetPC,
                SP: 0xFF,
                P: 0x20, // Interrupt disable flag set
                cycles: 0
            };
        }
    }
    step() {
        if (this.useNativeAddon) {
            // Check for breakpoints
            const currentState = this.getRegisters();
            if (this.breakpoints.has(currentState.PC)) {
                return 0; // Execution halted at breakpoint
            }
            // Execute one instruction using native addon
            return nativeAddon.step();
        }
        else {
            // Fallback implementation
            // Check for breakpoints
            if (this.breakpoints.has(this.fallbackState.PC)) {
                return 0; // Execution halted at breakpoint
            }
            // Fetch and execute instruction
            const opcode = this.memoryRead(this.fallbackState.PC);
            const cycles = this.executeInstruction(opcode);
            this.fallbackState.cycles += cycles;
            return cycles;
        }
    }
    getRegisters() {
        if (this.useNativeAddon) {
            const nativeState = nativeAddon.getState();
            return {
                A: nativeState.a,
                X: nativeState.x,
                Y: nativeState.y,
                PC: nativeState.pc,
                SP: nativeState.sp,
                P: nativeState.status,
                cycles: nativeState.cycles
            };
        }
        else {
            return { ...this.fallbackState };
        }
    }
    setRegisters(newState) {
        if (this.useNativeAddon) {
            const currentState = nativeAddon.getState();
            const updatedState = {
                pc: newState.PC !== undefined ? newState.PC : currentState.pc,
                sp: newState.SP !== undefined ? newState.SP : currentState.sp,
                a: newState.A !== undefined ? newState.A : currentState.a,
                x: newState.X !== undefined ? newState.X : currentState.x,
                y: newState.Y !== undefined ? newState.Y : currentState.y,
                status: newState.P !== undefined ? newState.P : currentState.status,
                cycles: newState.cycles !== undefined ? newState.cycles : currentState.cycles
            };
            nativeAddon.setState(updatedState);
        }
        else {
            this.fallbackState = { ...this.fallbackState, ...newState };
        }
    }
    setBreakpoint(address) {
        this.breakpoints.add(address & 0xFFFF);
    }
    removeBreakpoint(address) {
        this.breakpoints.delete(address & 0xFFFF);
    }
    clearBreakpoints() {
        this.breakpoints.clear();
    }
    hasBreakpoint(address) {
        return this.breakpoints.has(address & 0xFFFF);
    }
    setCPUType(type) {
        this.cpuType = type;
    }
    getCPUType() {
        return this.cpuType;
    }
    triggerIRQ() {
        if (this.useNativeAddon) {
            nativeAddon.triggerIRQ();
        }
        // Fallback implementation would need interrupt handling
    }
    triggerNMI() {
        if (this.useNativeAddon) {
            nativeAddon.triggerNMI();
        }
        // Fallback implementation would need interrupt handling
    }
    clearIRQ() {
        if (this.useNativeAddon) {
            nativeAddon.clearIRQ();
        }
        // Fallback implementation would need interrupt handling
    }
    isIRQPending() {
        if (this.useNativeAddon) {
            return nativeAddon.isIRQPending();
        }
        return false; // Fallback
    }
    isNMIPending() {
        if (this.useNativeAddon) {
            return nativeAddon.isNMIPending();
        }
        return false; // Fallback
    }
    setMemoryCallbacks(read, write) {
        this.memoryRead = read;
        this.memoryWrite = write;
        if (this.useNativeAddon) {
            // Update native addon callbacks
            nativeAddon.setMemoryCallbacks((address) => this.memoryRead(address), (address, value) => this.memoryWrite(address, value));
        }
    }
    setInterruptController(controller) {
        this.interruptController = controller;
        // Set up interrupt controller callbacks to trigger CPU interrupts
        controller.setCallbacks(() => this.triggerIRQ(), () => this.triggerNMI());
    }
    // Helper methods
    readWord(address) {
        const low = this.memoryRead(address);
        const high = this.memoryRead((address + 1) & 0xFFFF);
        const result = low | (high << 8);
        return result;
    }
    pushByte(value) {
        this.memoryWrite(0x0100 | this.fallbackState.SP, value);
        this.fallbackState.SP = (this.fallbackState.SP - 1) & 0xFF;
    }
    pullByte() {
        this.fallbackState.SP = (this.fallbackState.SP + 1) & 0xFF;
        return this.memoryRead(0x0100 | this.fallbackState.SP);
    }
    handleNMI() {
        // Fallback NMI handling
        // Push PC and status register
        this.pushByte((this.fallbackState.PC >> 8) & 0xFF);
        this.pushByte(this.fallbackState.PC & 0xFF);
        this.pushByte(this.fallbackState.P);
        // Set interrupt disable flag
        this.fallbackState.P |= 0x04;
        // Jump to NMI vector
        this.fallbackState.PC = this.readWord(0xFFFA);
    }
    handleIRQ() {
        // Fallback IRQ handling
        // Push PC and status register
        this.pushByte((this.fallbackState.PC >> 8) & 0xFF);
        this.pushByte(this.fallbackState.PC & 0xFF);
        this.pushByte(this.fallbackState.P);
        // Set interrupt disable flag
        this.fallbackState.P |= 0x04;
        // Jump to IRQ vector
        this.fallbackState.PC = this.readWord(0xFFFE);
    }
    executeInstruction(opcode) {
        // Fallback instruction execution for when native addon is not available
        const startPC = this.fallbackState.PC;
        switch (opcode) {
            case 0x00: // BRK
                this.fallbackState.PC = (this.fallbackState.PC + 2) & 0xFFFF;
                this.handleIRQ();
                return 7;
            case 0x4C: // JMP absolute
                this.fallbackState.PC = this.readWord(this.fallbackState.PC + 1);
                return 3;
            case 0x6C: // JMP indirect
                {
                    const addr = this.readWord(this.fallbackState.PC + 1);
                    // Handle page boundary bug in original 6502
                    if ((addr & 0xFF) === 0xFF) {
                        const low = this.memoryRead(addr);
                        const high = this.memoryRead(addr & 0xFF00);
                        this.fallbackState.PC = low | (high << 8);
                    }
                    else {
                        this.fallbackState.PC = this.readWord(addr);
                    }
                    return 5;
                }
            case 0xA9: // LDA immediate
                this.fallbackState.A = this.memoryRead(this.fallbackState.PC + 1);
                this.fallbackState.PC = (this.fallbackState.PC + 2) & 0xFFFF;
                this.setZeroNegativeFlags(this.fallbackState.A);
                return 2;
            case 0xA5: // LDA zero page
                {
                    const addr = this.memoryRead(this.fallbackState.PC + 1);
                    this.fallbackState.A = this.memoryRead(addr);
                    this.fallbackState.PC = (this.fallbackState.PC + 2) & 0xFFFF;
                    this.setZeroNegativeFlags(this.fallbackState.A);
                    return 3;
                }
            case 0xAD: // LDA absolute
                {
                    const addr = this.readWord(this.fallbackState.PC + 1);
                    this.fallbackState.A = this.memoryRead(addr);
                    this.fallbackState.PC = (this.fallbackState.PC + 3) & 0xFFFF;
                    this.setZeroNegativeFlags(this.fallbackState.A);
                    return 4;
                }
            case 0x85: // STA zero page
                {
                    const addr = this.memoryRead(this.fallbackState.PC + 1);
                    this.memoryWrite(addr, this.fallbackState.A);
                    this.fallbackState.PC = (this.fallbackState.PC + 2) & 0xFFFF;
                    return 3;
                }
            case 0x8D: // STA absolute
                {
                    const addr = this.readWord(this.fallbackState.PC + 1);
                    this.memoryWrite(addr, this.fallbackState.A);
                    this.fallbackState.PC = (this.fallbackState.PC + 3) & 0xFFFF;
                    return 4;
                }
            case 0xEA: // NOP
                this.fallbackState.PC = (this.fallbackState.PC + 1) & 0xFFFF;
                return 2;
            case 0x40: // RTI
                this.fallbackState.P = this.pullByte();
                this.fallbackState.PC = this.pullByte();
                this.fallbackState.PC |= (this.pullByte() << 8);
                return 6;
            default:
                // Unknown opcode - advance PC and return minimum cycles
                console.warn(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')} at PC: 0x${startPC.toString(16).padStart(4, '0')}`);
                this.fallbackState.PC = (this.fallbackState.PC + 1) & 0xFFFF;
                return 2;
        }
    }
    setZeroNegativeFlags(value) {
        this.fallbackState.P &= ~(0x02 | 0x80); // Clear zero and negative flags
        if (value === 0) {
            this.fallbackState.P |= 0x02; // Set zero flag
        }
        if (value & 0x80) {
            this.fallbackState.P |= 0x80; // Set negative flag
        }
    }
}
exports.CPU6502Emulator = CPU6502Emulator;
//# sourceMappingURL=cpu.js.map