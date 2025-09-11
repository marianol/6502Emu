/**
 * CC65 Memory Layout Support
 * Provides standard CC65 memory configurations and runtime compatibility
 */

export interface CC65MemorySegment {
  name: string;
  start: number;
  size: number;
  type: 'zp' | 'ram' | 'rom' | 'bss' | 'data' | 'code' | 'rodata';
  writable: boolean;
}

export interface CC65MemoryLayout {
  segments: CC65MemorySegment[];
  stackStart: number;
  stackSize: number;
  heapStart?: number;
  heapSize?: number;
}

export interface CC65RuntimeConfig {
  layout: CC65MemoryLayout;
  startupCode: number; // Address of startup routine
  resetVector: number;
  irqVector?: number;
  nmiVector?: number;
}

/**
 * Standard CC65 memory configurations for common 6502 systems
 */
export class CC65MemoryConfigurator {
  
  /**
   * Get standard Apple II memory layout
   */
  static getApple2Layout(): CC65MemoryLayout {
    return {
      segments: [
        { name: 'ZEROPAGE', start: 0x0000, size: 0x0100, type: 'zp', writable: true },
        { name: 'STACK', start: 0x0100, size: 0x0100, type: 'ram', writable: true },
        { name: 'STARTUP', start: 0x0800, size: 0x0200, type: 'code', writable: false },
        { name: 'LOWCODE', start: 0x0A00, size: 0x1600, type: 'code', writable: false },
        { name: 'CODE', start: 0x2000, size: 0x7000, type: 'code', writable: false },
        { name: 'RODATA', start: 0x9000, size: 0x1000, type: 'rodata', writable: false },
        { name: 'DATA', start: 0xA000, size: 0x2000, type: 'data', writable: true },
        { name: 'BSS', start: 0xC000, size: 0x2000, type: 'bss', writable: true }
      ],
      stackStart: 0x0100,
      stackSize: 0x0100,
      heapStart: 0xE000,
      heapSize: 0x2000
    };
  }

  /**
   * Get standard Commodore 64 memory layout
   */
  static getC64Layout(): CC65MemoryLayout {
    return {
      segments: [
        { name: 'ZEROPAGE', start: 0x0002, size: 0x001A, type: 'zp', writable: true },
        { name: 'LOADADDR', start: 0x07FF, size: 0x0002, type: 'data', writable: false },
        { name: 'STARTUP', start: 0x0801, size: 0x0200, type: 'code', writable: false },
        { name: 'LOWCODE', start: 0x0A01, size: 0x1000, type: 'code', writable: false },
        { name: 'CODE', start: 0x1A01, size: 0x7000, type: 'code', writable: false },
        { name: 'RODATA', start: 0x8A01, size: 0x1000, type: 'rodata', writable: false },
        { name: 'DATA', start: 0x9A01, size: 0x1000, type: 'data', writable: true },
        { name: 'BSS', start: 0xAA01, size: 0x1000, type: 'bss', writable: true }
      ],
      stackStart: 0x0100,
      stackSize: 0x0100
    };
  }

  /**
   * Get generic homebrew computer layout
   */
  static getHomebrewLayout(): CC65MemoryLayout {
    return {
      segments: [
        { name: 'ZEROPAGE', start: 0x0000, size: 0x0100, type: 'zp', writable: true },
        { name: 'STACK', start: 0x0100, size: 0x0100, type: 'ram', writable: true },
        { name: 'RAM', start: 0x0200, size: 0x7E00, type: 'ram', writable: true },
        { name: 'ROM', start: 0x8000, size: 0x8000, type: 'rom', writable: false }
      ],
      stackStart: 0x0100,
      stackSize: 0x0100,
      heapStart: 0x0200,
      heapSize: 0x7E00
    };
  }

  /**
   * Create custom layout from configuration
   */
  static createCustomLayout(config: {
    ramStart: number;
    ramSize: number;
    romStart: number;
    romSize: number;
    stackStart?: number;
    stackSize?: number;
  }): CC65MemoryLayout {
    const stackStart = config.stackStart || 0x0100;
    const stackSize = config.stackSize || 0x0100;

    return {
      segments: [
        { name: 'ZEROPAGE', start: 0x0000, size: 0x0100, type: 'zp', writable: true },
        { name: 'STACK', start: stackStart, size: stackSize, type: 'ram', writable: true },
        { name: 'RAM', start: config.ramStart, size: config.ramSize, type: 'ram', writable: true },
        { name: 'ROM', start: config.romStart, size: config.romSize, type: 'rom', writable: false }
      ],
      stackStart,
      stackSize,
      heapStart: config.ramStart,
      heapSize: config.ramSize
    };
  }

  /**
   * Validate memory layout for CC65 compatibility
   */
  static validateLayout(layout: CC65MemoryLayout): string[] {
    const errors: string[] = [];

    // Check for required segments
    const hasZeroPage = layout.segments.some(s => s.type === 'zp');
    if (!hasZeroPage) {
      errors.push('Missing zero page segment');
    }

    // Check zero page size
    const zpSegment = layout.segments.find(s => s.type === 'zp');
    if (zpSegment && zpSegment.size < 26) {
      errors.push('Zero page segment too small (minimum 26 bytes required)');
    }

    // Check stack configuration
    if (layout.stackSize < 0x80) {
      errors.push('Stack too small (minimum 128 bytes recommended)');
    }

    // Check for overlapping segments
    const sortedSegments = [...layout.segments].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      const current = sortedSegments[i];
      const next = sortedSegments[i + 1];
      
      if (current.start + current.size > next.start) {
        errors.push(`Overlapping segments: ${current.name} and ${next.name}`);
      }
    }

    return errors;
  }
}

/**
 * CC65 Runtime Library Compatibility
 */
export class CC65Runtime {
  private layout: CC65MemoryLayout;
  private startupAddress: number;

  constructor(layout: CC65MemoryLayout, startupAddress: number = 0x0800) {
    this.layout = layout;
    this.startupAddress = startupAddress;
  }

  /**
   * Get startup sequence for CC65 programs
   */
  getStartupSequence(): number[] {
    // Standard CC65 startup sequence:
    // 1. Initialize stack pointer
    // 2. Clear BSS segment
    // 3. Initialize data segment
    // 4. Call main()
    return [
      0xA2, 0xFF,       // LDX #$FF
      0x9A,             // TXS (initialize stack)
      0x20, 0x00, 0x08, // JSR $0800 (call startup code)
    ];
  }

  /**
   * Check if address is in writable memory
   */
  isWritableAddress(address: number): boolean {
    for (const segment of this.layout.segments) {
      if (address >= segment.start && address < segment.start + segment.size) {
        return segment.writable;
      }
    }
    return false;
  }

  /**
   * Get segment containing address
   */
  getSegmentForAddress(address: number): CC65MemorySegment | undefined {
    return this.layout.segments.find(segment => 
      address >= segment.start && address < segment.start + segment.size
    );
  }

  /**
   * Get zero page allocation info
   */
  getZeroPageInfo(): { start: number; size: number; available: number } {
    const zpSegment = this.layout.segments.find(s => s.type === 'zp');
    if (!zpSegment) {
      return { start: 0, size: 0, available: 0 };
    }

    // CC65 reserves first 26 bytes of zero page
    const reserved = 26;
    return {
      start: zpSegment.start,
      size: zpSegment.size,
      available: Math.max(0, zpSegment.size - reserved)
    };
  }

  /**
   * Generate memory configuration for CC65 linker
   */
  generateLinkerConfig(): string {
    let config = 'MEMORY {\n';
    
    for (const segment of this.layout.segments) {
      const attrs = segment.writable ? 'rw' : 'r';
      config += `    ${segment.name}: start = $${segment.start.toString(16).toUpperCase().padStart(4, '0')}, ` +
                `size = $${segment.size.toString(16).toUpperCase().padStart(4, '0')}, type = ${attrs};\n`;
    }
    
    config += '}\n\nSEGMENTS {\n';
    config += '    ZEROPAGE: load = ZEROPAGE, type = zp;\n';
    config += '    STARTUP:  load = ROM, type = ro;\n';
    config += '    LOWCODE:  load = ROM, type = ro;\n';
    config += '    CODE:     load = ROM, type = ro;\n';
    config += '    RODATA:   load = ROM, type = ro;\n';
    config += '    DATA:     load = ROM, run = RAM, type = rw, define = yes;\n';
    config += '    BSS:      load = RAM, type = bss, define = yes;\n';
    config += '}\n';
    
    return config;
  }
}