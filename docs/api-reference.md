# API Reference v1.0

## Table of Contents

1. [Core Classes](#core-classes)
2. [Configuration](#configuration)
3. [CPU Interface](#cpu-interface)
4. [Memory Management](#memory-management)
5. [Peripherals](#peripherals)
6. [Debugging](#debugging)
7. [Performance](#performance)
8. [CC65 Integration](#cc65-integration)

## Core Classes

### Emulator

Main emulator class that coordinates all components.

```typescript
class Emulator {
  constructor(config?: SystemConfig)
  
  // Lifecycle
  async initialize(): Promise<void>
  reset(): void
  
  // Execution control
  start(): void
  stop(): void
  pause(): void
  resume(): void
  step(): number
  
  // Configuration
  async loadConfig(config: SystemConfig): Promise<void>
  async loadConfigFromFile(configPath: string): Promise<void>
  getConfig(): SystemConfig
  
  // Performance
  setClockSpeed(speed: number): void
  enableProfiling(enabled: boolean): void
  setAdaptiveSpeed(enabled: boolean): void
  
  // State access
  getState(): EmulatorState
  getStats(): ExecutionStats
  getPerformanceStats(): any
  
  // Component access
  getSystemBus(): SystemBus
  getMemoryInspector(): MemoryInspectorImpl
  getDebugInspector(): DebugInspectorImpl
  getProfiler(): EmulatorProfiler
  getOptimizer(): EmulatorOptimizer
  getSymbolParser(): CC65SymbolParser | undefined
}
```

#### EmulatorState

```typescript
enum EmulatorState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused',
  STEPPING = 'stepping',
  ERROR = 'error'
}
```

#### ExecutionStats

```typescript
interface ExecutionStats {
  totalCycles: number
  instructionsExecuted: number
  executionTimeMs: number
  averageIPS: number // Instructions per second
  clockSpeed: number // Actual clock speed in Hz
}
```

### SystemBus

Coordinates CPU, memory, and peripherals.

```typescript
class SystemBus {
  constructor()
  
  // Execution
  step(): number
  reset(): void
  
  // Component access
  getCPU(): CPU6502
  getMemory(): MemoryManager
  getPeripheralHub(): PeripheralHub
  getInterruptController(): InterruptController
}
```

## Configuration

### SystemConfig

```typescript
interface SystemConfig {
  cpu: {
    type: '6502' | '65C02'
    clockSpeed: number
  }
  
  memory: {
    ramSize: number
    ramStart: number
    romImages: ROMImage[]
  }
  
  peripherals: {
    acia?: ACIAConfig
    via?: VIAConfig
    timers?: TimerConfig[]
    gpio?: GPIOConfig
  }
  
  debugging: {
    enableTracing: boolean
    breakOnReset: boolean
    symbolFile?: string
  }
}
```

### ROMImage

```typescript
interface ROMImage {
  file: string
  loadAddress: number
  format: 'binary' | 'ihex' | 'srec'
}
```

### SystemConfigLoader

```typescript
class SystemConfigLoader {
  static getDefaultConfig(): SystemConfig
  static loadFromFile(configPath: string): SystemConfig
  static saveToFile(config: SystemConfig, configPath: string): void
  static validateConfig(config: SystemConfig): string[]
}
```

## CPU Interface

### CPU6502

```typescript
interface CPU6502 {
  // Execution control
  reset(): void
  step(): number
  
  // State access
  getRegisters(): CPUState
  setRegisters(state: Partial<CPUState>): void
  
  // Breakpoints
  setBreakpoint(address: number): void
  removeBreakpoint(address: number): void
  clearBreakpoints(): void
  hasBreakpoint(address: number): boolean
  
  // CPU variant
  setCPUType(type: CPUType): void
  getCPUType(): CPUType
  
  // Interrupts
  triggerIRQ(): void
  triggerNMI(): void
  clearIRQ(): void
  isIRQPending(): boolean
  isNMIPending(): boolean
  
  // Integration
  setInterruptController(controller: InterruptController): void
  setMemoryCallbacks(read: MemoryReadCallback, write: MemoryWriteCallback): void
}
```

### CPUState

```typescript
interface CPUState {
  A: number      // Accumulator
  X: number      // X register
  Y: number      // Y register
  PC: number     // Program counter
  SP: number     // Stack pointer
  P: number      // Status flags
  cycles: number // Total cycles executed
}
```

### CPUType

```typescript
type CPUType = '6502' | '65C02'
```

## Memory Management

### MemoryManager

```typescript
class MemoryManager {
  // Configuration
  configureRAM(startAddress: number, size: number): void
  loadROM(data: Uint8Array, startAddress: number): void
  async loadROMFromFile(romImage: ROMImage): Promise<LoadedROM>
  async loadMultipleROMs(romImages: ROMImage[]): Promise<LoadedROM[]>
  mapPeripheral(startAddr: number, endAddr: number, peripheral: Peripheral): void
  
  // Access
  read(address: number): number
  write(address: number, value: number): void
  
  // Inspection
  getMemoryMap(): MemoryRegion[]
  clear(): void
  resetRAM(): void
  getPeripherals(): Peripheral[]
  validateMemoryMap(): string[]
}
```

### MemoryRegion

```typescript
interface MemoryRegion {
  start: number
  end: number
  type: 'RAM' | 'ROM' | 'IO'
  handler: MemoryHandler
}
```

### MemoryHandler

```typescript
interface MemoryHandler {
  read(address: number): number
  write(address: number, value: number): void
}
```

## Peripherals

### Peripheral

Base interface for all peripherals.

```typescript
interface Peripheral {
  read(offset: number): number
  write(offset: number, value: number): void
  reset(): void
  tick(cycles: number): void
  getInterruptStatus(): boolean
}
```

### ACIA68B50

68B50 ACIA (Asynchronous Communications Interface Adapter) implementation.

```typescript
class ACIA68B50 implements Peripheral {
  // Configuration
  setBaudRate(rate: number): void
  connectSerial(port: SerialPort): void
  
  // Control registers
  setControlRegister(value: number): void
  getStatusRegister(): number
  
  // Data transfer
  transmitData(data: number): void
  receiveData(): number
  
  // Peripheral interface
  read(offset: number): number
  write(offset: number, value: number): void
  reset(): void
  tick(cycles: number): void
  getInterruptStatus(): boolean
}
```

#### ACIA Register Map

| Offset | Read | Write |
|--------|------|-------|
| 0x00 | Status Register | Control Register |
| 0x01 | Receive Data | Transmit Data |

#### Status Register Bits

| Bit | Name | Description |
|-----|------|-------------|
| 0 | RDRF | Receive Data Register Full |
| 1 | TDRE | Transmit Data Register Empty |
| 2 | DCD | Data Carrier Detect |
| 3 | CTS | Clear To Send |
| 4 | FE | Framing Error |
| 5 | OVRN | Receiver Overrun |
| 6 | PE | Parity Error |
| 7 | IRQ | Interrupt Request |

### VIA65C22

65C22 VIA (Versatile Interface Adapter) implementation.

```typescript
class VIA65C22Implementation implements Peripheral {
  // Port operations
  readPortA(): number
  writePortA(value: number): void
  readPortB(): number
  writePortB(value: number): void
  setPortADirection(mask: number): void
  setPortBDirection(mask: number): void
  
  // Timer operations
  setTimer1(value: number): void
  setTimer2(value: number): void
  getTimer1(): number
  getTimer2(): number
  
  // Interrupt control
  enableInterrupt(source: VIAInterruptSource): void
  disableInterrupt(source: VIAInterruptSource): void
  getInterruptFlags(): number
  
  // Shift register
  setShiftRegister(value: number): void
  getShiftRegister(): number
  
  // Peripheral interface
  read(offset: number): number
  write(offset: number, value: number): void
  reset(): void
  tick(cycles: number): void
  getInterruptStatus(): boolean
}
```

#### VIA Register Map

| Offset | Register | Description |
|--------|----------|-------------|
| 0x00 | IRB/ORB | Input/Output Register B |
| 0x01 | IRA/ORA | Input/Output Register A |
| 0x02 | DDRB | Data Direction Register B |
| 0x03 | DDRA | Data Direction Register A |
| 0x04 | T1C-L | Timer 1 Counter Low |
| 0x05 | T1C-H | Timer 1 Counter High |
| 0x06 | T1L-L | Timer 1 Latch Low |
| 0x07 | T1L-H | Timer 1 Latch High |
| 0x08 | T2C-L | Timer 2 Counter Low |
| 0x09 | T2C-H | Timer 2 Counter High |
| 0x0A | SR | Shift Register |
| 0x0B | ACR | Auxiliary Control Register |
| 0x0C | PCR | Peripheral Control Register |
| 0x0D | IFR | Interrupt Flag Register |
| 0x0E | IER | Interrupt Enable Register |
| 0x0F | IRA/ORA | Input/Output Register A (no handshake) |

#### VIAInterruptSource

```typescript
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

### PeripheralHub

Manages multiple peripherals and their address mappings.

```typescript
class PeripheralHub {
  // Registration
  registerPeripheral(peripheral: Peripheral, startAddr: number, endAddr: number, name: string): void
  unregisterPeripheral(name: string): void
  
  // Access
  read(address: number): number
  write(address: number, value: number): void
  isPeripheralAddress(address: number): boolean
  
  // Management
  reset(): void
  tick(cycles: number): void
  getPeripherals(): PeripheralInfo[]
  getInterruptSources(): InterruptSource[]
}
```

## Debugging

### DebugInspectorImpl

Provides debugging and inspection capabilities.

```typescript
class DebugInspectorImpl {
  constructor(cpu: CPU6502, memory: MemoryManager, interruptController: InterruptController)
  
  // Execution tracing
  enableTracing(enabled: boolean): void
  getExecutionTrace(): TraceEntry[]
  clearTrace(): void
  
  // Manual interrupts
  triggerIRQ(): void
  triggerNMI(): void
  getInterruptStatus(): InterruptStatus
  
  // System state
  getCPUState(): CPUState
  getSystemState(): SystemState
}
```

### MemoryInspectorImpl

Memory inspection and manipulation tools.

```typescript
class MemoryInspectorImpl {
  constructor(memory: MemoryManager)
  
  // Range operations
  readRange(startAddr: number, length: number): Uint8Array
  writeRange(startAddr: number, data: Uint8Array): void
  
  // Search operations
  searchMemory(pattern: Uint8Array): number[]
  compareMemory(addr1: number, addr2: number, length: number): boolean
  
  // Display operations
  dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string
}
```

### TraceEntry

```typescript
interface TraceEntry {
  address: number
  opcode: number
  instruction: string
  cycles: number
  timestamp: number
}
```

### InterruptStatus

```typescript
interface InterruptStatus {
  irqPending: boolean
  nmiPending: boolean
  irqSource?: string
  nmiSource?: string
}
```

## Performance

### EmulatorProfiler

Performance profiling and analysis.

```typescript
class EmulatorProfiler {
  // Control
  enable(): void
  disable(): void
  reset(): void
  
  // Data collection
  recordSample(operation: ProfilerSample['operation'], address?: number, duration?: number): void
  startTiming(): number
  endTiming(startTime: number, operation: ProfilerSample['operation'], address?: number): void
  
  // Analysis
  getMetrics(): PerformanceMetrics
  getAnalysis(): PerformanceAnalysis
  exportData(): ProfilerExport
  
  // Configuration
  setMaxSamples(max: number): void
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  totalExecutionTime: number
  cpuTime: number
  memoryTime: number
  peripheralTime: number
  instructionCount: number
  cycleCount: number
  averageIPS: number
  averageCPS: number
  memoryAccesses: number
  peripheralAccesses: number
  breakpointChecks: number
}
```

### EmulatorOptimizer

Performance optimization tools.

```typescript
class EmulatorOptimizer {
  // Component access
  getMemoryManager(): OptimizedMemoryManager
  getSpeedController(): ExecutionSpeedController
  getBreakpointManager(): OptimizedBreakpointManager
  getPeripheralOptimizer(): PeripheralOptimizer
  
  // Optimization
  applyOptimizations(analysis: PerformanceAnalysis): void
  getStats(): OptimizationStats
}
```

### ExecutionSpeedController

Controls emulator execution speed.

```typescript
class ExecutionSpeedController {
  // Speed control
  setTargetSpeed(speed: number): void
  getTargetSpeed(): number
  setAdaptiveMode(enabled: boolean): void
  
  // Timing
  getCyclesPerChunk(): number
  calculateDelay(cyclesExecuted: number, executionTime: number): number
  updateActualSpeed(cyclesExecuted: number, timeElapsed: number): void
  
  // Status
  getActualSpeed(): number
  getEfficiency(): number
}
```

### EmulatorBenchmark

Standardized performance benchmarks.

```typescript
class EmulatorBenchmark {
  constructor(emulator: Emulator)
  
  // Benchmarks
  async runBenchmarkSuite(): Promise<BenchmarkSuite>
  
  // Export
  exportResults(suite: BenchmarkSuite): string
}
```

## CC65 Integration

### CC65SymbolParser

Parses CC65 debug symbol files.

```typescript
class CC65SymbolParser {
  // Symbol loading
  loadSymbolFile(filePath: string): void
  
  // Symbol lookup
  getSymbolAddress(name: string): number | undefined
  getSymbolName(address: number): string | undefined
  getAllSymbols(): Map<string, number>
  
  // Address ranges
  getSymbolsInRange(startAddr: number, endAddr: number): SymbolInfo[]
}
```

### CC65MemoryConfigurator

CC65 memory layout support.

```typescript
class CC65MemoryConfigurator {
  // Standard layouts
  static getHomebrewLayout(): CC65MemoryLayout
  static getAppleIILayout(): CC65MemoryLayout
  static getC64Layout(): CC65MemoryLayout
  
  // Custom layouts
  static createLayout(config: CC65LayoutConfig): CC65MemoryLayout
  static validateLayout(layout: CC65MemoryLayout): string[]
}
```

### CC65Compatibility

CC65 runtime compatibility utilities.

```typescript
class CC65Compatibility {
  // Runtime checks
  static checkRuntimeCompatibility(memory: MemoryManager): CompatibilityReport
  static validateMemoryLayout(layout: CC65MemoryLayout): string[]
  
  // Setup helpers
  static setupZeroPage(memory: MemoryManager): void
  static setupStack(memory: MemoryManager): void
  static setupHeap(memory: MemoryManager, startAddr: number, size: number): void
}
```

## Error Handling

### EmulatorError

Base error class for emulator-specific errors.

```typescript
class EmulatorError extends Error {
  constructor(message: string, public code: string, public context?: any)
}
```

### Common Error Codes

- `INVALID_CONFIG`: Configuration validation failed
- `MEMORY_ACCESS_ERROR`: Invalid memory access
- `PERIPHERAL_ERROR`: Peripheral operation failed
- `ROM_LOAD_ERROR`: ROM loading failed
- `CPU_ERROR`: CPU emulation error
- `INTERRUPT_ERROR`: Interrupt handling error

## Events

### EmulatorEvents

Event emitter for emulator state changes.

```typescript
interface EmulatorEvents {
  'state-changed': (newState: EmulatorState, oldState: EmulatorState) => void
  'breakpoint-hit': (address: number) => void
  'error': (error: EmulatorError) => void
  'performance-warning': (warning: PerformanceWarning) => void
  'peripheral-interrupt': (source: string) => void
}
```

## Type Definitions

### Common Types

```typescript
type Address = number
type Byte = number
type Word = number

interface MemoryReadCallback {
  (address: Address): Byte
}

interface MemoryWriteCallback {
  (address: Address, value: Byte): void
}
```

### Utility Functions

```typescript
// Address utilities
function toHex(value: number, width: number = 4): string
function fromHex(hex: string): number
function isValidAddress(address: number): boolean

// Byte utilities
function toByte(value: number): number
function toWord(low: number, high: number): number
function splitWord(word: number): [number, number]

// Timing utilities
function cyclesToMs(cycles: number, clockSpeed: number): number
function msToCycles(ms: number, clockSpeed: number): number
```