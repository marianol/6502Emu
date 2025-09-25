/**
 * Interrupt controller for managing IRQ/NMI signals
 */
export interface InterruptStatus {
    irqPending: boolean;
    nmiPending: boolean;
    irqSource?: string;
    nmiSource?: string;
}
/**
 * Interrupt controller manages IRQ and NMI signals from peripherals and debug interface
 */
export declare class InterruptController {
    private irqPending;
    private nmiPending;
    private irqSources;
    private nmiSources;
    private irqCallback?;
    private nmiCallback?;
    /**
     * Set callback functions for interrupt handling
     * @param irqCallback Function to call when IRQ is triggered
     * @param nmiCallback Function to call when NMI is triggered
     */
    setCallbacks(irqCallback: () => void, nmiCallback: () => void): void;
    /**
     * Trigger an IRQ from a specific source
     * @param source Name of the interrupt source
     */
    triggerIRQ(source?: string): void;
    /**
     * Trigger an NMI from a specific source
     * @param source Name of the interrupt source
     */
    triggerNMI(source?: string): void;
    /**
     * Clear IRQ from a specific source
     * @param source Name of the interrupt source
     */
    clearIRQ(source?: string): void;
    /**
     * Clear NMI from a specific source
     * @param source Name of the interrupt source
     */
    clearNMI(source?: string): void;
    /**
     * Clear all IRQ sources
     */
    clearAllIRQ(): void;
    /**
     * Clear all NMI sources
     */
    clearAllNMI(): void;
    /**
     * Get current interrupt status
     * @returns Current interrupt status
     */
    getInterruptStatus(): InterruptStatus;
    /**
     * Check if IRQ is pending
     * @returns true if IRQ is pending
     */
    isIRQPending(): boolean;
    /**
     * Check if NMI is pending
     * @returns true if NMI is pending
     */
    isNMIPending(): boolean;
    /**
     * Get all IRQ sources
     * @returns Array of IRQ source names
     */
    getIRQSources(): string[];
    /**
     * Get all NMI sources
     * @returns Array of NMI source names
     */
    getNMISources(): string[];
    /**
     * Reset the interrupt controller
     */
    reset(): void;
    /**
     * Update interrupt controller state based on peripheral interrupt sources
     * @param peripheralSources Array of peripheral names with pending interrupts
     */
    updateFromPeripherals(peripheralSources: string[]): void;
}
//# sourceMappingURL=interrupt-controller.d.ts.map