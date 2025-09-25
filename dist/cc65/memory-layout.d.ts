/**
 * CC65 Memory Layout Support
 * Provides standard CC65 memory configurations and runtime compatibility
 */
export interface CC65MemorySegment {
    name: string;
    start: number;
    size: number;
    type: 'zp' | 'ram' | 'rom' | 'bss' | 'data' | 'code' | 'rodata';
    writable: boolean;
}
export interface CC65MemoryLayout {
    segments: CC65MemorySegment[];
    stackStart: number;
    stackSize: number;
    heapStart?: number;
    heapSize?: number;
}
export interface CC65RuntimeConfig {
    layout: CC65MemoryLayout;
    startupCode: number;
    resetVector: number;
    irqVector?: number;
    nmiVector?: number;
}
/**
 * Standard CC65 memory configurations for common 6502 systems
 */
export declare class CC65MemoryConfigurator {
    /**
     * Get standard Apple II memory layout
     */
    static getApple2Layout(): CC65MemoryLayout;
    /**
     * Get standard Commodore 64 memory layout
     */
    static getC64Layout(): CC65MemoryLayout;
    /**
     * Get generic homebrew computer layout
     */
    static getHomebrewLayout(): CC65MemoryLayout;
    /**
     * Create custom layout from configuration
     */
    static createCustomLayout(config: {
        ramStart: number;
        ramSize: number;
        romStart: number;
        romSize: number;
        stackStart?: number;
        stackSize?: number;
    }): CC65MemoryLayout;
    /**
     * Validate memory layout for CC65 compatibility
     */
    static validateLayout(layout: CC65MemoryLayout): string[];
}
/**
 * CC65 Runtime Library Compatibility
 */
export declare class CC65Runtime {
    private layout;
    private startupAddress;
    constructor(layout: CC65MemoryLayout, startupAddress?: number);
    /**
     * Get startup sequence for CC65 programs
     */
    getStartupSequence(): number[];
    /**
     * Check if address is in writable memory
     */
    isWritableAddress(address: number): boolean;
    /**
     * Get segment containing address
     */
    getSegmentForAddress(address: number): CC65MemorySegment | undefined;
    /**
     * Get zero page allocation info
     */
    getZeroPageInfo(): {
        start: number;
        size: number;
        available: number;
    };
    /**
     * Generate memory configuration for CC65 linker
     */
    generateLinkerConfig(): string;
}
//# sourceMappingURL=memory-layout.d.ts.map