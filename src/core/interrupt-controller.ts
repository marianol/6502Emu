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

  /**
   * Set callback functions for interrupt handling
   * @param irqCallback Function to call when IRQ is triggered
   * @param nmiCallback Function to call when NMI is triggered
   */
  setCallbacks(irqCallback: () => void, nmiCallback: () => void): void {
    this.irqCallback = irqCallback;
    this.nmiCallback = nmiCallback;
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
      this.irqPending = false;
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
    this.irqPending = false;
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
    this.irqPending = false;
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