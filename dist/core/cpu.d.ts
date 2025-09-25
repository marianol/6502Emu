/**
 * CPU emulator integration layer
 * Wraps the fake6502 emulator with a TypeScript interface
 */
import { InterruptController } from './interrupt-controller';
export interface CPUState {
    A: number;
    X: number;
    Y: number;
    PC: number;
    SP: number;
    P: number;
    cycles: number;
}
export type CPUType = '6502' | '65C02';
export type MemoryReadCallback = (address: number) => number;
export type MemoryWriteCallback = (address: number, value: number) => void;
export interface CPU6502 {
    reset(): void;
    step(): number;
    getRegisters(): CPUState;
    setRegisters(state: Partial<CPUState>): void;
    setBreakpoint(address: number): void;
    removeBreakpoint(address: number): void;
    clearBreakpoints(): void;
    hasBreakpoint(address: number): boolean;
    setCPUType(type: CPUType): void;
    getCPUType(): CPUType;
    triggerIRQ(): void;
    triggerNMI(): void;
    clearIRQ(): void;
    isIRQPending(): boolean;
    isNMIPending(): boolean;
    setInterruptController(controller: InterruptController): void;
    setMemoryCallbacks(read: MemoryReadCallback, write: MemoryWriteCallback): void;
}
/**
 * Implementation of CPU6502 interface using fake6502 emulator
 * This class wraps the native addon that contains the fake6502 C code
 */
export declare class CPU6502Emulator implements CPU6502 {
    private cpuType;
    private breakpoints;
    private memoryRead;
    private memoryWrite;
    private useNativeAddon;
    private interruptController?;
    private fallbackState;
    constructor();
    reset(): void;
    step(): number;
    getRegisters(): CPUState;
    setRegisters(newState: Partial<CPUState>): void;
    setBreakpoint(address: number): void;
    removeBreakpoint(address: number): void;
    clearBreakpoints(): void;
    hasBreakpoint(address: number): boolean;
    setCPUType(type: CPUType): void;
    getCPUType(): CPUType;
    triggerIRQ(): void;
    triggerNMI(): void;
    clearIRQ(): void;
    isIRQPending(): boolean;
    isNMIPending(): boolean;
    setMemoryCallbacks(read: MemoryReadCallback, write: MemoryWriteCallback): void;
    setInterruptController(controller: InterruptController): void;
    private readWord;
    private pushByte;
    private pullByte;
    private handleNMI;
    private handleIRQ;
    private executeInstruction;
}
//# sourceMappingURL=cpu.d.ts.map