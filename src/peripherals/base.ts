/**
 * Base peripheral interface that all peripheral components must implement
 */
export interface Peripheral {
  /**
   * Read from a peripheral register at the given offset
   * @param offset Register offset within the peripheral's address space
   * @returns The value read from the register
   */
  read(offset: number): number;

  /**
   * Write to a peripheral register at the given offset
   * @param offset Register offset within the peripheral's address space
   * @param value The value to write to the register
   */
  write(offset: number, value: number): void;

  /**
   * Reset the peripheral to its initial state
   */
  reset(): void;

  /**
   * Called each CPU cycle to update peripheral state
   * @param cycles Number of CPU cycles that have elapsed
   */
  tick(cycles: number): void;

  /**
   * Check if the peripheral has a pending interrupt
   * @returns true if an interrupt is pending
   */
  getInterruptStatus(): boolean;
}

/**
 * Peripheral registration information
 */
export interface PeripheralRegistration {
  peripheral: Peripheral;
  startAddress: number;
  endAddress: number;
  name: string;
}

/**
 * Hub for managing multiple peripheral components
 */
export class PeripheralHub {
  private peripherals: PeripheralRegistration[] = [];

  /**
   * Register a peripheral with the hub
   * @param peripheral The peripheral instance to register
   * @param startAddress Starting address of the peripheral's memory range
   * @param endAddress Ending address of the peripheral's memory range
   * @param name Human-readable name for the peripheral
   */
  registerPeripheral(
    peripheral: Peripheral,
    startAddress: number,
    endAddress: number,
    name: string
  ): void {
    // Check for address conflicts
    for (const existing of this.peripherals) {
      if (
        (startAddress >= existing.startAddress && startAddress <= existing.endAddress) ||
        (endAddress >= existing.startAddress && endAddress <= existing.endAddress) ||
        (startAddress <= existing.startAddress && endAddress >= existing.endAddress)
      ) {
        throw new Error(
          `Address conflict: ${name} (${startAddress.toString(16)}-${endAddress.toString(16)}) ` +
          `overlaps with ${existing.name} (${existing.startAddress.toString(16)}-${existing.endAddress.toString(16)})`
        );
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
  unregisterPeripheral(name: string): void {
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
  read(address: number): number {
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
  write(address: number, value: number): void {
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
  reset(): void {
    for (const registration of this.peripherals) {
      registration.peripheral.reset();
    }
  }

  /**
   * Tick all registered peripherals
   * @param cycles Number of CPU cycles that have elapsed
   */
  tick(cycles: number): void {
    for (const registration of this.peripherals) {
      registration.peripheral.tick(cycles);
    }
  }

  /**
   * Get interrupt status from all peripherals
   * @returns Array of peripheral names that have pending interrupts
   */
  getInterruptSources(): string[] {
    const sources: string[] = [];
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
  getPeripherals(): PeripheralRegistration[] {
    return [...this.peripherals];
  }

  /**
   * Check if an address is handled by any peripheral
   * @param address Memory address to check
   * @returns true if a peripheral handles this address
   */
  isPeripheralAddress(address: number): boolean {
    return this.findPeripheral(address) !== null;
  }

  /**
   * Find the peripheral registration that handles the given address
   * @param address Memory address
   * @returns Peripheral registration or null if not found
   */
  private findPeripheral(address: number): PeripheralRegistration | null {
    for (const registration of this.peripherals) {
      if (address >= registration.startAddress && address <= registration.endAddress) {
        return registration;
      }
    }
    return null;
  }
}