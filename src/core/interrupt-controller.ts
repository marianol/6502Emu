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
export class InterruptController {
  private irqPending = false;
  private nmiPending = false;
  private irqSources: Set<string> = new Set();
  private nmiSources: Set<string> = new Set();
  private irqCallback?: () => void;
  private nmiCallback?: () => void;
  private irqLineCallback?: (asserted: boolean) => void;

  /**
   * Set callback functions for interrupt handling
   * @param irqCallback Function to call when IRQ is triggered (rising edge only)
   * @param nmiCallback Function to call when NMI is triggered
   */
  setCallbacks(irqCallback: () => void, nmiCallback: () => void): void {
    this.irqCallback = irqCallback;
    this.nmiCallback = nmiCallback;
  }

  /**
   * Register a callback that follows the *level* of the combined IRQ line.
   * It is called with true when the line goes active (first source asserts)
   * and with false when it is released (last source clears, or reset).
   *
   * A 6502's /IRQ input is level-sensitive: it stays active until the device
   * is serviced, and the CPU re-checks it whenever the I flag allows. The
   * rising-edge irqCallback alone cannot model that (an interrupt raised
   * while the I flag is set would be lost, and a second source asserting
   * while another already holds the line would never be noticed).
   */
  setIrqLineCallback(callback: (asserted: boolean) => void): void {
    this.irqLineCallback = callback;
  }

  /**
   * Trigger an IRQ from a specific source
   * @param source Name of the interrupt source
   */
  triggerIRQ(source: string = 'unknown'): void {
    this.irqSources.add(source);
    if (!this.irqPending) {
      this.irqPending = true;
      if (this.irqCallback) {
        this.irqCallback();
      }
      if (this.irqLineCallback) {
        this.irqLineCallback(true);
      }
    }
  }

  /**
   * Trigger an NMI from a specific source
   * @param source Name of the interrupt source
   */
  triggerNMI(source: string = 'unknown'): void {
    this.nmiSources.add(source);
    if (!this.nmiPending) {
      this.nmiPending = true;
      if (this.nmiCallback) {
        this.nmiCallback();
      }
    }
  }

  /**
   * Clear IRQ from a specific source
   * @param source Name of the interrupt source
   */
  clearIRQ(source: string = 'unknown'): void {
    this.irqSources.delete(source);
    if (this.irqSources.size === 0) {
      this.releaseIrqLine();
    }
  }

  /**
   * Clear NMI from a specific source
   * @param source Name of the interrupt source
   */
  clearNMI(source: string = 'unknown'): void {
    this.nmiSources.delete(source);
    if (this.nmiSources.size === 0) {
      this.nmiPending = false;
    }
  }

  /**
   * Clear all IRQ sources
   */
  clearAllIRQ(): void {
    this.irqSources.clear();
    this.releaseIrqLine();
  }

  /**
   * Mark the combined IRQ line inactive, notifying the level callback only if
   * it was actually active (so repeated clears don't spam the CPU).
   */
  private releaseIrqLine(): void {
    const wasAsserted = this.irqPending;
    this.irqPending = false;
    if (wasAsserted && this.irqLineCallback) {
      this.irqLineCallback(false);
    }
  }

  /**
   * Clear all NMI sources
   */
  clearAllNMI(): void {
    this.nmiSources.clear();
    this.nmiPending = false;
  }

  /**
   * Get current interrupt status
   * @returns Current interrupt status
   */
  getInterruptStatus(): InterruptStatus {
    return {
      irqPending: this.irqPending,
      nmiPending: this.nmiPending,
      irqSource: this.irqSources.size > 0 ? Array.from(this.irqSources).join(', ') : undefined,
      nmiSource: this.nmiSources.size > 0 ? Array.from(this.nmiSources).join(', ') : undefined
    };
  }

  /**
   * Check if IRQ is pending
   * @returns true if IRQ is pending
   */
  isIRQPending(): boolean {
    return this.irqPending;
  }

  /**
   * Check if NMI is pending
   * @returns true if NMI is pending
   */
  isNMIPending(): boolean {
    return this.nmiPending;
  }

  /**
   * Get all IRQ sources
   * @returns Array of IRQ source names
   */
  getIRQSources(): string[] {
    return Array.from(this.irqSources);
  }

  /**
   * Get all NMI sources
   * @returns Array of NMI source names
   */
  getNMISources(): string[] {
    return Array.from(this.nmiSources);
  }

  /**
   * Reset the interrupt controller
   */
  reset(): void {
    this.releaseIrqLine();
    this.nmiPending = false;
    this.irqSources.clear();
    this.nmiSources.clear();
  }

  /**
   * Update interrupt controller state based on peripheral interrupt sources
   * @param peripheralSources Array of peripheral names with pending interrupts
   */
  updateFromPeripherals(peripheralSources: string[]): void {
    // Clear peripheral IRQ sources that are no longer active
    const currentPeripheralSources = Array.from(this.irqSources).filter(source => 
      source.startsWith('peripheral:')
    );
    
    for (const source of currentPeripheralSources) {
      const peripheralName = source.substring('peripheral:'.length);
      if (!peripheralSources.includes(peripheralName)) {
        this.clearIRQ(source);
      }
    }

    // Add new peripheral IRQ sources
    for (const peripheralName of peripheralSources) {
      const source = `peripheral:${peripheralName}`;
      if (!this.irqSources.has(source)) {
        this.triggerIRQ(source);
      }
    }
  }
}