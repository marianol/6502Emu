import { CPU6502, CPUState } from '../core/cpu';
import { MemoryManager } from '../core/memory';
import { InterruptController } from '../core/interrupt-controller';
export interface TraceEntry {
    address: number;
    opcode: number;
    instruction: string;
    cycles: number;
    timestamp: number;
    registers: CPUState;
}
export interface ExecutionStats {
    totalCycles: number;
    totalInstructions: number;
    executionTime: number;
    averageCyclesPerSecond: number;
}
export interface DebugInspector {
    setBreakpoint(address: number): void;
    removeBreakpoint(address: number): void;
    clearAllBreakpoints(): void;
    getBreakpoints(): number[];
    step(): boolean;
    run(): void;
    stop(): void;
    reset(): void;
    enableTracing(enabled: boolean): void;
    isTracingEnabled(): boolean;
    getTrace(): TraceEntry[];
    clearTrace(): void;
    setMaxTraceEntries(max: number): void;
    getExecutionStats(): ExecutionStats;
    resetStats(): void;
    triggerIRQ(): void;
    triggerNMI(): void;
    clearIRQ(): void;
    getCPUState(): CPUState;
    isRunning(): boolean;
    getCurrentAddress(): number;
}
export declare class DebugInspectorImpl implements DebugInspector {
    private cpu;
    private memory;
    private interruptController;
    private breakpoints;
    private tracingEnabled;
    private trace;
    private maxTraceEntries;
    private running;
    private stats;
    private startTime;
    constructor(cpu: CPU6502, memory: MemoryManager, interruptController: InterruptController);
    setBreakpoint(address: number): void;
    removeBreakpoint(address: number): void;
    clearAllBreakpoints(): void;
    getBreakpoints(): number[];
    step(): boolean;
    run(): void;
    stop(): void;
    reset(): void;
    enableTracing(enabled: boolean): void;
    isTracingEnabled(): boolean;
    getTrace(): TraceEntry[];
    clearTrace(): void;
    setMaxTraceEntries(max: number): void;
    getExecutionStats(): ExecutionStats;
    resetStats(): void;
    triggerIRQ(): void;
    triggerNMI(): void;
    clearIRQ(): void;
    getCPUState(): CPUState;
    isRunning(): boolean;
    getCurrentAddress(): number;
    private recordTraceEntry;
    private disassembleInstruction;
    private updateExecutionTime;
    private getInstructionLength;
    private getOpcodeMnemonic;
}
//# sourceMappingURL=inspector.d.ts.map