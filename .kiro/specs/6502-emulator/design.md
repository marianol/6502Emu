# Design Document

## Overview

This design outlines the architecture for a homebrew computer emulator based on the 6502 processor. The system will integrate an existing open-source 6502 CPU emulator and extend it with custom memory mapping, peripheral simulation (particularly the Motorola 68B50 ACIA), and debugging capabilities tailored for homebrew computer development using the CC65 toolchain.

The emulator will be built as a modular system where the CPU core handles instruction execution while separate components manage memory mapping, peripheral simulation, and I/O operations. This approach allows for easy customization and extension for different homebrew computer configurations.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Host System   │    │   Emulator Core  │    │  Configuration  │
│                 │    │                  │    │                 │
│ • File I/O      │◄──►│ • CPU Emulator   │◄──►│ • Memory Map    │
│ • User Input    │    │ • Memory Manager │    │ • Peripheral    │
│ • Display       │    │ • Bus Controller │    │   Settings      │
│ • Debug UI      │    │ • Peripheral Hub │    │ • ROM Images    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │    Peripheral Bus    │
                    └──────────────────────┘
                                │
                ┌───────────────┼───────────────┼───────────────┐
                ▼               ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ 68B50 ACIA   │ │   65C22 VIA  │ │    Timers    │ │     GPIO     │
        │              │ │              │ │              │ │              │
        │ • Serial I/O │ │ • Parallel I/O│ │ • Interrupts │ │ • Digital I/O│
        │ • Baud Rate  │ │ • Timers     │ │ • Counters   │ │ • Pin States │
        │              │ │ • Interrupts │ │              │ │              │
        └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Core Components

1. **CPU Emulator Integration Layer**: Wraps an existing open-source 6502 emulator
2. **Memory Manager**: Handles memory mapping and routing between RAM, ROM, and I/O
3. **Peripheral Hub**: Manages communication with simulated hardware components
4. **Configuration System**: Loads and manages system configuration and ROM images
5. **Debug Interface**: Provides debugging, tracing, memory inspection, and manual interrupt generation
6. **Interrupt Controller**: Manages IRQ/NMI generation from peripherals and debug interface

## Components and Interfaces

### CPU Emulator Integration

**Purpose**: Integrate and wrap an existing 6502/65C02 emulator (candidates: lib6502, fake6502, or py65 with 65C02 support)

**Interface**:
```typescript
interface CPU6502 {
  reset(): void;
  step(): number; // returns cycles consumed
  getRegisters(): CPUState;
  setBreakpoint(address: number): void;
  removeBreakpoint(address: number): void;
  
  // CPU variant selection
  setCPUType(type: '6502' | '65C02'): void;
  getCPUType(): '6502' | '65C02';
  
  // Interrupt control
  triggerIRQ(): void;
  triggerNMI(): void;
  clearIRQ(): void;
  
  // Memory access callbacks
  onMemoryRead: (address: number) => number;
  onMemoryWrite: (address: number, value: number) => void;
}

interface CPUState {
  A: number;    // Accumulator
  X: number;    // X register
  Y: number;    // Y register
  PC: number;   // Program counter
  SP: number;   // Stack pointer
  P: number;    // Status flags
  cycles: number;
}
```

### Memory Manager

**Purpose**: Route memory accesses to appropriate handlers (RAM, ROM, peripherals)

**Interface**:
```typescript
interface MemoryManager {
  read(address: number): number;
  write(address: number, value: number): void;
  loadROM(data: Uint8Array, startAddress: number): void;
  mapPeripheral(startAddr: number, endAddr: number, peripheral: Peripheral): void;
  getMemoryMap(): MemoryRegion[];
}

interface MemoryRegion {
  start: number;
  end: number;
  type: 'RAM' | 'ROM' | 'IO';
  handler: MemoryHandler;
}
```

### Peripheral System

**Base Peripheral Interface**:
```typescript
interface Peripheral {
  read(offset: number): number;
  write(offset: number, value: number): void;
  reset(): void;
  tick(cycles: number): void; // Called each CPU cycle
  getInterruptStatus(): boolean;
}
```

**68B50 ACIA Implementation**:
```typescript
interface ACIA68B50 extends Peripheral {
  // Control Register ($00)
  setControlRegister(value: number): void;
  getStatusRegister(): number;
  
  // Data Register ($01)
  transmitData(data: number): void;
  receiveData(): number;
  
  // Configuration
  setBaudRate(rate: number): void;
  connectSerial(port: SerialPort): void;
}
```

**65C22 VIA Implementation**:
```typescript
interface VIA65C22 extends Peripheral {
  // Port A/B Data Registers
  readPortA(): number;
  writePortA(value: number): void;
  readPortB(): number;
  writePortB(value: number): void;
  
  // Data Direction Registers
  setPortADirection(mask: number): void;
  setPortBDirection(mask: number): void;
  
  // Timer functions
  setTimer1(value: number): void;
  setTimer2(value: number): void;
  getTimer1(): number;
  getTimer2(): number;
  
  // Interrupt control
  enableInterrupt(source: VIAInterruptSource): void;
  disableInterrupt(source: VIAInterruptSource): void;
  getInterruptFlags(): number;
  
  // Shift register
  setShiftRegister(value: number): void;
  getShiftRegister(): number;
}

enum VIAInterruptSource {
  CA2 = 0x01,
  CA1 = 0x02,
  SHIFT_REGISTER = 0x04,
  CB2 = 0x08,
  CB1 = 0x10,
  TIMER2 = 0x20,
  TIMER1 = 0x40
}
```

## Data Models

### System Configuration

```typescript
interface SystemConfig {
  memory: {
    ramSize: number;
    ramStart: number;
    romImages: ROMImage[];
  };
  
  peripherals: {
    acia: ACIAConfig;
    via: VIAConfig;
    timers: TimerConfig[];
    gpio: GPIOConfig;
  };
  
  cpu: {
    type: '6502' | '65C02';
    clockSpeed: number; // Hz
  };
  
  debugging: {
    enableTracing: boolean;
    breakOnReset: boolean;
    symbolFile?: string;
  };
}

interface ROMImage {
  file: string;
  loadAddress: number;
  format: 'binary' | 'ihex' | 'srec';
}

interface ACIAConfig {
  baseAddress: number;
  baudRate: number;
  serialPort?: string;
}

interface VIAConfig {
  baseAddress: number;
  portAConnections?: PortConnection[];
  portBConnections?: PortConnection[];
  enableTimers: boolean;
}

interface PortConnection {
  pin: number;
  device: string;
  type: 'input' | 'output' | 'bidirectional';
}
```

### Debug Information

```typescript
interface DebugState {
  cpu: CPUState;
  memory: MemorySnapshot;
  peripherals: PeripheralState[];
  executionTrace: TraceEntry[];
  breakpoints: number[];
}

interface TraceEntry {
  address: number;
  opcode: number;
  instruction: string;
  cycles: number;
  timestamp: number;
}

interface MemoryInspector {
  readRange(startAddr: number, length: number): Uint8Array;
  writeRange(startAddr: number, data: Uint8Array): void;
  searchMemory(pattern: Uint8Array): number[];
  compareMemory(addr1: number, addr2: number, length: number): boolean;
  dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string;
}

interface InterruptController {
  triggerIRQ(): void;
  triggerNMI(): void;
  clearIRQ(): void;
  getInterruptStatus(): InterruptStatus;
}

interface InterruptStatus {
  irqPending: boolean;
  nmiPending: boolean;
  irqSource?: string;
  nmiSource?: string;
}
```

## Error Handling

### Memory Access Errors
- **Invalid Address Access**: Log warning and return $FF for reads, ignore writes
- **ROM Write Attempts**: Log error and ignore write operation
- **Peripheral Errors**: Peripheral-specific error handling with status flags

### CPU Emulation Errors
- **Invalid Opcodes**: Handle according to base emulator behavior
- **Stack Overflow/Underflow**: Wrap around as per 6502 specification
- **Interrupt Handling**: Proper IRQ/NMI simulation with peripheral integration

### File I/O Errors
- **ROM Loading Failures**: Graceful error reporting with fallback options
- **Configuration Errors**: Validation with helpful error messages
- **Symbol File Issues**: Continue without symbols, log warnings

## Testing Strategy

### Unit Testing
- **CPU Integration**: Test CPU wrapper with known instruction sequences
- **Memory Manager**: Test memory mapping and routing logic
- **Peripheral Simulation**: Test each peripheral component independently
- **Configuration Loading**: Test various configuration scenarios

### Integration Testing
- **End-to-End Execution**: Test complete program execution cycles
- **Peripheral Interaction**: Test CPU-peripheral communication
- **Memory Mapping**: Test complex memory access patterns
- **Debug Features**: Test breakpoints, tracing, and inspection

### Compatibility Testing
- **CC65 Programs**: Test with various CC65-compiled programs
- **ROM Formats**: Test loading different ROM file formats
- **Hardware Scenarios**: Test different homebrew computer configurations

### Performance Testing
- **Execution Speed**: Benchmark against target performance requirements
- **Memory Usage**: Monitor memory consumption during execution
- **Real-time Constraints**: Test timing accuracy for time-sensitive code

## Implementation Notes

### 6502 Emulator Selection Criteria
- **Accuracy**: Cycle-accurate instruction execution
- **License Compatibility**: Open source with permissive licensing
- **Integration Ease**: Clean API for memory callbacks
- **Documentation**: Well-documented instruction set implementation
- **Community Support**: Active maintenance and bug fixes

### CC65 Compatibility Considerations
- **Memory Layout**: Support standard CC65 memory configurations
- **Runtime Library**: Ensure compatibility with CC65 runtime functions
- **Symbol Format**: Support CC65 debug symbol formats
- **Linking**: Handle CC65 linker output correctly

### Performance Optimization
- **Memory Access Caching**: Cache frequently accessed memory regions
- **Peripheral Polling**: Optimize peripheral update frequency
- **Instruction Dispatch**: Efficient opcode lookup and execution
- **Debug Overhead**: Minimize performance impact when debugging is disabled