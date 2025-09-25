"use strict";
// Memory management system
// Handles memory mapping and routing between RAM, ROM, and I/O
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const rom_loader_1 = require("./rom-loader");
// RAM handler implementation
class RAMHandler {
    constructor(size, baseAddress) {
        this.data = new Uint8Array(size);
        this.baseAddress = baseAddress;
    }
    read(address) {
        const offset = address - this.baseAddress;
        if (offset < 0 || offset >= this.data.length) {
            console.warn(`RAM read out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
            return 0xFF;
        }
        return this.data[offset];
    }
    write(address, value) {
        const offset = address - this.baseAddress;
        if (offset < 0 || offset >= this.data.length) {
            console.warn(`RAM write out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
            return;
        }
        this.data[offset] = value & 0xFF;
    }
    clear() {
        this.data.fill(0);
    }
    getSize() {
        return this.data.length;
    }
}
// ROM handler implementation
class ROMHandler {
    constructor(data, baseAddress) {
        this.data = new Uint8Array(data);
        this.baseAddress = baseAddress;
    }
    read(address) {
        const offset = address - this.baseAddress;
        if (offset < 0 || offset >= this.data.length) {
            console.warn(`ROM read out of bounds: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
            return 0xFF;
        }
        return this.data[offset];
    }
    write(address, value) {
        console.error(`Attempt to write to ROM at $${address.toString(16).toUpperCase().padStart(4, '0')}: $${value.toString(16).toUpperCase().padStart(2, '0')}`);
        // ROM writes are ignored
    }
    getSize() {
        return this.data.length;
    }
    getData() {
        return new Uint8Array(this.data);
    }
}
// Peripheral handler wrapper
class PeripheralHandler {
    constructor(peripheral, baseAddress) {
        this.peripheral = peripheral;
        this.baseAddress = baseAddress;
    }
    read(address) {
        const offset = address - this.baseAddress;
        return this.peripheral.read(offset);
    }
    write(address, value) {
        const offset = address - this.baseAddress;
        this.peripheral.write(offset, value);
    }
    getPeripheral() {
        return this.peripheral;
    }
}
// Main memory manager implementation
class MemoryManager {
    constructor() {
        this.regions = [];
        this.ramHandler = null;
        // Initialize with default configuration
    }
    // Configure RAM region
    configureRAM(startAddress, size) {
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
    loadROM(data, startAddress) {
        // Remove any existing ROM region that overlaps
        this.regions = this.regions.filter(region => region.type !== 'ROM' ||
            region.end < startAddress ||
            region.start > startAddress + data.length - 1);
        const romHandler = new ROMHandler(data, startAddress);
        this.regions.push({
            start: startAddress,
            end: startAddress + data.length - 1,
            type: 'ROM',
            handler: romHandler
        });
        this.sortRegions();
    }
    // Load ROM from file with format support
    async loadROMFromFile(romImage) {
        const loadedROM = await rom_loader_1.ROMLoader.loadROM(romImage);
        this.loadROM(loadedROM.data, loadedROM.loadAddress);
        return loadedROM;
    }
    // Load multiple ROM images
    async loadMultipleROMs(romImages) {
        const loadedROMs = [];
        for (const romImage of romImages) {
            try {
                const loadedROM = await this.loadROMFromFile(romImage);
                loadedROMs.push(loadedROM);
                console.log(`Loaded ROM: ${romImage.file} at $${loadedROM.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${loadedROM.data.length} bytes)`);
            }
            catch (error) {
                console.error(`Failed to load ROM ${romImage.file}:`, error);
                throw error;
            }
        }
        return loadedROMs;
    }
    // Map peripheral to memory address range
    mapPeripheral(startAddr, endAddr, peripheral) {
        // Remove any existing peripheral region that overlaps
        this.regions = this.regions.filter(region => region.type !== 'IO' ||
            region.end < startAddr ||
            region.start > endAddr);
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
    read(address) {
        const region = this.findRegion(address);
        if (region) {
            return region.handler.read(address);
        }
        // Unmapped memory returns 0xFF
        console.warn(`Read from unmapped memory: $${address.toString(16).toUpperCase().padStart(4, '0')}`);
        return 0xFF;
    }
    // Write to memory
    write(address, value) {
        const region = this.findRegion(address);
        if (region) {
            region.handler.write(address, value & 0xFF);
            return;
        }
        // Unmapped memory writes are ignored
        console.warn(`Write to unmapped memory: $${address.toString(16).toUpperCase().padStart(4, '0')} = $${value.toString(16).toUpperCase().padStart(2, '0')}`);
    }
    // Get memory map
    getMemoryMap() {
        return [...this.regions];
    }
    // Clear all memory regions
    clear() {
        this.regions = [];
        this.ramHandler = null;
    }
    // Reset RAM to zero
    resetRAM() {
        if (this.ramHandler) {
            this.ramHandler.clear();
        }
    }
    // Get all peripherals
    getPeripherals() {
        return this.regions
            .filter(region => region.type === 'IO')
            .map(region => region.handler.getPeripheral());
    }
    // Private helper methods
    findRegion(address) {
        for (const region of this.regions) {
            if (address >= region.start && address <= region.end) {
                return region;
            }
        }
        return null;
    }
    sortRegions() {
        this.regions.sort((a, b) => a.start - b.start);
    }
    // Validation helper
    validateMemoryMap() {
        const errors = [];
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
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=memory.js.map