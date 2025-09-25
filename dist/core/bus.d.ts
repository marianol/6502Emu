/**
 * System bus that coordinates CPU, memory, and peripherals
 */
import { CPU6502 } from './cpu';
import { MemoryManager } from './memory';
import { PeripheralHub } from '../peripherals/base';
import { InterruptController } from './interrupt-controller';
/**
 * System bus coordinates all major components
 */
export declare class SystemBus {
    private cpu;
    private memory;
    private peripheralHub;
    private interruptController;
    constructor();
    /**
     * Set up connections between components
     */
    private setupConnections;
    /**
     * Handle memory read operations
     * Routes to memory manager or peripheral hub based on address
     */
    private handleMemoryRead;
    /**
     * Handle memory write operations
     * Routes to memory manager or peripheral hub based on address
     */
    private handleMemoryWrite;
    /**
     * Execute one CPU instruction and update system state
     * @returns Number of cycles consumed
     */
    step(): number;
    /**
     * Reset the entire system
     */
    reset(): void;
    /**
     * Get access to system components for configuration
     */
    getCPU(): CPU6502;
    getMemory(): MemoryManager;
    getPeripheralHub(): PeripheralHub;
    getInterruptController(): InterruptController;
}
//# sourceMappingURL=bus.d.ts.map