"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeripheralHub = void 0;
/**
 * Hub for managing multiple peripheral components
 */
class PeripheralHub {
    constructor() {
        this.peripherals = [];
    }
    /**
     * Register a peripheral with the hub
     * @param peripheral The peripheral instance to register
     * @param startAddress Starting address of the peripheral's memory range
     * @param endAddress Ending address of the peripheral's memory range
     * @param name Human-readable name for the peripheral
     */
    registerPeripheral(peripheral, startAddress, endAddress, name) {
        // Check for address conflicts
        for (const existing of this.peripherals) {
            if ((startAddress >= existing.startAddress && startAddress <= existing.endAddress) ||
                (endAddress >= existing.startAddress && endAddress <= existing.endAddress) ||
                (startAddress <= existing.startAddress && endAddress >= existing.endAddress)) {
                throw new Error(`Address conflict: ${name} (${startAddress.toString(16)}-${endAddress.toString(16)}) ` +
                    `overlaps with ${existing.name} (${existing.startAddress.toString(16)}-${existing.endAddress.toString(16)})`);
            }
        }
        this.peripherals.push({
            peripheral,
            startAddress,
            endAddress,
            name
        });
        // Sort by start address for efficient lookup
        this.peripherals.sort((a, b) => a.startAddress - b.startAddress);
    }
    /**
     * Unregister a peripheral from the hub
     * @param name Name of the peripheral to unregister
     */
    unregisterPeripheral(name) {
        const index = this.peripherals.findIndex(p => p.name === name);
        if (index !== -1) {
            this.peripherals.splice(index, 1);
        }
    }
    /**
     * Read from a peripheral at the given address
     * @param address Absolute memory address
     * @returns The value read, or 0xFF if no peripheral handles this address
     */
    read(address) {
        const registration = this.findPeripheral(address);
        if (registration) {
            const offset = address - registration.startAddress;
            return registration.peripheral.read(offset);
        }
        return 0xFF; // Return 0xFF for unmapped addresses
    }
    /**
     * Write to a peripheral at the given address
     * @param address Absolute memory address
     * @param value Value to write
     */
    write(address, value) {
        const registration = this.findPeripheral(address);
        if (registration) {
            const offset = address - registration.startAddress;
            registration.peripheral.write(offset, value);
        }
        // Ignore writes to unmapped addresses
    }
    /**
     * Reset all registered peripherals
     */
    reset() {
        for (const registration of this.peripherals) {
            registration.peripheral.reset();
        }
    }
    /**
     * Tick all registered peripherals
     * @param cycles Number of CPU cycles that have elapsed
     */
    tick(cycles) {
        for (const registration of this.peripherals) {
            registration.peripheral.tick(cycles);
        }
    }
    /**
     * Get interrupt status from all peripherals
     * @returns Array of peripheral names that have pending interrupts
     */
    getInterruptSources() {
        const sources = [];
        for (const registration of this.peripherals) {
            if (registration.peripheral.getInterruptStatus()) {
                sources.push(registration.name);
            }
        }
        return sources;
    }
    /**
     * Get all registered peripherals
     * @returns Array of peripheral registrations
     */
    getPeripherals() {
        return [...this.peripherals];
    }
    /**
     * Check if an address is handled by any peripheral
     * @param address Memory address to check
     * @returns true if a peripheral handles this address
     */
    isPeripheralAddress(address) {
        return this.findPeripheral(address) !== null;
    }
    /**
     * Find the peripheral registration that handles the given address
     * @param address Memory address
     * @returns Peripheral registration or null if not found
     */
    findPeripheral(address) {
        for (const registration of this.peripherals) {
            if (address >= registration.startAddress && address <= registration.endAddress) {
                return registration;
            }
        }
        return null;
    }
}
exports.PeripheralHub = PeripheralHub;
//# sourceMappingURL=base.js.map