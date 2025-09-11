/**
 * System bus that coordinates CPU, memory, and peripherals
 */

import { CPU6502, CPU6502Emulator } from './cpu';
import { MemoryManager } from './memory';
import { PeripheralHub } from '../peripherals/base';
import { InterruptController } from './interrupt-controller';

/**
 * System bus coordinates all major components
 */
export class SystemBus {
  private cpu: CPU6502;
  private memory: MemoryManager;
  private peripheralHub: PeripheralHub;
  private interruptController: InterruptController;

  constructor() {
    this.cpu = new CPU6502Emulator();
    this.memory = new MemoryManager();
    this.peripheralHub = new PeripheralHub();
    this.interruptController = new InterruptController();

    this.setupConnections();
  }

  /**
   * Set up connections between components
   */
  private setupConnections(): void {
    // Connect CPU to interrupt controller
    this.cpu.setInterruptController(this.interruptController);

    // Set up memory callbacks for CPU
    this.cpu.setMemoryCallbacks(
      (address: number) => this.handleMemoryRead(address),
      (address: number, value: number) => this.handleMemoryWrite(address, value)
    );
  }

  /**
   * Handle memory read operations
   * Routes to memory manager or peripheral hub based on address
   */
  private handleMemoryRead(address: number): number {
    if (this.peripheralHub.isPeripheralAddress(address)) {
      return this.peripheralHub.read(address);
    }
    return this.memory.read(address);
  }

  /**
   * Handle memory write operations
   * Routes to memory manager or peripheral hub based on address
   */
  private handleMemoryWrite(address: number, value: number): void {
    if (this.peripheralHub.isPeripheralAddress(address)) {
      this.peripheralHub.write(address, value);
    } else {
      this.memory.write(address, value);
    }
  }

  /**
   * Execute one CPU instruction and update system state
   * @returns Number of cycles consumed
   */
  step(): number {
    const cycles = this.cpu.step();
    
    // Update peripherals
    this.peripheralHub.tick(cycles);
    
    // Update interrupt controller with peripheral interrupt sources
    const interruptSources = this.peripheralHub.getInterruptSources();
    this.interruptController.updateFromPeripherals(interruptSources);
    
    return cycles;
  }

  /**
   * Reset the entire system
   */
  reset(): void {
    this.cpu.reset();
    this.memory.resetRAM();
    this.peripheralHub.reset();
    this.interruptController.reset();
  }

  /**
   * Get access to system components for configuration
   */
  getCPU(): CPU6502 {
    return this.cpu;
  }

  getMemory(): MemoryManager {
    return this.memory;
  }

  getPeripheralHub(): PeripheralHub {
    return this.peripheralHub;
  }

  getInterruptController(): InterruptController {
    return this.interruptController;
  }
}