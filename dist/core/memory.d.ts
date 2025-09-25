import { LoadedROM } from './rom-loader';
export interface MemoryHandler {
    read(address: number): number;
    write(address: number, value: number): void;
}
export interface Peripheral {
    read(offset: number): number;
    write(offset: number, value: number): void;
    reset(): void;
    tick(cycles: number): void;
    getInterruptStatus(): boolean;
}
export interface MemoryRegion {
    start: number;
    end: number;
    type: 'RAM' | 'ROM' | 'IO';
    handler: MemoryHandler;
}
export interface ROMImage {
    file: string;
    loadAddress: number;
    format: 'binary' | 'ihex' | 'srec';
}
export declare class MemoryManager {
    private regions;
    private ramHandler;
    constructor();
    configureRAM(startAddress: number, size: number): void;
    loadROM(data: Uint8Array, startAddress: number): void;
    loadROMFromFile(romImage: ROMImage): Promise<LoadedROM>;
    loadMultipleROMs(romImages: ROMImage[]): Promise<LoadedROM[]>;
    mapPeripheral(startAddr: number, endAddr: number, peripheral: Peripheral): void;
    read(address: number): number;
    write(address: number, value: number): void;
    getMemoryMap(): MemoryRegion[];
    clear(): void;
    resetRAM(): void;
    getPeripherals(): Peripheral[];
    private findRegion;
    private sortRegions;
    validateMemoryMap(): string[];
}
//# sourceMappingURL=memory.d.ts.map