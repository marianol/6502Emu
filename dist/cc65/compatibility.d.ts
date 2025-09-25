/**
 * CC65 Compatibility Manager
 * Integrates symbol parsing and memory layout for CC65 toolchain compatibility
 */
import { CC65SymbolTable, CC65Symbol } from './symbol-parser';
import { CC65MemoryLayout, CC65Runtime } from './memory-layout';
export interface CC65Config {
    symbolFile?: string;
    memoryLayout: 'apple2' | 'c64' | 'homebrew' | 'custom';
    customLayout?: {
        ramStart: number;
        ramSize: number;
        romStart: number;
        romSize: number;
        stackStart?: number;
        stackSize?: number;
    };
    startupAddress?: number;
}
export interface CC65DebugInfo {
    symbols: CC65SymbolTable;
    layout: CC65MemoryLayout;
    runtime: CC65Runtime;
}
export declare class CC65CompatibilityManager {
    private symbolParser;
    private symbols?;
    private layout?;
    private runtime?;
    constructor();
    /**
     * Initialize CC65 compatibility with configuration
     */
    initialize(config: CC65Config): Promise<CC65DebugInfo>;
    /**
     * Load CC65 symbol file
     */
    loadSymbolFile(filePath: string): Promise<void>;
    /**
     * Create memory layout based on configuration
     */
    private createMemoryLayout;
    /**
     * Placeholder for reading symbol file content
     * In a real implementation, this would use fs.readFile or similar
     */
    private readSymbolFile;
    /**
     * Get symbol by name
     */
    getSymbol(name: string): CC65Symbol | undefined;
    /**
     * Get symbol by address
     */
    getSymbolAtAddress(address: number): CC65Symbol | undefined;
    /**
     * Get address for symbol name
     */
    getSymbolAddress(name: string): number | undefined;
    /**
     * Check if address is in writable memory according to CC65 layout
     */
    isWritableAddress(address: number): boolean;
    /**
     * Get memory segment information for address
     */
    getMemorySegment(address: number): import("./memory-layout").CC65MemorySegment | undefined;
    /**
     * Get zero page allocation information
     */
    getZeroPageInfo(): {
        start: number;
        size: number;
        available: number;
    } | undefined;
    /**
     * Generate disassembly with symbol names
     */
    disassembleWithSymbols(address: number, instruction: string): string;
    /**
     * Find symbols matching pattern
     */
    findSymbols(pattern: string): CC65Symbol[];
    /**
     * Get all symbols for a source file
     */
    getFileSymbols(filename: string): CC65Symbol[];
    /**
     * Validate current configuration
     */
    validateConfiguration(): string[];
    /**
     * Generate CC65 linker configuration
     */
    generateLinkerConfig(): string;
    /**
     * Get startup sequence for CC65 programs
     */
    getStartupSequence(): number[];
    /**
     * Get current memory layout
     */
    getMemoryLayout(): CC65MemoryLayout | undefined;
    /**
     * Get symbol statistics
     */
    getSymbolStats(): {
        total: number;
        byType: Record<string, number>;
        byFile: Record<string, number>;
    };
}
//# sourceMappingURL=compatibility.d.ts.map