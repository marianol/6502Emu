import { Peripheral, PeripheralHub } from '../../src/peripherals/base';
import { InterruptController } from '../../src/core/interrupt-controller';

// Mock peripheral implementation for testing
class MockPeripheral implements Peripheral {
  private registers: number[] = [0, 0, 0, 0];
  private interruptPending = false;
  private tickCount = 0;

  read(offset: number): number {
    return this.registers[offset] || 0xFF;
  }

  write(offset: number, value: number): void {
    this.registers[offset] = value & 0xFF;
    // Simulate interrupt on write to register 3
    if (offset === 3 && value !== 0) {
      this.interruptPending = true;
    }
  }

  reset(): void {
    this.registers = [0, 0, 0, 0];
    this.interruptPending = false;
    this.tickCount = 0;
  }

  tick(cycles: number): void {
    this.tickCount += cycles;
  }

  getInterruptStatus(): boolean {
    return this.interruptPending;
  }

  // Test helper methods
  getTickCount(): number {
    return this.tickCount;
  }

  clearInterrupt(): void {
    this.interruptPending = false;
  }
}

describe('PeripheralHub', () => {
  let hub: PeripheralHub;
  let peripheral1: MockPeripheral;
  let peripheral2: MockPeripheral;

  beforeEach(() => {
    hub = new PeripheralHub();
    peripheral1 = new MockPeripheral();
    peripheral2 = new MockPeripheral();
  });

  describe('peripheral registration', () => {
    test('should register peripheral successfully', () => {
      expect(() => {
        hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');
      }).not.toThrow();

      const peripherals = hub.getPeripherals();
      expect(peripherals).toHaveLength(1);
      expect(peripherals[0].name).toBe('test1');
      expect(peripherals[0].startAddress).toBe(0x8000);
      expect(peripherals[0].endAddress).toBe(0x8003);
    });

    test('should detect address conflicts', () => {
      hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');

      // Overlapping range should throw
      expect(() => {
        hub.registerPeripheral(peripheral2, 0x8002, 0x8005, 'test2');
      }).toThrow(/Address conflict/);

      // Contained range should throw
      expect(() => {
        hub.registerPeripheral(peripheral2, 0x8001, 0x8002, 'test2');
      }).toThrow(/Address conflict/);

      // Containing range should throw
      expect(() => {
        hub.registerPeripheral(peripheral2, 0x7FFF, 0x8004, 'test2');
      }).toThrow(/Address conflict/);
    });

    test('should allow non-overlapping ranges', () => {
      hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');
      
      expect(() => {
        hub.registerPeripheral(peripheral2, 0x8004, 0x8007, 'test2');
      }).not.toThrow();

      expect(hub.getPeripherals()).toHaveLength(2);
    });

    test('should unregister peripheral', () => {
      hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');
      hub.registerPeripheral(peripheral2, 0x8004, 0x8007, 'test2');

      hub.unregisterPeripheral('test1');
      
      const peripherals = hub.getPeripherals();
      expect(peripherals).toHaveLength(1);
      expect(peripherals[0].name).toBe('test2');
    });
  });

  describe('address mapping', () => {
    beforeEach(() => {
      hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');
      hub.registerPeripheral(peripheral2, 0x9000, 0x9003, 'test2');
    });

    test('should route reads to correct peripheral', () => {
      peripheral1.write(1, 0x42);
      peripheral2.write(2, 0x84);

      expect(hub.read(0x8001)).toBe(0x42);
      expect(hub.read(0x9002)).toBe(0x84);
    });

    test('should route writes to correct peripheral', () => {
      hub.write(0x8001, 0x42);
      hub.write(0x9002, 0x84);

      expect(peripheral1.read(1)).toBe(0x42);
      expect(peripheral2.read(2)).toBe(0x84);
    });

    test('should return 0xFF for unmapped reads', () => {
      expect(hub.read(0x7FFF)).toBe(0xFF);
      expect(hub.read(0x8004)).toBe(0xFF);
      expect(hub.read(0x8FFF)).toBe(0xFF);
    });

    test('should ignore writes to unmapped addresses', () => {
      // Should not throw
      expect(() => {
        hub.write(0x7FFF, 0x42);
        hub.write(0x8004, 0x42);
        hub.write(0x8FFF, 0x42);
      }).not.toThrow();
    });

    test('should check if address is handled by peripheral', () => {
      expect(hub.isPeripheralAddress(0x8000)).toBe(true);
      expect(hub.isPeripheralAddress(0x8003)).toBe(true);
      expect(hub.isPeripheralAddress(0x9000)).toBe(true);
      expect(hub.isPeripheralAddress(0x9003)).toBe(true);
      
      expect(hub.isPeripheralAddress(0x7FFF)).toBe(false);
      expect(hub.isPeripheralAddress(0x8004)).toBe(false);
      expect(hub.isPeripheralAddress(0x8FFF)).toBe(false);
    });
  });

  describe('peripheral control', () => {
    beforeEach(() => {
      hub.registerPeripheral(peripheral1, 0x8000, 0x8003, 'test1');
      hub.registerPeripheral(peripheral2, 0x9000, 0x9003, 'test2');
    });

    test('should reset all peripherals', () => {
      peripheral1.write(1, 0x42);
      peripheral2.write(2, 0x84);

      hub.reset();

      expect(peripheral1.read(1)).toBe(0);
      expect(peripheral2.read(2)).toBe(0);
    });

    test('should tick all peripherals', () => {
      hub.tick(10);

      expect(peripheral1.getTickCount()).toBe(10);
      expect(peripheral2.getTickCount()).toBe(10);
    });

    test('should collect interrupt sources', () => {
      // No interrupts initially
      expect(hub.getInterruptSources()).toEqual([]);

      // Trigger interrupt on peripheral1
      peripheral1.write(3, 0x01);
      expect(hub.getInterruptSources()).toEqual(['test1']);

      // Trigger interrupt on peripheral2
      peripheral2.write(3, 0x01);
      expect(hub.getInterruptSources()).toEqual(['test1', 'test2']);

      // Clear interrupt on peripheral1
      peripheral1.clearInterrupt();
      expect(hub.getInterruptSources()).toEqual(['test2']);
    });
  });
});

describe('InterruptController', () => {
  let controller: InterruptController;
  let irqCallbackCount = 0;
  let nmiCallbackCount = 0;

  beforeEach(() => {
    controller = new InterruptController();
    irqCallbackCount = 0;
    nmiCallbackCount = 0;

    controller.setCallbacks(
      () => irqCallbackCount++,
      () => nmiCallbackCount++
    );
  });

  describe('IRQ handling', () => {
    test('should trigger IRQ from source', () => {
      controller.triggerIRQ('test-source');

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toEqual(['test-source']);
      expect(irqCallbackCount).toBe(1);
    });

    test('should not trigger callback for duplicate IRQ from same source', () => {
      controller.triggerIRQ('test-source');
      controller.triggerIRQ('test-source');

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toEqual(['test-source']);
      expect(irqCallbackCount).toBe(1);
    });

    test('should handle multiple IRQ sources', () => {
      controller.triggerIRQ('source1');
      controller.triggerIRQ('source2');

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toContain('source1');
      expect(controller.getIRQSources()).toContain('source2');
      expect(irqCallbackCount).toBe(1); // Only first trigger calls callback
    });

    test('should clear IRQ from specific source', () => {
      controller.triggerIRQ('source1');
      controller.triggerIRQ('source2');

      controller.clearIRQ('source1');

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toEqual(['source2']);
    });

    test('should clear IRQ when all sources cleared', () => {
      controller.triggerIRQ('source1');
      controller.triggerIRQ('source2');

      controller.clearIRQ('source1');
      controller.clearIRQ('source2');

      expect(controller.isIRQPending()).toBe(false);
      expect(controller.getIRQSources()).toEqual([]);
    });

    test('should clear all IRQ sources', () => {
      controller.triggerIRQ('source1');
      controller.triggerIRQ('source2');

      controller.clearAllIRQ();

      expect(controller.isIRQPending()).toBe(false);
      expect(controller.getIRQSources()).toEqual([]);
    });
  });

  describe('NMI handling', () => {
    test('should trigger NMI from source', () => {
      controller.triggerNMI('test-source');

      expect(controller.isNMIPending()).toBe(true);
      expect(controller.getNMISources()).toEqual(['test-source']);
      expect(nmiCallbackCount).toBe(1);
    });

    test('should handle multiple NMI sources', () => {
      controller.triggerNMI('source1');
      controller.triggerNMI('source2');

      expect(controller.isNMIPending()).toBe(true);
      expect(controller.getNMISources()).toContain('source1');
      expect(controller.getNMISources()).toContain('source2');
      expect(nmiCallbackCount).toBe(1);
    });

    test('should clear NMI from specific source', () => {
      controller.triggerNMI('source1');
      controller.triggerNMI('source2');

      controller.clearNMI('source1');

      expect(controller.isNMIPending()).toBe(true);
      expect(controller.getNMISources()).toEqual(['source2']);
    });
  });

  describe('peripheral integration', () => {
    test('should update from peripheral sources', () => {
      // Simulate peripherals with interrupts
      controller.updateFromPeripherals(['acia', 'via']);

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toContain('peripheral:acia');
      expect(controller.getIRQSources()).toContain('peripheral:via');
    });

    test('should clear peripheral sources when no longer active', () => {
      controller.updateFromPeripherals(['acia', 'via']);
      controller.updateFromPeripherals(['acia']);

      expect(controller.isIRQPending()).toBe(true);
      expect(controller.getIRQSources()).toEqual(['peripheral:acia']);
    });

    test('should preserve non-peripheral sources', () => {
      controller.triggerIRQ('debug');
      controller.updateFromPeripherals(['acia']);

      expect(controller.getIRQSources()).toContain('debug');
      expect(controller.getIRQSources()).toContain('peripheral:acia');
    });
  });

  describe('status reporting', () => {
    test('should report interrupt status', () => {
      controller.triggerIRQ('source1');
      controller.triggerNMI('source2');

      const status = controller.getInterruptStatus();
      expect(status.irqPending).toBe(true);
      expect(status.nmiPending).toBe(true);
      expect(status.irqSource).toBe('source1');
      expect(status.nmiSource).toBe('source2');
    });

    test('should report multiple sources in status', () => {
      controller.triggerIRQ('source1');
      controller.triggerIRQ('source2');

      const status = controller.getInterruptStatus();
      expect(status.irqSource).toContain('source1');
      expect(status.irqSource).toContain('source2');
    });
  });

  describe('reset', () => {
    test('should reset all interrupt state', () => {
      controller.triggerIRQ('source1');
      controller.triggerNMI('source2');

      controller.reset();

      expect(controller.isIRQPending()).toBe(false);
      expect(controller.isNMIPending()).toBe(false);
      expect(controller.getIRQSources()).toEqual([]);
      expect(controller.getNMISources()).toEqual([]);
    });
  });
});