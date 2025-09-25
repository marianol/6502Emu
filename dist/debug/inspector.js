"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugInspectorImpl = void 0;
class DebugInspectorImpl {
    constructor(cpu, memory, interruptController) {
        this.cpu = cpu;
        this.memory = memory;
        this.interruptController = interruptController;
        this.breakpoints = new Set();
        this.tracingEnabled = false;
        this.trace = [];
        this.maxTraceEntries = 1000;
        this.running = false;
        this.stats = {
            totalCycles: 0,
            totalInstructions: 0,
            executionTime: 0,
            averageCyclesPerSecond: 0
        };
        this.startTime = 0;
    }
    setBreakpoint(address) {
        this.breakpoints.add(address & 0xFFFF);
        this.cpu.setBreakpoint(address);
    }
    removeBreakpoint(address) {
        this.breakpoints.delete(address & 0xFFFF);
        this.cpu.removeBreakpoint(address);
    }
    clearAllBreakpoints() {
        for (const addr of this.breakpoints) {
            this.cpu.removeBreakpoint(addr);
        }
        this.breakpoints.clear();
    }
    getBreakpoints() {
        return Array.from(this.breakpoints);
    }
    step() {
        const state = this.cpu.getRegisters();
        const pc = state.PC;
        const opcode = this.memory.read(pc);
        // Record trace entry if tracing is enabled
        if (this.tracingEnabled) {
            this.recordTraceEntry(pc, opcode, state);
        }
        // Execute one instruction
        const cycles = this.cpu.step();
        // Update statistics
        this.stats.totalCycles += cycles;
        this.stats.totalInstructions++;
        // Check if we hit a breakpoint after execution
        const newState = this.cpu.getRegisters();
        const hitBreakpoint = this.breakpoints.has(newState.PC);
        if (hitBreakpoint) {
            this.running = false;
        }
        return hitBreakpoint;
    }
    run() {
        this.running = true;
        this.startTime = Date.now();
        // Run until breakpoint or stop is called
        while (this.running) {
            const hitBreakpoint = this.step();
            if (hitBreakpoint) {
                break;
            }
        }
        this.updateExecutionTime();
    }
    stop() {
        this.running = false;
        this.updateExecutionTime();
    }
    reset() {
        this.running = false;
        this.cpu.reset();
        this.clearTrace();
        this.resetStats();
    }
    enableTracing(enabled) {
        this.tracingEnabled = enabled;
        if (!enabled) {
            this.clearTrace();
        }
    }
    isTracingEnabled() {
        return this.tracingEnabled;
    }
    getTrace() {
        return [...this.trace];
    }
    clearTrace() {
        this.trace = [];
    }
    setMaxTraceEntries(max) {
        this.maxTraceEntries = Math.max(1, max);
        if (this.trace.length > this.maxTraceEntries) {
            this.trace = this.trace.slice(-this.maxTraceEntries);
        }
    }
    getExecutionStats() {
        this.updateExecutionTime();
        return { ...this.stats };
    }
    resetStats() {
        this.stats = {
            totalCycles: 0,
            totalInstructions: 0,
            executionTime: 0,
            averageCyclesPerSecond: 0
        };
        this.startTime = Date.now();
    }
    triggerIRQ() {
        this.interruptController.triggerIRQ('debug');
    }
    triggerNMI() {
        this.interruptController.triggerNMI('debug');
    }
    clearIRQ() {
        this.interruptController.clearIRQ('debug');
    }
    getCPUState() {
        return this.cpu.getRegisters();
    }
    isRunning() {
        return this.running;
    }
    getCurrentAddress() {
        return this.cpu.getRegisters().PC;
    }
    recordTraceEntry(address, opcode, registers) {
        const instruction = this.disassembleInstruction(address, opcode);
        const entry = {
            address,
            opcode,
            instruction,
            cycles: 0, // Will be updated after execution
            timestamp: Date.now(),
            registers: { ...registers }
        };
        this.trace.push(entry);
        // Limit trace size
        if (this.trace.length > this.maxTraceEntries) {
            this.trace.shift();
        }
    }
    disassembleInstruction(address, opcode) {
        // Get instruction length to read operands
        const length = this.getInstructionLength(opcode);
        let operandStr = '';
        if (length > 1) {
            const operand1 = this.memory.read(address + 1);
            if (length === 2) {
                operandStr = `$${operand1.toString(16).padStart(2, '0').toUpperCase()}`;
            }
            else if (length === 3) {
                const operand2 = this.memory.read(address + 2);
                const addr16 = (operand2 << 8) | operand1;
                operandStr = `$${addr16.toString(16).padStart(4, '0').toUpperCase()}`;
            }
        }
        const mnemonic = this.getOpcodeMnemonic(opcode);
        return operandStr ? `${mnemonic.split(' ')[0]} ${operandStr}` : mnemonic;
    }
    updateExecutionTime() {
        if (this.startTime > 0) {
            this.stats.executionTime = Date.now() - this.startTime;
            if (this.stats.executionTime > 0) {
                this.stats.averageCyclesPerSecond = (this.stats.totalCycles / this.stats.executionTime) * 1000;
            }
        }
    }
    getInstructionLength(opcode) {
        // Simplified instruction length lookup - same as in memory-inspector
        const lengths = {
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
    getOpcodeMnemonic(opcode) {
        // Same opcode mapping as in memory-inspector
        const opcodes = {
            0x00: 'BRK',
            0x01: 'ORA ($nn,X)',
            0x05: 'ORA $nn',
            0x06: 'ASL $nn',
            0x08: 'PHP',
            0x09: 'ORA #$nn',
            0x0A: 'ASL A',
            0x0D: 'ORA $nnnn',
            0x0E: 'ASL $nnnn',
            0x10: 'BPL $nn',
            0x11: 'ORA ($nn),Y',
            0x15: 'ORA $nn,X',
            0x16: 'ASL $nn,X',
            0x18: 'CLC',
            0x19: 'ORA $nnnn,Y',
            0x1D: 'ORA $nnnn,X',
            0x1E: 'ASL $nnnn,X',
            0x20: 'JSR $nnnn',
            0x21: 'AND ($nn,X)',
            0x24: 'BIT $nn',
            0x25: 'AND $nn',
            0x26: 'ROL $nn',
            0x28: 'PLP',
            0x29: 'AND #$nn',
            0x2A: 'ROL A',
            0x2C: 'BIT $nnnn',
            0x2D: 'AND $nnnn',
            0x2E: 'ROL $nnnn',
            0x30: 'BMI $nn',
            0x31: 'AND ($nn),Y',
            0x35: 'AND $nn,X',
            0x36: 'ROL $nn,X',
            0x38: 'SEC',
            0x39: 'AND $nnnn,Y',
            0x3D: 'AND $nnnn,X',
            0x3E: 'ROL $nnnn,X',
            0x40: 'RTI',
            0x41: 'EOR ($nn,X)',
            0x45: 'EOR $nn',
            0x46: 'LSR $nn',
            0x48: 'PHA',
            0x49: 'EOR #$nn',
            0x4A: 'LSR A',
            0x4C: 'JMP $nnnn',
            0x4D: 'EOR $nnnn',
            0x4E: 'LSR $nnnn',
            0x50: 'BVC $nn',
            0x51: 'EOR ($nn),Y',
            0x55: 'EOR $nn,X',
            0x56: 'LSR $nn,X',
            0x58: 'CLI',
            0x59: 'EOR $nnnn,Y',
            0x5D: 'EOR $nnnn,X',
            0x5E: 'LSR $nnnn,X',
            0x60: 'RTS',
            0x61: 'ADC ($nn,X)',
            0x65: 'ADC $nn',
            0x66: 'ROR $nn',
            0x68: 'PLA',
            0x69: 'ADC #$nn',
            0x6A: 'ROR A',
            0x6C: 'JMP ($nnnn)',
            0x6D: 'ADC $nnnn',
            0x6E: 'ROR $nnnn',
            0x70: 'BVS $nn',
            0x71: 'ADC ($nn),Y',
            0x75: 'ADC $nn,X',
            0x76: 'ROR $nn,X',
            0x78: 'SEI',
            0x79: 'ADC $nnnn,Y',
            0x7D: 'ADC $nnnn,X',
            0x7E: 'ROR $nnnn,X',
            0x81: 'STA ($nn,X)',
            0x84: 'STY $nn',
            0x85: 'STA $nn',
            0x86: 'STX $nn',
            0x88: 'DEY',
            0x8A: 'TXA',
            0x8C: 'STY $nnnn',
            0x8D: 'STA $nnnn',
            0x8E: 'STX $nnnn',
            0x90: 'BCC $nn',
            0x91: 'STA ($nn),Y',
            0x94: 'STY $nn,X',
            0x95: 'STA $nn,X',
            0x96: 'STX $nn,Y',
            0x98: 'TYA',
            0x99: 'STA $nnnn,Y',
            0x9A: 'TXS',
            0x9D: 'STA $nnnn,X',
            0xA0: 'LDY #$nn',
            0xA1: 'LDA ($nn,X)',
            0xA2: 'LDX #$nn',
            0xA4: 'LDY $nn',
            0xA5: 'LDA $nn',
            0xA6: 'LDX $nn',
            0xA8: 'TAY',
            0xA9: 'LDA #$nn',
            0xAA: 'TAX',
            0xAC: 'LDY $nnnn',
            0xAD: 'LDA $nnnn',
            0xAE: 'LDX $nnnn',
            0xB0: 'BCS $nn',
            0xB1: 'LDA ($nn),Y',
            0xB4: 'LDY $nn,X',
            0xB5: 'LDA $nn,X',
            0xB6: 'LDX $nn,Y',
            0xB8: 'CLV',
            0xB9: 'LDA $nnnn,Y',
            0xBA: 'TSX',
            0xBC: 'LDY $nnnn,X',
            0xBD: 'LDA $nnnn,X',
            0xBE: 'LDX $nnnn,Y',
            0xC0: 'CPY #$nn',
            0xC1: 'CMP ($nn,X)',
            0xC4: 'CPY $nn',
            0xC5: 'CMP $nn',
            0xC6: 'DEC $nn',
            0xC8: 'INY',
            0xC9: 'CMP #$nn',
            0xCA: 'DEX',
            0xCC: 'CPY $nnnn',
            0xCD: 'CMP $nnnn',
            0xCE: 'DEC $nnnn',
            0xD0: 'BNE $nn',
            0xD1: 'CMP ($nn),Y',
            0xD5: 'CMP $nn,X',
            0xD6: 'DEC $nn,X',
            0xD8: 'CLD',
            0xD9: 'CMP $nnnn,Y',
            0xDD: 'CMP $nnnn,X',
            0xDE: 'DEC $nnnn,X',
            0xE0: 'CPX #$nn',
            0xE1: 'SBC ($nn,X)',
            0xE4: 'CPX $nn',
            0xE5: 'SBC $nn',
            0xE6: 'INC $nn',
            0xE8: 'INX',
            0xE9: 'SBC #$nn',
            0xEA: 'NOP',
            0xEC: 'CPX $nnnn',
            0xED: 'SBC $nnnn',
            0xEE: 'INC $nnnn',
            0xF0: 'BEQ $nn',
            0xF1: 'SBC ($nn),Y',
            0xF5: 'SBC $nn,X',
            0xF6: 'INC $nn,X',
            0xF8: 'SED',
            0xF9: 'SBC $nnnn,Y',
            0xFD: 'SBC $nnnn,X',
            0xFE: 'INC $nnnn,X'
        };
        return opcodes[opcode] || `??? ($${opcode.toString(16).padStart(2, '0').toUpperCase()})`;
    }
}
exports.DebugInspectorImpl = DebugInspectorImpl;
//# sourceMappingURL=inspector.js.map