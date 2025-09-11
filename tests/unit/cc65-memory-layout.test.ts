/**
 * Unit tests for CC65 Memory Layout
 */

import { CC65MemoryConfigurator, CC65Runtime } from '../../src/cc65/memory-layout';

describe('CC65MemoryConfigurator', () => {
  describe('standard layouts', () => {
    it('should create Apple II layout', () => {
      const layout = CC65MemoryConfigurator.getApple2Layout();
      
      expect(layout.segments).toHaveLength(8);
      expect(layout.stackStart).toBe(0x0100);
      expect(layout.stackSize).toBe(0x0100);
      
      const zpSegment = layout.segments.find(s => s.name === 'ZEROPAGE');
      expect(zpSegment).toBeDefined();
      expect(zpSegment?.start).toBe(0x0000);
      expect(zpSegment?.size).toBe(0x0100);
      expect(zpSegment?.type).toBe('zp');
    });

    it('should create C64 layout', () => {
      const layout = CC65MemoryConfigurator.getC64Layout();
      
      expect(layout.segments.length).toBeGreaterThan(0);
      expect(layout.stackStart).toBe(0x0100);
      
      const zpSegment = layout.segments.find(s => s.name === 'ZEROPAGE');
      expect(zpSegment).toBeDefined();
      expect(zpSegment?.start).toBe(0x0002);
      expect(zpSegment?.type).toBe('zp');
    });

    it('should create homebrew layout', () => {
      const layout = CC65MemoryConfigurator.getHomebrewLayout();
      
      expect(layout.segments).toHaveLength(4);
      expect(layout.stackStart).toBe(0x0100);
      
      const ramSegment = layout.segments.find(s => s.name === 'RAM');
      const romSegment = layout.segments.find(s => s.name === 'ROM');
      
      expect(ramSegment).toBeDefined();
      expect(romSegment).toBeDefined();
      expect(ramSegment?.writable).toBe(true);
      expect(romSegment?.writable).toBe(false);
    });
  });

  describe('custom layout creation', () => {
    it('should create custom layout with specified parameters', () => {
      const config = {
        ramStart: 0x0200,
        ramSize: 0x6000,
        romStart: 0x8000,
        romSize: 0x8000
      };

      const layout = CC65MemoryConfigurator.createCustomLayout(config);
      
      expect(layout.segments).toHaveLength(4);
      
      const ramSegment = layout.segments.find(s => s.name === 'RAM');
      const romSegment = layout.segments.find(s => s.name === 'ROM');
      
      expect(ramSegment?.start).toBe(0x0200);
      expect(ramSegment?.size).toBe(0x6000);
      expect(romSegment?.start).toBe(0x8000);
      expect(romSegment?.size).toBe(0x8000);
    });

    it('should use custom stack configuration', () => {
      const config = {
        ramStart: 0x0200,
        ramSize: 0x6000,
        romStart: 0x8000,
        romSize: 0x8000,
        stackStart: 0x0180,
        stackSize: 0x0080
      };

      const layout = CC65MemoryConfigurator.createCustomLayout(config);
      
      expect(layout.stackStart).toBe(0x0180);
      expect(layout.stackSize).toBe(0x0080);
      
      const stackSegment = layout.segments.find(s => s.name === 'STACK');
      expect(stackSegment?.start).toBe(0x0180);
      expect(stackSegment?.size).toBe(0x0080);
    });
  });

  describe('layout validation', () => {
    it('should validate correct layout', () => {
      const layout = CC65MemoryConfigurator.getHomebrewLayout();
      const errors = CC65MemoryConfigurator.validateLayout(layout);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing zero page', () => {
      const layout = {
        segments: [
          { name: 'RAM', start: 0x0200, size: 0x6000, type: 'ram' as const, writable: true }
        ],
        stackStart: 0x0100,
        stackSize: 0x0100
      };

      const errors = CC65MemoryConfigurator.validateLayout(layout);
      expect(errors).toContain('Missing zero page segment');
    });

    it('should detect small zero page', () => {
      const layout = {
        segments: [
          { name: 'ZEROPAGE', start: 0x0000, size: 0x0010, type: 'zp' as const, writable: true }
        ],
        stackStart: 0x0100,
        stackSize: 0x0100
      };

      const errors = CC65MemoryConfigurator.validateLayout(layout);
      expect(errors).toContain('Zero page segment too small (minimum 26 bytes required)');
    });

    it('should detect small stack', () => {
      const layout = {
        segments: [
          { name: 'ZEROPAGE', start: 0x0000, size: 0x0100, type: 'zp' as const, writable: true }
        ],
        stackStart: 0x0100,
        stackSize: 0x0040
      };

      const errors = CC65MemoryConfigurator.validateLayout(layout);
      expect(errors).toContain('Stack too small (minimum 128 bytes recommended)');
    });

    it('should detect overlapping segments', () => {
      const layout = {
        segments: [
          { name: 'ZEROPAGE', start: 0x0000, size: 0x0100, type: 'zp' as const, writable: true },
          { name: 'RAM', start: 0x0080, size: 0x0100, type: 'ram' as const, writable: true }
        ],
        stackStart: 0x0100,
        stackSize: 0x0100
      };

      const errors = CC65MemoryConfigurator.validateLayout(layout);
      expect(errors).toContain('Overlapping segments: ZEROPAGE and RAM');
    });
  });
});

describe('CC65Runtime', () => {
  let runtime: CC65Runtime;
  let layout: any;

  beforeEach(() => {
    layout = CC65MemoryConfigurator.getHomebrewLayout();
    runtime = new CC65Runtime(layout);
  });

  describe('memory access validation', () => {
    it('should identify writable addresses', () => {
      expect(runtime.isWritableAddress(0x0050)).toBe(true); // Zero page
      expect(runtime.isWritableAddress(0x0150)).toBe(true); // Stack
      expect(runtime.isWritableAddress(0x0300)).toBe(true); // RAM
      expect(runtime.isWritableAddress(0x8000)).toBe(false); // ROM
    });

    it('should get correct segment for address', () => {
      const zpSegment = runtime.getSegmentForAddress(0x0050);
      expect(zpSegment?.name).toBe('ZEROPAGE');
      expect(zpSegment?.type).toBe('zp');

      const romSegment = runtime.getSegmentForAddress(0x8000);
      expect(romSegment?.name).toBe('ROM');
      expect(romSegment?.type).toBe('rom');
    });

    it('should return undefined for unmapped addresses', () => {
      // Check the homebrew layout: RAM is 0x0200-0x7FFF, ROM is 0x8000-0xFFFF
      // So there should be no gap, let's use a different approach
      const customLayout = {
        segments: [
          { name: 'RAM', start: 0x0200, size: 0x1000, type: 'ram' as const, writable: true },
          { name: 'ROM', start: 0x8000, size: 0x1000, type: 'rom' as const, writable: false }
        ],
        stackStart: 0x0100,
        stackSize: 0x0100
      };
      const customRuntime = new CC65Runtime(customLayout);
      const segment = customRuntime.getSegmentForAddress(0x2000); // Gap between RAM and ROM
      expect(segment).toBeUndefined();
    });
  });

  describe('zero page information', () => {
    it('should provide zero page allocation info', () => {
      const zpInfo = runtime.getZeroPageInfo();
      
      expect(zpInfo.start).toBe(0x0000);
      expect(zpInfo.size).toBe(0x0100);
      expect(zpInfo.available).toBe(0x0100 - 26); // 26 bytes reserved
    });
  });

  describe('startup sequence', () => {
    it('should generate valid startup sequence', () => {
      const sequence = runtime.getStartupSequence();
      
      expect(sequence).toHaveLength(6);
      expect(sequence[0]).toBe(0xA2); // LDX
      expect(sequence[1]).toBe(0xFF); // #$FF
      expect(sequence[2]).toBe(0x9A); // TXS
      expect(sequence[3]).toBe(0x20); // JSR
    });
  });

  describe('linker configuration generation', () => {
    it('should generate valid linker config', () => {
      const config = runtime.generateLinkerConfig();
      
      expect(config).toContain('MEMORY {');
      expect(config).toContain('SEGMENTS {');
      expect(config).toContain('ZEROPAGE:');
      expect(config).toContain('ROM:');
      expect(config).toContain('RAM:');
    });

    it('should include correct memory attributes', () => {
      const config = runtime.generateLinkerConfig();
      
      // ROM should be read-only
      expect(config).toMatch(/ROM:.*type = r/);
      // RAM should be read-write  
      expect(config).toMatch(/RAM:.*type = rw/);
    });
  });
});