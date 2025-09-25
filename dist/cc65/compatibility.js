"use strict";
/**
 * CC65 Compatibility Manager
 * Integrates symbol parsing and memory layout for CC65 toolchain compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CC65CompatibilityManager = void 0;
const symbol_parser_1 = require("./symbol-parser");
const memory_layout_1 = require("./memory-layout");
class CC65CompatibilityManager {
    constructor() {
        this.symbolParser = new symbol_parser_1.CC65SymbolParser();
    }
    /**
     * Initialize CC65 compatibility with configuration
     */
    async initialize(config) {
        // Set up memory layout
        this.layout = this.createMemoryLayout(config);
        // Initialize runtime
        this.runtime = new memory_layout_1.CC65Runtime(this.layout, config.startupAddress);
        // Load symbols if provided
        if (config.symbolFile) {
            await this.loadSymbolFile(config.symbolFile);
        }
        return {
            symbols: this.symbols || { symbols: new Map(), addressToSymbol: new Map(), fileSymbols: new Map() },
            layout: this.layout,
            runtime: this.runtime
        };
    }
    /**
     * Load CC65 symbol file
     */
    async loadSymbolFile(filePath) {
        try {
            // In a real implementation, this would read from the file system
            // For now, we'll simulate with a placeholder
            const content = await this.readSymbolFile(filePath);
            this.symbols = this.symbolParser.parseSymbolFile(content);
        }
        catch (error) {
            throw new Error(`Failed to load symbol file ${filePath}: ${error}`);
        }
    }
    /**
     * Create memory layout based on configuration
     */
    createMemoryLayout(config) {
        switch (config.memoryLayout) {
            case 'apple2':
                return memory_layout_1.CC65MemoryConfigurator.getApple2Layout();
            case 'c64':
                return memory_layout_1.CC65MemoryConfigurator.getC64Layout();
            case 'homebrew':
                return memory_layout_1.CC65MemoryConfigurator.getHomebrewLayout();
            case 'custom':
                if (!config.customLayout) {
                    throw new Error('Custom layout configuration required');
                }
                return memory_layout_1.CC65MemoryConfigurator.createCustomLayout(config.customLayout);
            default:
                throw new Error(`Unknown memory layout: ${config.memoryLayout}`);
        }
    }
    /**
     * Placeholder for reading symbol file content
     * In a real implementation, this would use fs.readFile or similar
     */
    async readSymbolFile(filePath) {
        // This is a placeholder - in real implementation would read from file system
        return Promise.resolve('');
    }
    /**
     * Get symbol by name
     */
    getSymbol(name) {
        return this.symbols?.symbols.get(name);
    }
    /**
     * Get symbol by address
     */
    getSymbolAtAddress(address) {
        return this.symbols?.addressToSymbol.get(address);
    }
    /**
     * Get address for symbol name
     */
    getSymbolAddress(name) {
        return this.symbols?.symbols.get(name)?.address;
    }
    /**
     * Check if address is in writable memory according to CC65 layout
     */
    isWritableAddress(address) {
        return this.runtime?.isWritableAddress(address) || false;
    }
    /**
     * Get memory segment information for address
     */
    getMemorySegment(address) {
        return this.runtime?.getSegmentForAddress(address);
    }
    /**
     * Get zero page allocation information
     */
    getZeroPageInfo() {
        return this.runtime?.getZeroPageInfo();
    }
    /**
     * Generate disassembly with symbol names
     */
    disassembleWithSymbols(address, instruction) {
        if (!this.symbols) {
            return instruction;
        }
        // Look for addresses in the instruction that might be symbols
        const addressPattern = /\$([0-9A-Fa-f]{4})/g;
        let result = instruction;
        let match;
        while ((match = addressPattern.exec(instruction)) !== null) {
            const addr = parseInt(match[1], 16);
            const symbol = this.symbols.addressToSymbol.get(addr);
            if (symbol) {
                result = result.replace(match[0], symbol.name);
            }
        }
        // Add symbol name if this address has one
        const symbol = this.symbols.addressToSymbol.get(address);
        if (symbol) {
            result = `${symbol.name}: ${result}`;
        }
        return result;
    }
    /**
     * Find symbols matching pattern
     */
    findSymbols(pattern) {
        if (!this.symbols) {
            return [];
        }
        const regex = new RegExp(pattern, 'i');
        return this.symbolParser.findSymbols(regex);
    }
    /**
     * Get all symbols for a source file
     */
    getFileSymbols(filename) {
        if (!this.symbols) {
            return [];
        }
        return this.symbolParser.getSymbolsForFile(filename);
    }
    /**
     * Validate current configuration
     */
    validateConfiguration() {
        const errors = [];
        if (!this.layout) {
            errors.push('No memory layout configured');
            return errors;
        }
        // Validate memory layout
        const layoutErrors = memory_layout_1.CC65MemoryConfigurator.validateLayout(this.layout);
        errors.push(...layoutErrors);
        return errors;
    }
    /**
     * Generate CC65 linker configuration
     */
    generateLinkerConfig() {
        if (!this.runtime) {
            throw new Error('Runtime not initialized');
        }
        return this.runtime.generateLinkerConfig();
    }
    /**
     * Get startup sequence for CC65 programs
     */
    getStartupSequence() {
        if (!this.runtime) {
            throw new Error('Runtime not initialized');
        }
        return this.runtime.getStartupSequence();
    }
    /**
     * Get current memory layout
     */
    getMemoryLayout() {
        return this.layout;
    }
    /**
     * Get symbol statistics
     */
    getSymbolStats() {
        if (!this.symbols) {
            return { total: 0, byType: {}, byFile: {} };
        }
        const stats = {
            total: this.symbols.symbols.size,
            byType: {},
            byFile: {}
        };
        for (const symbol of this.symbols.symbols.values()) {
            stats.byType[symbol.type] = (stats.byType[symbol.type] || 0) + 1;
            if (symbol.file) {
                stats.byFile[symbol.file] = (stats.byFile[symbol.file] || 0) + 1;
            }
        }
        return stats;
    }
}
exports.CC65CompatibilityManager = CC65CompatibilityManager;
//# sourceMappingURL=compatibility.js.map