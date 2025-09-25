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
export declare class PeripheralHub {
    private peripherals;
    /**
     * Register a peripheral with the hub
     * @param peripheral The peripheral instance to register
     * @param startAddress Starting address of the peripheral's memory range
     * @param endAddress Ending address of the peripheral's memory range
     * @param name Human-readable name for the peripheral
     */
    registerPeripheral(peripheral: Peripheral, startAddress: number, endAddress: number, name: string): void;
    /**
     * Unregister a peripheral from the hub
     * @param name Name of the peripheral to unregister
     */
    unregisterPeripheral(name: string): void;
    /**
     * Read from a peripheral at the given address
     * @param address Absolute memory address
     * @returns The value read, or 0xFF if no peripheral handles this address
     */
    read(address: number): number;
    /**
     * Write to a peripheral at the given address
     * @param address Absolute memory address
     * @param value Value to write
     */
    write(address: number, value: number): void;
    /**
     * Reset all registered peripherals
     */
    reset(): void;
    /**
     * Tick all registered peripherals
     * @param cycles Number of CPU cycles that have elapsed
     */
    tick(cycles: number): void;
    /**
     * Get interrupt status from all peripherals
     * @returns Array of peripheral names that have pending interrupts
     */
    getInterruptSources(): string[];
    /**
     * Get all registered peripherals
     * @returns Array of peripheral registrations
     */
    getPeripherals(): PeripheralRegistration[];
    /**
     * Check if an address is handled by any peripheral
     * @param address Memory address to check
     * @returns true if a peripheral handles this address
     */
    isPeripheralAddress(address: number): boolean;
    /**
     * Find the peripheral registration that handles the given address
     * @param address Memory address
     * @returns Peripheral registration or null if not found
     */
    private findPeripheral;
}
//# sourceMappingURL=base.d.ts.map