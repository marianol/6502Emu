import { DebugInspectorImpl } from '../../src/debug/inspector';
import { CPU6502, CPUState, CPUType } from '../../src/core/cpu';
import { MemoryManager } from '../../src/core/memory';
import { InterruptController, InterruptStatus } from '../../src/core/interrupt-controller';

// Mock implementations
class MockCPU implements CPU6502 {
  private registers: CPUState = {
    A: 0, X: 0, Y: 0, PC: 0x1000, SP: 0xFF, P: 0, cycles: 0
  };
  private breakpoints = new Set<number>();
  private cpuType: CPUType = '6502';

  reset(): void {
    this.registers = { A: 0, X: 0, Y: 0, PC: 0x1000, SP: 0xFF, P: 0, cycles: 0 };
  }

  step(): number {
    this.registers.PC++;
    this.registers.cycles += 2;
    return 2;
  }

  getRegisters(): CPUState {
    return { ...this.registers };
  }

  setRegisters(state: Partial<CPUState>): void {
    this.registers = { ...this.registers, ...state };
  }

  setBreakpoint(address: number): void {
    this.breakpoints.add(address);
  }

  removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
  }

  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  hasBreakpoint(address: number): boolean {
    return this.breakpoints.has(address);
  }

  setCPUType(type: CPUType): void {
    this.cpuType = type;
  }

  getCPUType(): CPUType {
    return this.cpuType;
  }

  triggerIRQ(): void {}
  triggerNMI(): void {}
  clearIRQ(): void {}
  isIRQPending(): boolean { return false; }
  isNMIPending(): boolean { return false; }
  setInterruptController(): void {}
  setMemoryCallbacks(): void {}

  // Test helpers
  setPC(pc: number): void {
    this.registers.PC = pc;
  }
}

class MockMemoryManager extends MemoryManager {
  private memory = new Uint8Array(0x10000);

  read(address: number): number {
    return this.memory[address & 0xFFFF];
  }

  write(address: number, value: number): void {
    this.memory[address & 0xFFFF] = value & 0xFF;
  }

  loadROM(data: Uint8Array, startAddress: number): void {
    for (let i = 0; i < data.length; i++) {
      this.memory[(startAddress + i) & 0xFFFF] = data[i];
    }
  }
}

class MockInterruptController {
  private irqPending = false;
  private nmiPending = false;

  triggerIRQ(source: string = 'test'): void {
    this.irqPending = true;
  }

  triggerNMI(source: string = 'test'): void {
    this.nmiPending = true;
  }

  clearIRQ(source: string = 'test'): void {
    this.irqPending = false;
  }

  getInterruptStatus(): InterruptStatus {
    return {
      irqPending: this.irqPending,
      nmiPending: this.nmiPending
    };
  }

  reset(): void {
    this.irqPending = false;
    this.nmiPending = false;
  }
}

describe('DebugInspector', () => {
  let cpu: MockCPU;
  let memory: MockMemoryManager;
  let interruptController: MockInterruptController;
  let inspector: DebugInspectorImpl;

  beforeEach(() => {
    cpu = new MockCPU();
    memory = new MockMemoryManager();
    interruptController = new MockInterruptController();
    inspector = new DebugInspectorImpl(cpu, memory, interruptController as any);
  });

  describe('breakpoint management', () => {
    it('should set and remove breakpoints', () => {
      inspector.setBreakpoint(0x2000);
      expect(inspector.getBreakpoints()).toContain(0x2000);
      expect(cpu.hasBreakpoint(0x2000)).toBe(true);

      inspector.removeBreakpoint(0x2000);
      expect(inspector.getBreakpoints()).not.toContain(0x2000);
      expect(cpu.hasBreakpoint(0x2000)).toBe(false);
    });

    it('should clear all breakpoints', () => {
      inspector.setBreakpoint(0x2000);
      inspector.setBreakpoint(0x3000);
      expect(inspector.getBreakpoints()).toHaveLength(2);

      inspector.clearAllBreakpoints();
      expect(inspector.getBreakpoints()).toHaveLength(0);
    });

    it('should mask addresses to 16-bit', () => {
      inspector.setBreakpoint(0x12000); // Should be masked to 0x2000
      expect(inspector.getBreakpoints()).toContain(0x2000);
    });
  });

  describe('execution control', () => {
    it('should step through instructions', () => {
      const initialPC = cpu.getRegisters().PC;
      const hitBreakpoint = inspector.step();

      expect(hitBreakpoint).toBe(false);
      expect(cpu.getRegisters().PC).toBe(initialPC + 1);
    });

    it('should detect breakpoint hits during step', () => {
      cpu.setPC(0x1999);
      inspector.setBreakpoint(0x199A); // PC will be 0x199A after step
      
      const hitBreakpoint = inspector.step();
      expect(hitBreakpoint).toBe(true);
      expect(inspector.isRunning()).toBe(false);
    });

    it('should reset CPU and clear state', () => {
      inspector.enableTracing(true);
      inspector.step();
      inspector.step();

      inspector.reset();

      expect(cpu.getRegisters().PC).toBe(0x1000);
      expect(inspector.getTrace()).toHaveLength(0);
      expect(inspector.isRunning()).toBe(false);
    });

    it('should stop execution', () => {
      inspector.stop();
      expect(inspector.isRunning()).toBe(false);
    });
  });

  describe('tracing', () => {
    it('should enable and disable tracing', () => {
      expect(inspector.isTracingEnabled()).toBe(false);

      inspector.enableTracing(true);
      expect(inspector.isTracingEnabled()).toBe(true);

      inspector.enableTracing(false);
      expect(inspector.isTracingEnabled()).toBe(false);
    });

    it('should record trace entries when enabled', () => {
      memory.write(0x1000, 0xEA); // NOP
      inspector.enableTracing(true);

      inspector.step();

      const trace = inspector.getTrace();
      expect(trace).toHaveLength(1);
      expect(trace[0].address).toBe(0x1000);
      expect(trace[0].opcode).toBe(0xEA);
      expect(trace[0].instruction).toContain('NOP');
    });

    it('should not record trace entries when disabled', () => {
      inspector.enableTracing(false);
      inspector.step();

      expect(inspector.getTrace()).toHaveLength(0);
    });

    it('should clear trace when disabling', () => {
      inspector.enableTracing(true);
      inspector.step();
      expect(inspector.getTrace()).toHaveLength(1);

      inspector.enableTracing(false);
      expect(inspector.getTrace()).toHaveLength(0);
    });

    it('should limit trace entries', () => {
      inspector.setMaxTraceEntries(2);
      inspector.enableTracing(true);

      inspector.step();
      inspector.step();
      inspector.step();

      expect(inspector.getTrace()).toHaveLength(2);
    });

    it('should clear trace manually', () => {
      inspector.enableTracing(true);
      inspector.step();
      expect(inspector.getTrace()).toHaveLength(1);

      inspector.clearTrace();
      expect(inspector.getTrace()).toHaveLength(0);
    });
  });

  describe('execution statistics', () => {
    it('should track execution statistics', () => {
      inspector.step();
      inspector.step();

      const stats = inspector.getExecutionStats();
      expect(stats.totalInstructions).toBe(2);
      expect(stats.totalCycles).toBe(4);
    });

    it('should reset statistics', () => {
      inspector.step();
      inspector.resetStats();

      const stats = inspector.getExecutionStats();
      expect(stats.totalInstructions).toBe(0);
      expect(stats.totalCycles).toBe(0);
    });
  });

  describe('interrupt generation', () => {
    it('should trigger IRQ', () => {
      inspector.triggerIRQ();
      const status = interruptController.getInterruptStatus();
      expect(status.irqPending).toBe(true);
    });

    it('should trigger NMI', () => {
      inspector.triggerNMI();
      const status = interruptController.getInterruptStatus();
      expect(status.nmiPending).toBe(true);
    });

    it('should clear IRQ', () => {
      inspector.triggerIRQ();
      inspector.clearIRQ();
      const status = interruptController.getInterruptStatus();
      expect(status.irqPending).toBe(false);
    });
  });

  describe('state inspection', () => {
    it('should return CPU state', () => {
      const state = inspector.getCPUState();
      expect(state.PC).toBe(0x1000);
      expect(state.SP).toBe(0xFF);
    });

    it('should return current address', () => {
      expect(inspector.getCurrentAddress()).toBe(0x1000);
    });

    it('should track running state', () => {
      expect(inspector.isRunning()).toBe(false);
      // Running state is managed internally during run/stop operations
    });
  });
});