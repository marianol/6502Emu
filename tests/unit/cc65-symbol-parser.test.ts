/**
 * Unit tests for CC65 Symbol Parser
 */

import { CC65SymbolParser } from '../../src/cc65/symbol-parser';

describe('CC65SymbolParser', () => {
  let parser: CC65SymbolParser;

  beforeEach(() => {
    parser = new CC65SymbolParser();
  });

  describe('parseSymbolFile', () => {
    it('should parse basic symbol definitions', () => {
      const content = `
        main=$0800 lab
        data=$2000 equ
        buffer=$3000 exp
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.size).toBe(3);
      expect(result.symbols.get('main')).toEqual({
        name: 'main',
        address: 0x0800,
        type: 'label'
      });
      expect(result.symbols.get('data')).toEqual({
        name: 'data',
        address: 0x2000,
        type: 'equate'
      });
      expect(result.symbols.get('buffer')).toEqual({
        name: 'buffer',
        address: 0x3000,
        type: 'export'
      });
    });

    it('should parse symbols with scope information', () => {
      const content = `
        local_var=$0010 lab .main
        global_func=$1000 exp
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.get('local_var')).toEqual({
        name: 'local_var',
        address: 0x0010,
        type: 'label',
        scope: '.main'
      });
    });

    it('should parse symbols with file and line information', () => {
      const content = `
        init=$0800 lab main.c:15
        loop=$0820 lab main.c:25
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.get('init')).toEqual({
        name: 'init',
        address: 0x0800,
        type: 'label',
        file: 'main.c',
        line: 15
      });
      expect(result.symbols.get('loop')).toEqual({
        name: 'loop',
        address: 0x0820,
        type: 'label',
        file: 'main.c',
        line: 25
      });
    });

    it('should handle different address formats', () => {
      const content = `
        hex_addr=$1000 lab
        dec_addr=4096 lab
        hex_prefix=0x1000 lab
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.get('hex_addr')?.address).toBe(0x1000);
      expect(result.symbols.get('dec_addr')?.address).toBe(4096);
      expect(result.symbols.get('hex_prefix')?.address).toBe(0x1000);
    });

    it('should skip comments and empty lines', () => {
      const content = `
        # This is a comment
        ; This is also a comment
        
        main=$0800 lab
        
        # Another comment
        data=$2000 equ
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.size).toBe(2);
      expect(result.symbols.has('main')).toBe(true);
      expect(result.symbols.has('data')).toBe(true);
    });

    it('should build address-to-symbol mapping', () => {
      const content = `
        main=$0800 lab
        data=$2000 equ
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.addressToSymbol.get(0x0800)?.name).toBe('main');
      expect(result.addressToSymbol.get(0x2000)?.name).toBe('data');
    });

    it('should group symbols by file', () => {
      const content = `
        main=$0800 lab main.c:10
        init=$0820 lab main.c:20
        helper=$1000 lab utils.c:5
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.fileSymbols.get('main.c')).toHaveLength(2);
      expect(result.fileSymbols.get('utils.c')).toHaveLength(1);
      expect(result.fileSymbols.get('main.c')?.[0].name).toBe('main');
      expect(result.fileSymbols.get('main.c')?.[1].name).toBe('init');
    });
  });

  describe('symbol lookup methods', () => {
    beforeEach(() => {
      const content = `
        main=$0800 lab main.c:10
        data=$2000 equ data.c:5
        buffer=$3000 exp
      `;
      parser.parseSymbolFile(content);
    });

    it('should find symbol by name', () => {
      const symbol = parser.getSymbolByName('main');
      expect(symbol?.address).toBe(0x0800);
      expect(symbol?.type).toBe('label');
    });

    it('should find symbol by address', () => {
      const symbol = parser.getSymbolByAddress(0x2000);
      expect(symbol?.name).toBe('data');
      expect(symbol?.type).toBe('equate');
    });

    it('should get address for symbol', () => {
      const address = parser.getAddressForSymbol('buffer');
      expect(address).toBe(0x3000);
    });

    it('should get symbols for file', () => {
      const symbols = parser.getSymbolsForFile('main.c');
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('main');
    });

    it('should find symbols matching pattern', () => {
      const symbols = parser.findSymbols(/^ma/);
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('main');
    });

    it('should return undefined for non-existent symbols', () => {
      expect(parser.getSymbolByName('nonexistent')).toBeUndefined();
      expect(parser.getSymbolByAddress(0x9999)).toBeUndefined();
      expect(parser.getAddressForSymbol('missing')).toBeUndefined();
    });
  });

  describe('symbol type parsing', () => {
    it('should parse different symbol types correctly', () => {
      const content = `
        label_sym=$1000 lab
        equate_sym=$2000 equ
        import_sym=$3000 imp
        export_sym=$4000 exp
        label_full=$5000 label
        equate_full=$6000 equate
        import_full=$7000 import
        export_full=$8000 export
      `;

      const result = parser.parseSymbolFile(content);

      expect(result.symbols.get('label_sym')?.type).toBe('label');
      expect(result.symbols.get('equate_sym')?.type).toBe('equate');
      expect(result.symbols.get('import_sym')?.type).toBe('import');
      expect(result.symbols.get('export_sym')?.type).toBe('export');
      expect(result.symbols.get('label_full')?.type).toBe('label');
      expect(result.symbols.get('equate_full')?.type).toBe('equate');
      expect(result.symbols.get('import_full')?.type).toBe('import');
      expect(result.symbols.get('export_full')?.type).toBe('export');
    });

    it('should default to label type for unknown types', () => {
      const content = `unknown_type=$1000 xyz`;
      const result = parser.parseSymbolFile(content);
      expect(result.symbols.get('unknown_type')?.type).toBe('label');
    });
  });
});