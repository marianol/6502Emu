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

export class CC65SymbolParser {
  private symbols = new Map<string, CC65Symbol>();
  private addressToSymbol = new Map<number, CC65Symbol>();
  private fileSymbols = new Map<string, CC65Symbol[]>();

  /**
   * Parse CC65 symbol file content
   * Format: name=value type [scope] [file:line]
   */
  parseSymbolFile(content: string): CC65SymbolTable {
    this.symbols.clear();
    this.addressToSymbol.clear();
    this.fileSymbols.clear();

    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
        continue; // Skip comments and empty lines
      }

      const symbol = this.parseSymbolLine(trimmed);
      if (symbol) {
        this.addSymbol(symbol);
      }
    }

    return {
      symbols: this.symbols,
      addressToSymbol: this.addressToSymbol,
      fileSymbols: this.fileSymbols
    };
  }

  private parseSymbolLine(line: string): CC65Symbol | null {
    // Parse format: name=value type [scope] [file:line]
    const parts = line.split(/\s+/);
    if (parts.length < 2) return null;

    const nameValue = parts[0];
    const equalIndex = nameValue.indexOf('=');
    if (equalIndex === -1) return null;

    const name = nameValue.substring(0, equalIndex);
    const valueStr = nameValue.substring(equalIndex + 1);
    
    // Parse address (hex or decimal)
    let address: number;
    if (valueStr.startsWith('$')) {
      address = parseInt(valueStr.substring(1), 16);
    } else if (valueStr.startsWith('0x')) {
      address = parseInt(valueStr, 16);
    } else {
      address = parseInt(valueStr, 10);
    }

    if (isNaN(address)) return null;

    const type = this.parseSymbolType(parts[1]);
    
    // Parse file:line and scope
    let file: string | undefined;
    let lineNumber: number | undefined;
    let scope: string | undefined;
    
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      const colonIndex = part.indexOf(':');
      if (colonIndex !== -1) {
        // This is a file:line specification
        file = part.substring(0, colonIndex);
        const lineStr = part.substring(colonIndex + 1);
        lineNumber = parseInt(lineStr, 10);
        if (isNaN(lineNumber)) lineNumber = undefined;
      } else if (part.startsWith('.')) {
        // This is a scope specification
        scope = part;
      }
    }

    return {
      name,
      address,
      type,
      scope,
      file,
      line: lineNumber
    };
  }

  private parseSymbolType(typeStr: string): CC65Symbol['type'] {
    switch (typeStr.toLowerCase()) {
      case 'lab':
      case 'label':
        return 'label';
      case 'equ':
      case 'equate':
        return 'equate';
      case 'imp':
      case 'import':
        return 'import';
      case 'exp':
      case 'export':
        return 'export';
      default:
        return 'label'; // Default fallback
    }
  }

  private addSymbol(symbol: CC65Symbol): void {
    this.symbols.set(symbol.name, symbol);
    this.addressToSymbol.set(symbol.address, symbol);
    
    if (symbol.file) {
      if (!this.fileSymbols.has(symbol.file)) {
        this.fileSymbols.set(symbol.file, []);
      }
      this.fileSymbols.get(symbol.file)!.push(symbol);
    }
  }

  /**
   * Look up symbol by name
   */
  getSymbolByName(name: string): CC65Symbol | undefined {
    return this.symbols.get(name);
  }

  /**
   * Look up symbol by address
   */
  getSymbolByAddress(address: number): CC65Symbol | undefined {
    return this.addressToSymbol.get(address);
  }

  /**
   * Get all symbols for a specific file
   */
  getSymbolsForFile(filename: string): CC65Symbol[] {
    return this.fileSymbols.get(filename) || [];
  }

  /**
   * Get address for symbol name
   */
  getAddressForSymbol(name: string): number | undefined {
    const symbol = this.symbols.get(name);
    return symbol?.address;
  }

  /**
   * Get all symbols
   */
  getAllSymbols(): CC65Symbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Find symbols matching a pattern
   */
  findSymbols(pattern: RegExp): CC65Symbol[] {
    const results: CC65Symbol[] = [];
    for (const symbol of this.symbols.values()) {
      if (pattern.test(symbol.name)) {
        results.push(symbol);
      }
    }
    return results;
  }
}