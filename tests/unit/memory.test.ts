// Memory management unit tests
// Tests memory region mapping, ROM loading, and access routing

import { MemoryManager, Peripheral, ROMImage } from '../../src/core/memory';
import { ROMLoader } from '../../src/core/rom-loader';
import * as fs from 'fs';
import * as path from 'path';

// Mock peripheral for testing
class MockPeripheral implements Peripheral {
  private registers: number[] = [0, 0, 0, 0];
  public readCount = 0;
  public writeCount = 0;
  public lastRead = -1;
  public lastWrite = { offset: -1, value: -1 };

  read(offset: number): number {
    this.readCount++;
    this.lastRead = offset;
    return this.registers[offset] || 0xFF;
  }

  write(offset: number, value: number): void {
    this.writeCount++;
    this.lastWrite = { offset, value };
    if (offset < this.registers.length) {
      this.registers[offset] = value & 0xFF;
    }
  }

  reset(): void {
    this.registers.fill(0);
    this.readCount = 0;
    this.writeCount = 0;
  }

  tick(cycles: number): void {
    // Mock implementation
  }

  getInterruptStatus(): boolean {
    return false;
  }

  getRegister(index: number): number {
    return this.registers[index] || 0;
  }
}

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  describe('RAM Configuration', () => {
    test('should configure RAM region correctly', () => {
      memoryManager.configureRAM(0x0000, 0x8000);
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0]).toEqual({
        start: 0x0000,
        end: 0x7FFF,
        type: 'RAM',
        handler: expect.any(Object)
      });
    });

    test('should replace existing RAM when reconfiguring', () => {
      memoryManager.configureRAM(0x0000, 0x4000);
      memoryManager.configureRAM(0x2000, 0x6000);
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0].start).toBe(0x2000);
      expect(memoryMap[0].end).toBe(0x7FFF);
    });

    test('should read and write RAM correctly', () => {
      memoryManager.configureRAM(0x0000, 0x1000);
      
      // Write to RAM
      memoryManager.write(0x0100, 0x42);
      memoryManager.write(0x0200, 0xAB);
      
      // Read from RAM
      expect(memoryManager.read(0x0100)).toBe(0x42);
      expect(memoryManager.read(0x0200)).toBe(0xAB);
      expect(memoryManager.read(0x0300)).toBe(0x00); // Unwritten RAM should be 0
    });

    test('should handle RAM boundary conditions', () => {
      memoryManager.configureRAM(0x1000, 0x1000);
      
      // Write at boundaries
      memoryManager.write(0x1000, 0x11); // Start
      memoryManager.write(0x1FFF, 0x22); // End
      
      expect(memoryManager.read(0x1000)).toBe(0x11);
      expect(memoryManager.read(0x1FFF)).toBe(0x22);
      
      // Out of bounds should return 0xFF
      expect(memoryManager.read(0x0FFF)).toBe(0xFF);
      expect(memoryManager.read(0x2000)).toBe(0xFF);
    });
  });

  describe('ROM Loading', () => {
    test('should load ROM data correctly', () => {
      const romData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      memoryManager.loadROM(romData, 0xF000);
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0]).toEqual({
        start: 0xF000,
        end: 0xF003,
        type: 'ROM',
        handler: expect.any(Object)
      });
      
      // Verify ROM content
      expect(memoryManager.read(0xF000)).toBe(0x01);
      expect(memoryManager.read(0xF001)).toBe(0x02);
      expect(memoryManager.read(0xF002)).toBe(0x03);
      expect(memoryManager.read(0xF003)).toBe(0x04);
    });

    test('should prevent ROM writes', () => {
      const romData = new Uint8Array([0xFF, 0xFF]);
      memoryManager.loadROM(romData, 0xF000);
      
      // Attempt to write to ROM
      memoryManager.write(0xF000, 0x42);
      
      // ROM should remain unchanged
      expect(memoryManager.read(0xF000)).toBe(0xFF);
    });

    test('should replace overlapping ROM regions', () => {
      const rom1 = new Uint8Array([0x01, 0x02]);
      const rom2 = new Uint8Array([0x03, 0x04]);
      
      memoryManager.loadROM(rom1, 0xF000);
      memoryManager.loadROM(rom2, 0xF001); // Overlaps with first ROM
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0].start).toBe(0xF001);
      expect(memoryMap[0].end).toBe(0xF002);
      
      expect(memoryManager.read(0xF000)).toBe(0xFF); // No longer mapped
      expect(memoryManager.read(0xF001)).toBe(0x03);
      expect(memoryManager.read(0xF002)).toBe(0x04);
    });
  });

  describe('Peripheral Mapping', () => {
    test('should map peripheral correctly', () => {
      const peripheral = new MockPeripheral();
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0]).toEqual({
        start: 0xA000,
        end: 0xA003,
        type: 'IO',
        handler: expect.any(Object)
      });
    });

    test('should route peripheral reads correctly', () => {
      const peripheral = new MockPeripheral();
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      // Read from peripheral
      memoryManager.read(0xA001);
      
      expect(peripheral.readCount).toBe(1);
      expect(peripheral.lastRead).toBe(1); // Offset from base address
    });

    test('should route peripheral writes correctly', () => {
      const peripheral = new MockPeripheral();
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      // Write to peripheral
      memoryManager.write(0xA002, 0x55);
      
      expect(peripheral.writeCount).toBe(1);
      expect(peripheral.lastWrite).toEqual({ offset: 2, value: 0x55 });
    });

    test('should replace overlapping peripheral regions', () => {
      const peripheral1 = new MockPeripheral();
      const peripheral2 = new MockPeripheral();
      
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral1);
      memoryManager.mapPeripheral(0xA002, 0xA005, peripheral2); // Overlaps
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap).toHaveLength(1);
      expect(memoryMap[0].start).toBe(0xA002);
      expect(memoryMap[0].end).toBe(0xA005);
      
      // Should route to second peripheral
      memoryManager.write(0xA003, 0x42);
      expect(peripheral1.writeCount).toBe(0);
      expect(peripheral2.writeCount).toBe(1);
    });
  });

  describe('Memory Access Routing', () => {
    test('should route to correct memory regions', () => {
      const peripheral = new MockPeripheral();
      const romData = new Uint8Array([0xEA]); // NOP instruction
      
      memoryManager.configureRAM(0x0000, 0x8000);
      memoryManager.loadROM(romData, 0xF000);
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      // Test RAM access
      memoryManager.write(0x1000, 0x42);
      expect(memoryManager.read(0x1000)).toBe(0x42);
      
      // Test ROM access
      expect(memoryManager.read(0xF000)).toBe(0xEA);
      
      // Test peripheral access
      memoryManager.write(0xA001, 0x55);
      expect(peripheral.writeCount).toBe(1);
    });

    test('should handle unmapped memory access', () => {
      // No memory regions configured
      
      // Unmapped reads should return 0xFF
      expect(memoryManager.read(0x1000)).toBe(0xFF);
      
      // Unmapped writes should be ignored (no error)
      expect(() => memoryManager.write(0x1000, 0x42)).not.toThrow();
    });

    test('should sort memory regions by address', () => {
      const peripheral = new MockPeripheral();
      const romData = new Uint8Array([0x00]);
      
      // Add regions out of order
      memoryManager.loadROM(romData, 0xF000);
      memoryManager.configureRAM(0x0000, 0x8000);
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      const memoryMap = memoryManager.getMemoryMap();
      expect(memoryMap[0].start).toBe(0x0000); // RAM first
      expect(memoryMap[1].start).toBe(0xA000); // Peripheral second
      expect(memoryMap[2].start).toBe(0xF000); // ROM last
    });
  });

  describe('Memory Map Management', () => {
    test('should clear all memory regions', () => {
      const peripheral = new MockPeripheral();
      const romData = new Uint8Array([0x00]);
      
      memoryManager.configureRAM(0x0000, 0x1000);
      memoryManager.loadROM(romData, 0xF000);
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral);
      
      expect(memoryManager.getMemoryMap()).toHaveLength(3);
      
      memoryManager.clear();
      expect(memoryManager.getMemoryMap()).toHaveLength(0);
    });

    test('should reset RAM to zero', () => {
      memoryManager.configureRAM(0x0000, 0x1000);
      
      // Write some data
      memoryManager.write(0x0100, 0x42);
      memoryManager.write(0x0200, 0xAB);
      
      expect(memoryManager.read(0x0100)).toBe(0x42);
      expect(memoryManager.read(0x0200)).toBe(0xAB);
      
      // Reset RAM
      memoryManager.resetRAM();
      
      expect(memoryManager.read(0x0100)).toBe(0x00);
      expect(memoryManager.read(0x0200)).toBe(0x00);
    });

    test('should get all peripherals', () => {
      const peripheral1 = new MockPeripheral();
      const peripheral2 = new MockPeripheral();
      
      memoryManager.mapPeripheral(0xA000, 0xA003, peripheral1);
      memoryManager.mapPeripheral(0xB000, 0xB003, peripheral2);
      
      const peripherals = memoryManager.getPeripherals();
      expect(peripherals).toHaveLength(2);
      expect(peripherals).toContain(peripheral1);
      expect(peripherals).toContain(peripheral2);
    });

    test('should validate memory map for overlaps', () => {
      memoryManager.configureRAM(0x0000, 0x4000);
      memoryManager.loadROM(new Uint8Array([0x00]), 0x3000); // Overlaps with RAM
      
      const errors = memoryManager.validateMemoryMap();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('overlap');
    });
  });
});
descr
ibe('ROM File Loading', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, 'temp_rom_tests');
    await fs.promises.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary files
    try {
      await fs.promises.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should load binary ROM file', async () => {
    const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const filePath = path.join(tempDir, 'test.bin');
    
    await fs.promises.writeFile(filePath, testData);
    
    const romImage: ROMImage = {
      file: filePath,
      loadAddress: 0xF000,
      format: 'binary'
    };
    
    const loadedROM = await memoryManager.loadROMFromFile(romImage);
    
    expect(loadedROM.data).toEqual(testData);
    expect(loadedROM.loadAddress).toBe(0xF000);
    expect(memoryManager.read(0xF000)).toBe(0x01);
    expect(memoryManager.read(0xF003)).toBe(0x04);
  });

  test('should load Intel HEX ROM file', async () => {
    const hexContent = [
      ':020000040000FA',  // Extended linear address record
      ':10F00000010203040506070809101112131415167F', // Data at 0xF000
      ':00000001FF'       // End of file record
    ].join('\n');
    
    const filePath = path.join(tempDir, 'test.hex');
    await fs.promises.writeFile(filePath, hexContent);
    
    const romImage: ROMImage = {
      file: filePath,
      loadAddress: 0, // Will be determined from HEX file
      format: 'ihex'
    };
    
    const loadedROM = await memoryManager.loadROMFromFile(romImage);
    
    expect(loadedROM.loadAddress).toBe(0xF000);
    expect(loadedROM.data.length).toBe(16);
    expect(memoryManager.read(0xF000)).toBe(0x01);
    expect(memoryManager.read(0xF001)).toBe(0x02);
  });

  test('should load Motorola S-record ROM file', async () => {
    const srecContent = [
      'S00F000068656C6C6F202020202000003C',  // Header record
      'S113F000010203040506070809101112131415167E', // Data at 0xF000
      'S9030000FC'  // End record with start address
    ].join('\n');
    
    const filePath = path.join(tempDir, 'test.s19');
    await fs.promises.writeFile(filePath, srecContent);
    
    const romImage: ROMImage = {
      file: filePath,
      loadAddress: 0, // Will be determined from S-record file
      format: 'srec'
    };
    
    const loadedROM = await memoryManager.loadROMFromFile(romImage);
    
    expect(loadedROM.loadAddress).toBe(0xF000);
    expect(loadedROM.data.length).toBe(16);
    expect(memoryManager.read(0xF000)).toBe(0x01);
    expect(memoryManager.read(0xF00F)).toBe(0x16);
  });

  test('should load multiple ROM images', async () => {
    const rom1Data = new Uint8Array([0xEA]); // NOP
    const rom2Data = new Uint8Array([0x4C, 0x00, 0xF0]); // JMP $F000
    
    const file1 = path.join(tempDir, 'rom1.bin');
    const file2 = path.join(tempDir, 'rom2.bin');
    
    await fs.promises.writeFile(file1, rom1Data);
    await fs.promises.writeFile(file2, rom2Data);
    
    const romImages: ROMImage[] = [
      { file: file1, loadAddress: 0xF000, format: 'binary' },
      { file: file2, loadAddress: 0xE000, format: 'binary' }
    ];
    
    const loadedROMs = await memoryManager.loadMultipleROMs(romImages);
    
    expect(loadedROMs).toHaveLength(2);
    expect(memoryManager.read(0xF000)).toBe(0xEA);
    expect(memoryManager.read(0xE000)).toBe(0x4C);
    expect(memoryManager.read(0xE001)).toBe(0x00);
    expect(memoryManager.read(0xE002)).toBe(0xF0);
  });

  test('should handle ROM loading errors', async () => {
    const romImage: ROMImage = {
      file: '/nonexistent/file.bin',
      loadAddress: 0xF000,
      format: 'binary'
    };
    
    await expect(memoryManager.loadROMFromFile(romImage)).rejects.toThrow();
  });

  test('should handle invalid ROM format', async () => {
    const filePath = path.join(tempDir, 'invalid.hex');
    await fs.promises.writeFile(filePath, 'invalid hex content');
    
    const romImage: ROMImage = {
      file: filePath,
      loadAddress: 0xF000,
      format: 'ihex'
    };
    
    await expect(memoryManager.loadROMFromFile(romImage)).rejects.toThrow();
  });
});

describe('ROMLoader', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(__dirname, 'temp_loader_tests');
    await fs.promises.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.promises.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should validate Intel HEX files', async () => {
    const validHex = ':00000001FF\n'; // Minimal valid HEX file
    const invalidHex = 'not a hex file\n';
    
    const validFile = path.join(tempDir, 'valid.hex');
    const invalidFile = path.join(tempDir, 'invalid.hex');
    
    await fs.promises.writeFile(validFile, validHex);
    await fs.promises.writeFile(invalidFile, invalidHex);
    
    expect(await ROMLoader.validateROMFile(validFile, 'ihex')).toBe(true);
    expect(await ROMLoader.validateROMFile(invalidFile, 'ihex')).toBe(false);
  });

  test('should validate S-record files', async () => {
    const validSrec = 'S9030000FC\n'; // Minimal valid S-record file
    const invalidSrec = 'not an s-record file\n';
    
    const validFile = path.join(tempDir, 'valid.s19');
    const invalidFile = path.join(tempDir, 'invalid.s19');
    
    await fs.promises.writeFile(validFile, validSrec);
    await fs.promises.writeFile(invalidFile, invalidSrec);
    
    expect(await ROMLoader.validateROMFile(validFile, 'srec')).toBe(true);
    expect(await ROMLoader.validateROMFile(invalidFile, 'srec')).toBe(false);
  });

  test('should always validate binary files as true', async () => {
    const anyFile = path.join(tempDir, 'anything.bin');
    await fs.promises.writeFile(anyFile, 'any content');
    
    expect(await ROMLoader.validateROMFile(anyFile, 'binary')).toBe(true);
  });

  test('should handle file not found during validation', async () => {
    expect(await ROMLoader.validateROMFile('/nonexistent/file.bin', 'binary')).toBe(false);
  });
});