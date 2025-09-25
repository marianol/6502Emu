import { ROMImage } from './memory';
export interface LoadedROM {
    data: Uint8Array;
    loadAddress: number;
    entryPoint?: number;
}
export declare class ROMLoader {
    static loadROM(romImage: ROMImage): Promise<LoadedROM>;
    private static loadBinary;
    private static loadIntelHex;
    private static parseIntelHexRecord;
    private static loadMotorolaS;
    private static parseSRecord;
    static validateROMFile(filePath: string, format: 'binary' | 'ihex' | 'srec'): Promise<boolean>;
    private static validateIntelHex;
    private static validateSRecord;
}
//# sourceMappingURL=rom-loader.d.ts.map