/**
 * Unit tests for CC65 Compatibility Manager
 */

import { CC65CompatibilityManager } from '../../src/cc65/compatibility';

describe('CC65CompatibilityManager', () => {
  let manager: CC65CompatibilityManager;

  beforeEach(() => {
    manager = new CC65CompatibilityManager();
  });

  describe('initialization', () => {
    it('should initialize with homebrew layout', async () => {
      const config = {
        memoryLayout: 'homebrew' as const
      };

      const debugInfo = await manager.initialize(config);

      expect(debugInfo.layout).toBeDefined();
      expect(debugInfo.runtime).toBeDefined();
      expect(debugInfo.layout.segments).toHaveLength(4);
    });

    it('should initialize with Apple II layout', async () => {
      const config = {
        memoryLayout: 'apple2' as const
      };

      const debugInfo = await manager.initialize(config);

      expect(debugInfo.layout.segments).toHaveLength(8);
      expect(debugInfo.layout.stackStart).toBe(0x0100);
    });

    it('should initialize with C64 layout', async () => {
      const config = {
        memoryLayout: 'c64' as const
      };

      const debugInfo = await manager.initialize(config);

      expect(debugInfo.layout.segments.length).toBeGreaterThan(0);
      const zpSegment = debugInfo.layout.segments.find(s => s.name === 'ZEROPAGE');
      expect(zpSegment?.start).toBe(0x0002);
    });

    it('should initialize with custom layout', async () => {
      const config = {
        memoryLayout: 'custom' as const,
        customLayout: {
          ramStart: 0x0400,
          ramSize: 0x4000,
          romStart: 0x8000,
          romSize: 0x8000
        }
      };

      const debugInfo = await manager.initialize(config);

      const ramSegment = debugInfo.layout.segments.find(s => s.name === 'RAM');
      expect(ramSegment?.start).toBe(0x0400);
      expect(ramSegment?.size).toBe(0x4000);
    });

    it('should throw error for custom layout without configuration', async () => {
      const config = {
        memoryLayout: 'custom' as const
      };

      await expect(manager.initialize(config)).rejects.toThrow('Custom layout configuration required');
    });

    it('should throw error for unknown layout', async () => {
      const config = {
        memoryLayout: 'unknown' as any
      };

      await expect(manager.initialize(config)).rejects.toThrow('Unknown memory layout: unknown');
    });
  });

  describe('memory operations', () => {
    beforeEach(async () => {
      await manager.initialize({ memoryLayout: 'homebrew' });
    });

    it('should identify writable addresses', () => {
      expect(manager.isWritableAddress(0x0200)).toBe(true); // RAM
      expect(manager.isWritableAddress(0x8000)).toBe(false); // ROM
    });

    it('should get memory segment information', () => {
      const segment = manager.getMemorySegment(0x0200);
      expect(segment?.name).toBe('RAM');
      expect(segment?.writable).toBe(true);
    });

    it('should provide zero page information', () => {
      const zpInfo = manager.getZeroPageInfo();
      expect(zpInfo?.start).toBe(0x0000);
      expect(zpInfo?.size).toBe(0x0100);
      expect(zpInfo?.available).toBe(0x0100 - 26);
    });
  });

  describe('symbol operations', () => {
    beforeEach(async () => {
      await manager.initialize({ memoryLayout: 'homebrew' });
      
      // Mock symbol loading by directly setting up symbols
      const symbolContent = `
        main=$0800 lab main.c:10
        loop=$0820 lab main.c:20
        data=$2000 equ data.c:5
        buffer=$3000 exp
      `;
      
      // Access private method for testing
      (manager as any).symbols = (manager as any).symbolParser.parseSymbolFile(symbolContent);
    });

    it('should get symbol by name', () => {
      const symbol = manager.getSymbol('main');
      expect(symbol?.address).toBe(0x0800);
      expect(symbol?.type).toBe('label');
    });

    it('should get symbol by address', () => {
      const symbol = manager.getSymbolAtAddress(0x2000);
      expect(symbol?.name).toBe('data');
      expect(symbol?.type).toBe('equate');
    });

    it('should get symbol address', () => {
      const address = manager.getSymbolAddress('buffer');
      expect(address).toBe(0x3000);
    });

    it('should find symbols by pattern', () => {
      const symbols = manager.findSymbols('ma');
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('main');
    });

    it('should get file symbols', () => {
      const symbols = manager.getFileSymbols('main.c');
      expect(symbols).toHaveLength(2);
      expect(symbols.map(s => s.name)).toContain('main');
      expect(symbols.map(s => s.name)).toContain('loop');
    });

    it('should generate disassembly with symbols', () => {
      const result = manager.disassembleWithSymbols(0x0800, 'JMP $2000');
      expect(result).toBe('main: JMP data');
    });

    it('should return original instruction when no symbols match', () => {
      const result = manager.disassembleWithSymbols(0x1000, 'JMP $1500');
      expect(result).toBe('JMP $1500');
    });
  });

  describe('configuration validation', () => {
    it('should validate correct configuration', async () => {
      await manager.initialize({ memoryLayout: 'homebrew' });
      const errors = manager.validateConfiguration();
      expect(errors).toHaveLength(0);
    });

    it('should detect missing layout', () => {
      const errors = manager.validateConfiguration();
      expect(errors).toContain('No memory layout configured');
    });
  });

  describe('code generation', () => {
    beforeEach(async () => {
      await manager.initialize({ memoryLayout: 'homebrew' });
    });

    it('should generate linker configuration', () => {
      const config = manager.generateLinkerConfig();
      expect(config).toContain('MEMORY {');
      expect(config).toContain('SEGMENTS {');
      expect(config).toContain('ZEROPAGE:');
    });

    it('should generate startup sequence', () => {
      const sequence = manager.getStartupSequence();
      expect(sequence).toHaveLength(6);
      expect(sequence[0]).toBe(0xA2); // LDX
      expect(sequence[2]).toBe(0x9A); // TXS
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await manager.initialize({ memoryLayout: 'homebrew' });
      
      const symbolContent = `
        main=$0800 lab main.c:10
        loop=$0820 lab main.c:20
        data=$2000 equ data.c:5
        helper=$1000 exp utils.c:15
      `;
      
      (manager as any).symbols = (manager as any).symbolParser.parseSymbolFile(symbolContent);
    });

    it('should provide symbol statistics', () => {
      const stats = manager.getSymbolStats();
      
      expect(stats.total).toBe(4);
      expect(stats.byType.label).toBe(2);
      expect(stats.byType.equate).toBe(1);
      expect(stats.byType.export).toBe(1);
      expect(stats.byFile['main.c']).toBe(2);
      expect(stats.byFile['data.c']).toBe(1);
      expect(stats.byFile['utils.c']).toBe(1);
    });

    it('should return empty stats when no symbols loaded', () => {
      // Create a fresh manager without symbols
      const freshManager = new CC65CompatibilityManager();
      const stats = freshManager.getSymbolStats();
      expect(stats.total).toBe(0);
      expect(Object.keys(stats.byType)).toHaveLength(0);
      expect(Object.keys(stats.byFile)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw error when runtime not initialized for startup sequence', () => {
      expect(() => manager.getStartupSequence()).toThrow('Runtime not initialized');
    });

    it('should throw error when runtime not initialized for linker config', () => {
      expect(() => manager.generateLinkerConfig()).toThrow('Runtime not initialized');
    });

    it('should return undefined for symbol operations when no symbols loaded', () => {
      expect(manager.getSymbol('test')).toBeUndefined();
      expect(manager.getSymbolAtAddress(0x1000)).toBeUndefined();
      expect(manager.getSymbolAddress('test')).toBeUndefined();
    });

    it('should return empty arrays for symbol searches when no symbols loaded', () => {
      expect(manager.findSymbols('test')).toHaveLength(0);
      expect(manager.getFileSymbols('test.c')).toHaveLength(0);
    });
  });
});