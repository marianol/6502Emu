// Memory management system
// Handles memory mapping and routing between RAM, ROM, and I/O

import { ROMLoader, LoadedROM } from './rom-loader';

// Base interface for memory handlers
export interface MemoryHandler {
  read(address: number): number;
  write(address: number, value: number): void;
}

// Peripheral interface for I/O devices
export interface Peripheral {
  read(offset: number): number;
  write(offset: number, value: number): void;
  reset(): void;
  tick(cycles: number): void;
  getInterruptStatus(): boolean;
}

// Memory region definition
export interface MemoryRegion {
  start: number;
  end: number;
  type: 'RAM' | 'ROM' | 'IO';
  handler: MemoryHandler;
}

// ROM image configuration
export interface ROMImage {
  file: string;
  loadAddress: number;
  format: 'binary' | 'ihex' | 'srec';
}

// RAM handler implementation
class RAMHandler implements MemoryHandler {
  private data: Uint8Array;
  private baseAddress: number;

  constructor(size: number, baseAddress: number) {
    this.data = new Uint8Array(size);
    this.baseAddress = baseAddress;
  }

  read(address: number): number {
    const offset = address - this.baseAddress;
    if (offset < 0 || offset >= this.data.length) {
      console.warn(`RAM read out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
      return 0xFF;
    }
    return this.data[offset];
  }

  write(address: number, value: number): void {
    const offset = address - this.baseAddress;
    if (offset < 0 || offset >= this.data.length) {
      console.warn(`RAM write out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
      return;
    }
    this.data[offset] = value & 0xFF;
  }

  clear(): void {
    this.data.fill(0);
  }

  getSize(): number {
    return this.data.length;
  }
}

// ROM handler implementation
class ROMHandler implements MemoryHandler {
  private data: Uint8Array;
  private baseAddress: number;

  constructor(data: Uint8Array, baseAddress: number) {
    this.data = new Uint8Array(data);
    this.baseAddress = baseAddress;
  }

  read(address: number): number {
    const offset = address - this.baseAddress;
    if (offset < 0 || offset >= this.data.length) {
      console.warn(`ROM read out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
      return 0xFF;
    }
    return this.data[offset];
  }

  write(address: number, value: number): void {
    console.error(`Attempt to write to ROM at $${address.toString(16).toUpperCase().padStart(4, '0')}: $${value.toString(16).toUpperCase().padStart(2, '0')}`);
    // ROM writes are ignored
  }

  getSize(): number {
    return this.data.length;
  }

  getData(): Uint8Array {
    return new Uint8Array(this.data);
  }
}

// Peripheral handler wrapper
class PeripheralHandler implements MemoryHandler {
  private peripheral: Peripheral;
  private baseAddress: number;

  constructor(peripheral: Peripheral, baseAddress: number) {
    this.peripheral = peripheral;
    this.baseAddress = baseAddress;
  }

  read(address: number): number {
    const offset = address - this.baseAddress;
    return this.peripheral.read(offset);
  }

  write(address: number, value: number): void {
    const offset = address - this.baseAddress;
    this.peripheral.write(offset, value);
  }

  getPeripheral(): Peripheral {
    return this.peripheral;
  }
}

// Main memory manager implementation
export class MemoryManager {
  private regions: MemoryRegion[] = [];
  private ramHandler: RAMHandler | null = null;

  constructor() {
    // Initialize with default configuration
  }

  // Configure RAM region
  configureRAM(startAddress: number, size: number): void {
    // Remove existing RAM region if present
    this.regions = this.regions.filter(region => region.type !== 'RAM');
    
    this.ramHandler = new RAMHandler(size, startAddress);
    this.regions.push({
      start: startAddress,
      end: startAddress + size - 1,
      type: 'RAM',
      handler: this.ramHandler
    });
    
    this.sortRegions();
  }

  // Load ROM data into memory
  loadROM(data: Uint8Array, startAddress: number): void {
    const endAddress = startAddress + data.length - 1;
    
    // Remove any existing ROM region that overlaps
    this.regions = this.regions.filter(region => 
      region.type !== 'ROM' || 
      region.end < startAddress || 
      region.start > endAddress
    );

    const romHandler = new ROMHandler(data, startAddress);
    this.regions.push({
      start: startAddress,
      end: endAddress,
      type: 'ROM',
      handler: romHandler
    });
    
    console.log(`ROM region added: $${startAddress.toString(16).toUpperCase().padStart(4, '0')}-$${endAddress.toString(16).toUpperCase().padStart(4, '0')}`);
    this.sortRegions();
  }

  // Load ROM from file with format support
  async loadROMFromFile(romImage: ROMImage): Promise<LoadedROM> {
    const loadedROM = await ROMLoader.loadROM(romImage);
    this.loadROM(loadedROM.data, loadedROM.loadAddress);
    return loadedROM;
  }

  // Load multiple ROM images
  async loadMultipleROMs(romImages: ROMImage[]): Promise<LoadedROM[]> {
    const loadedROMs: LoadedROM[] = [];
    
    for (const romImage of romImages) {
      try {
        const loadedROM = await this.loadROMFromFile(romImage);
        loadedROMs.push(loadedROM);
        console.log(`Loaded ROM: ${romImage.file} at $${loadedROM.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${loadedROM.data.length} bytes)`);
      } catch (error) {
        console.error(`Failed to load ROM ${romImage.file}:`, error);
        throw error;
      }
    }
    
    return loadedROMs;
  }

  // Map peripheral to memory address range
  mapPeripheral(startAddr: number, endAddr: number, peripheral: Peripheral): void {
    // Remove any existing peripheral region that overlaps
    this.regions = this.regions.filter(region => 
      region.type !== 'IO' || 
      region.end < startAddr || 
      region.start > endAddr
    );

    const peripheralHandler = new PeripheralHandler(peripheral, startAddr);
    this.regions.push({
      start: startAddr,
      end: endAddr,
      type: 'IO',
      handler: peripheralHandler
    });
    
    this.sortRegions();
  }

  // Read from memory
  read(address: number): number {
    const region = this.findRegion(address);
    if (region) {
      return region.handler.read(address);
    }
    
    // Unmapped memory returns 0xFF
    console.warn(`Read from unmapped memory: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
    return 0xFF;
  }

  // Write to memory
  write(address: number, value: number): void {
    const region = this.findRegion(address);
    if (region) {
      region.handler.write(address, value & 0xFF);
      return;
    }
    
    // Unmapped memory writes are ignored
    console.warn(`Write to unmapped memory: $${address.toString(16).toUpperCase().padStart(4, '0')} = $${value.toString(16).toUpperCase().padStart(2, '0')}`);
  }

  // Get memory map
  getMemoryMap(): MemoryRegion[] {
    return [...this.regions];
  }

  // Clear all memory regions
  clear(): void {
    this.regions = [];
    this.ramHandler = null;
  }

  // Reset RAM to zero
  resetRAM(): void {
    if (this.ramHandler) {
      this.ramHandler.clear();
    }
  }

  // Get all peripherals
  getPeripherals(): Peripheral[] {
    return this.regions
      .filter(region => region.type === 'IO')
      .map(region => (region.handler as PeripheralHandler).getPeripheral());
  }

  // Private helper methods
  private findRegion(address: number): MemoryRegion | null {
    // Find all regions that contain this address
    const matchingRegions = this.regions.filter(region => 
      address >= region.start && address <= region.end
    );
    
    if (matchingRegions.length === 0) {
      return null;
    }
    
    // If multiple regions match, prioritize by type: ROM > IO > RAM
    const priorityOrder = { 'ROM': 3, 'IO': 2, 'RAM': 1 };
    
    matchingRegions.sort((a, b) => {
      const priorityA = priorityOrder[a.type] || 0;
      const priorityB = priorityOrder[b.type] || 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    return matchingRegions[0];
  }

  private sortRegions(): void {
    this.regions.sort((a, b) => a.start - b.start);
  }

  // Validation helper
  validateMemoryMap(): string[] {
    const errors: string[] = [];
    
    for (let i = 0; i < this.regions.length - 1; i++) {
      const current = this.regions[i];
      const next = this.regions[i + 1];
      
      if (current.end >= next.start) {
        errors.push(`Memory regions overlap: $${current.start.toString(16).toUpperCase().padStart(4, '0')}-$${current.end.toString(16).toUpperCase().padStart(4, '0')} and $${next.start.toString(16).toUpperCase().padStart(4, '0')}-$${next.end.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }
    
    return errors;
  }
}