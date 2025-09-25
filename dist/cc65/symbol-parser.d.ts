/**
 * CC65 Symbol File Parser
 * Parses CC65 debug symbol files for source-level debugging support
 */
export interface CC65Symbol {
    name: string;
    address: number;
    type: 'label' | 'equate' | 'import' | 'export';
    scope?: string;
    file?: string;
    line?: number;
}
export interface CC65SymbolTable {
    symbols: Map<string, CC65Symbol>;
    addressToSymbol: Map<number, CC65Symbol>;
    fileSymbols: Map<string, CC65Symbol[]>;
}
export declare class CC65SymbolParser {
    private symbols;
    private addressToSymbol;
    private fileSymbols;
    /**
     * Parse CC65 symbol file content
     * Format: name=value type [scope] [file:line]
     */
    parseSymbolFile(content: string): CC65SymbolTable;
    private parseSymbolLine;
    private parseSymbolType;
    private addSymbol;
    /**
     * Look up symbol by name
     */
    getSymbolByName(name: string): CC65Symbol | undefined;
    /**
     * Look up symbol by address
     */
    getSymbolByAddress(address: number): CC65Symbol | undefined;
    /**
     * Get all symbols for a specific file
     */
    getSymbolsForFile(filename: string): CC65Symbol[];
    /**
     * Get address for symbol name
     */
    getAddressForSymbol(name: string): number | undefined;
    /**
     * Get all symbols
     */
    getAllSymbols(): CC65Symbol[];
    /**
     * Find symbols matching a pattern
     */
    findSymbols(pattern: RegExp): CC65Symbol[];
}
//# sourceMappingURL=symbol-parser.d.ts.map