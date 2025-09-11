/**
 * CC65 Compatibility Manager
 * Integrates symbol parsing and memory layout for CC65 toolchain compatibility
 */

import { CC65SymbolParser, CC65SymbolTable, CC65Symbol } from './symbol-parser';
import { CC65MemoryConfigurator, CC65MemoryLayout, CC65Runtime } from './memory-layout';

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

export class CC65CompatibilityManager {
  private symbolParser: CC65SymbolParser;
  private symbols?: CC65SymbolTable;
  private layout?: CC65MemoryLayout;
  private runtime?: CC65Runtime;

  constructor() {
    this.symbolParser = new CC65SymbolParser();
  }

  /**
   * Initialize CC65 compatibility with configuration
   */
  async initialize(config: CC65Config): Promise<CC65DebugInfo> {
    // Set up memory layout
    this.layout = this.createMemoryLayout(config);
    
    // Initialize runtime
    this.runtime = new CC65Runtime(this.layout, config.startupAddress);

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
  async loadSymbolFile(filePath: string): Promise<void> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll simulate with a placeholder
      const content = await this.readSymbolFile(filePath);
      this.symbols = this.symbolParser.parseSymbolFile(content);
    } catch (error) {
      throw new Error(`Failed to load symbol file ${filePath}: ${error}`);
    }
  }

  /**
   * Create memory layout based on configuration
   */
  private createMemoryLayout(config: CC65Config): CC65MemoryLayout {
    switch (config.memoryLayout) {
      case 'apple2':
        return CC65MemoryConfigurator.getApple2Layout();
      case 'c64':
        return CC65MemoryConfigurator.getC64Layout();
      case 'homebrew':
        return CC65MemoryConfigurator.getHomebrewLayout();
      case 'custom':
        if (!config.customLayout) {
          throw new Error('Custom layout configuration required');
        }
        return CC65MemoryConfigurator.createCustomLayout(config.customLayout);
      default:
        throw new Error(`Unknown memory layout: ${config.memoryLayout}`);
    }
  }

  /**
   * Placeholder for reading symbol file content
   * In a real implementation, this would use fs.readFile or similar
   */
  private async readSymbolFile(filePath: string): Promise<string> {
    // This is a placeholder - in real implementation would read from file system
    return Promise.resolve('');
  }

  /**
   * Get symbol by name
   */
  getSymbol(name: string): CC65Symbol | undefined {
    return this.symbols?.symbols.get(name);
  }

  /**
   * Get symbol by address
   */
  getSymbolAtAddress(address: number): CC65Symbol | undefined {
    return this.symbols?.addressToSymbol.get(address);
  }

  /**
   * Get address for symbol name
   */
  getSymbolAddress(name: string): number | undefined {
    return this.symbols?.symbols.get(name)?.address;
  }

  /**
   * Check if address is in writable memory according to CC65 layout
   */
  isWritableAddress(address: number): boolean {
    return this.runtime?.isWritableAddress(address) || false;
  }

  /**
   * Get memory segment information for address
   */
  getMemorySegment(address: number) {
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
  disassembleWithSymbols(address: number, instruction: string): string {
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
  findSymbols(pattern: string): CC65Symbol[] {
    if (!this.symbols) {
      return [];
    }

    const regex = new RegExp(pattern, 'i');
    return this.symbolParser.findSymbols(regex);
  }

  /**
   * Get all symbols for a source file
   */
  getFileSymbols(filename: string): CC65Symbol[] {
    if (!this.symbols) {
      return [];
    }

    return this.symbolParser.getSymbolsForFile(filename);
  }

  /**
   * Validate current configuration
   */
  validateConfiguration(): string[] {
    const errors: string[] = [];

    if (!this.layout) {
      errors.push('No memory layout configured');
      return errors;
    }

    // Validate memory layout
    const layoutErrors = CC65MemoryConfigurator.validateLayout(this.layout);
    errors.push(...layoutErrors);

    return errors;
  }

  /**
   * Generate CC65 linker configuration
   */
  generateLinkerConfig(): string {
    if (!this.runtime) {
      throw new Error('Runtime not initialized');
    }

    return this.runtime.generateLinkerConfig();
  }

  /**
   * Get startup sequence for CC65 programs
   */
  getStartupSequence(): number[] {
    if (!this.runtime) {
      throw new Error('Runtime not initialized');
    }

    return this.runtime.getStartupSequence();
  }

  /**
   * Get current memory layout
   */
  getMemoryLayout(): CC65MemoryLayout | undefined {
    return this.layout;
  }

  /**
   * Get symbol statistics
   */
  getSymbolStats(): { total: number; byType: Record<string, number>; byFile: Record<string, number> } {
    if (!this.symbols) {
      return { total: 0, byType: {}, byFile: {} };
    }

    const stats = {
      total: this.symbols.symbols.size,
      byType: {} as Record<string, number>,
      byFile: {} as Record<string, number>
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