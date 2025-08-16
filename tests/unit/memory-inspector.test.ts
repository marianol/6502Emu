import { MemoryInspectorImpl } from '../../src/debug/memory-inspector';
import { MemoryManager } from '../../src/core/memory';

// Mock MemoryManager
class MockMemoryManager extends MemoryManager {
  private memory = new Uint8Array(0x10000);

  read(address: number): number {
    return this.memory[address & 0xFFFF];
  }

  write(address: number, value: number): void {
    this.memory[address & 0xFFFF] = value & 0xFF;
  }

  loadROM(data: Uint8Array, startAddress: number): void {
    for (let i = 0; i < data.length; i++) {
      this.memory[(startAddress + i) & 0xFFFF] = data[i];
    }
  }
}

describe('MemoryInspector', () => {
  let memoryManager: MockMemoryManager;
  let inspector: MemoryInspectorImpl;

  beforeEach(() => {
    memoryManager = new MockMemoryManager();
    inspector = new MemoryInspectorImpl(memoryManager);
  });

  describe('readRange', () => {
    it('should read a range of memory', () => {
      // Setup test data
      memoryManager.write(0x1000, 0xAA);
      memoryManager.write(0x1001, 0xBB);
      memoryManager.write(0x1002, 0xCC);

      const result = inspector.readRange(0x1000, 3);

      expect(result).toEqual(new Uint8Array([0xAA, 0xBB, 0xCC]));
    });

    it('should handle zero-length reads', () => {
      const result = inspector.readRange(0x1000, 0);
      expect(result).toEqual(new Uint8Array(0));
    });
  });

  describe('writeRange', () => {
    it('should write a range of memory', () => {
      const data = new Uint8Array([0x11, 0x22, 0x33]);
      inspector.writeRange(0x2000, data);

      expect(memoryManager.read(0x2000)).toBe(0x11);
      expect(memoryManager.read(0x2001)).toBe(0x22);
      expect(memoryManager.read(0x2002)).toBe(0x33);
    });

    it('should handle empty data arrays', () => {
      const data = new Uint8Array(0);
      expect(() => inspector.writeRange(0x2000, data)).not.toThrow();
    });
  });

  describe('searchMemory', () => {
    it('should find single byte patterns', () => {
      memoryManager.write(0x1000, 0xAA);
      memoryManager.write(0x2000, 0xAA);
      memoryManager.write(0x3000, 0xBB);

      const results = inspector.searchMemory(new Uint8Array([0xAA]));

      expect(results).toContain(0x1000);
      expect(results).toContain(0x2000);
      expect(results).not.toContain(0x3000);
    });

    it('should find multi-byte patterns', () => {
      // Write pattern at 0x1000
      memoryManager.write(0x1000, 0xAA);
      memoryManager.write(0x1001, 0xBB);
      memoryManager.write(0x1002, 0xCC);

      // Write pattern at 0x2000
      memoryManager.write(0x2000, 0xAA);
      memoryManager.write(0x2001, 0xBB);
      memoryManager.write(0x2002, 0xCC);

      // Write partial pattern at 0x3000
      memoryManager.write(0x3000, 0xAA);
      memoryManager.write(0x3001, 0xBB);
      memoryManager.write(0x3002, 0xDD);

      const results = inspector.searchMemory(new Uint8Array([0xAA, 0xBB, 0xCC]));

      expect(results).toContain(0x1000);
      expect(results).toContain(0x2000);
      expect(results).not.toContain(0x3000);
    });

    it('should return empty array when pattern not found', () => {
      const results = inspector.searchMemory(new Uint8Array([0xFF, 0xFE, 0xFD]));
      expect(results).toEqual([]);
    });
  });

  describe('compareMemory', () => {
    it('should return true for identical memory regions', () => {
      memoryManager.write(0x1000, 0xAA);
      memoryManager.write(0x1001, 0xBB);
      memoryManager.write(0x2000, 0xAA);
      memoryManager.write(0x2001, 0xBB);

      const result = inspector.compareMemory(0x1000, 0x2000, 2);
      expect(result).toBe(true);
    });

    it('should return false for different memory regions', () => {
      memoryManager.write(0x1000, 0xAA);
      memoryManager.write(0x1001, 0xBB);
      memoryManager.write(0x2000, 0xAA);
      memoryManager.write(0x2001, 0xCC);

      const result = inspector.compareMemory(0x1000, 0x2000, 2);
      expect(result).toBe(false);
    });

    it('should handle zero-length comparisons', () => {
      const result = inspector.compareMemory(0x1000, 0x2000, 0);
      expect(result).toBe(true);
    });
  });

  describe('dumpMemory', () => {
    beforeEach(() => {
      // Setup test data
      for (let i = 0; i < 32; i++) {
        memoryManager.write(0x1000 + i, 0x20 + i); // ASCII printable characters
      }
    });

    it('should dump memory in hex format', () => {
      const result = inspector.dumpMemory(0x1000, 16, 'hex');
      
      expect(result).toContain('1000:');
      expect(result).toContain('20 21 22 23');
      expect(result).toContain('| !"#');
    });

    it('should dump memory in ASCII format', () => {
      const result = inspector.dumpMemory(0x1000, 16, 'ascii');
      
      expect(result).toBe(' !"#$%&\'()*+,-./');
    });

    it('should dump memory in disassembly format', () => {
      // Write some 6502 opcodes
      memoryManager.write(0x1000, 0xA9); // LDA #$nn
      memoryManager.write(0x1001, 0x42);
      memoryManager.write(0x1002, 0xEA); // NOP

      const result = inspector.dumpMemory(0x1000, 3, 'disasm');
      
      expect(result).toContain('1000:');
      expect(result).toContain('LDA #$nn');
      expect(result).toContain('NOP');
    });

    it('should throw error for unknown format', () => {
      expect(() => inspector.dumpMemory(0x1000, 16, 'unknown' as any))
        .toThrow('Unknown format: unknown');
    });
  });
});