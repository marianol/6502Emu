import { MemoryManager } from '../core/memory';
export interface MemoryInspector {
    readRange(startAddr: number, length: number): Uint8Array;
    writeRange(startAddr: number, data: Uint8Array): void;
    searchMemory(pattern: Uint8Array): number[];
    compareMemory(addr1: number, addr2: number, length: number): boolean;
    dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string;
}
export declare class MemoryInspectorImpl implements MemoryInspector {
    private memoryManager;
    constructor(memoryManager: MemoryManager);
    readRange(startAddr: number, length: number): Uint8Array;
    writeRange(startAddr: number, data: Uint8Array): void;
    searchMemory(pattern: Uint8Array): number[];
    compareMemory(addr1: number, addr2: number, length: number): boolean;
    dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string;
    private dumpHex;
    private dumpAscii;
    private dumpDisassembly;
    private disassembleInstruction;
    private formatInstruction;
    private calculateBranchTarget;
    private getOpcodeMnemonic;
    private getInstructionLength;
}
//# sourceMappingURL=memory-inspector.d.ts.map