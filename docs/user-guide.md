# 6502 Emulator User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Loading Programs](#loading-programs)
6. [Using Peripherals](#using-peripherals)
7. [Debugging Features](#debugging-features)
8. [Performance Optimization](#performance-optimization)
9. [CC65 Integration](#cc65-integration)
10. [Troubleshooting](#troubleshooting)

## Introduction

The 6502 Emulator is a cycle-accurate emulator designed for homebrew computer development. It provides:

- Accurate 6502/65C02 CPU emulation using the fake6502 core
- Configurable memory mapping for RAM, ROM, and I/O
- Peripheral simulation (68B50 ACIA, 65C22 VIA)
- Comprehensive debugging tools
- CC65 toolchain compatibility
- Performance profiling and optimization

## Installation

### Prerequisites

- Node.js 16 or later
- Python 3.8+ (for native addon compilation)
- C++ compiler (GCC, Clang, or MSVC)

### Install Dependencies

```bash
npm install
```

### Build Native Components

```bash
npm run build
```

This compiles the fake6502 native addon for optimal performance.

## Quick Start

### Basic Usage

```typescript
import { Emulator } from './src/emulator';
import { SystemConfigLoader } from './src/config/system';

// Create emulator with default configuration
const config = SystemConfigLoader.getDefaultConfig();
const emulator = new Emulator(config);

// Initialize the system
await emulator.initialize();

// Load a simple program
const program = new Uint8Array([
  0xA9, 0x42,  // LDA #$42
  0x8D, 0x00, 0x02,  // STA $0200
  0x00         // BRK
]);

emulator.getSystemBus().getMemory().loadROM(program, 0x0200);

// Set starting address
emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });

// Execute program
emulator.start();

// Stop after some time
setTimeout(() => {
  emulator.stop();
  console.log('Execution completed');
}, 1000);
```

### Command Line Interface

```bash
# Run with default configuration
node src/cli.ts

# Load specific ROM file
node src/cli.ts --rom program.bin --load-address 0x8000

# Use custom configuration
node src/cli.ts --config my-system.json

# Enable debugging
node src/cli.ts --debug --breakpoint 0x0200
```

## Configuration

### System Configuration File

Create a JSON configuration file to define your system:

```json
{
  "cpu": {
    "type": "6502",
    "clockSpeed": 1000000
  },
  "memory": {
    "ramSize": 32768,
    "ramStart": 0,
    "romImages": [
      {
        "file": "monitor.bin",
        "loadAddress": 57344,
        "format": "binary"
      }
    ]
  },
  "peripherals": {
    "acia": {
      "baseAddress": 20480,
      "baudRate": 9600,
      "serialPort": "/dev/ttyUSB0"
    },
    "via": {
      "baseAddress": 24576,
      "enableTimers": true
    }
  },
  "debugging": {
    "enableTracing": false,
    "breakOnReset": false,
    "symbolFile": "program.sym"
  }
}
```

### Configuration Options

#### CPU Settings
- `type`: "6502" or "65C02"
- `clockSpeed`: Target clock speed in Hz

#### Memory Settings
- `ramSize`: RAM size in bytes
- `ramStart`: RAM starting address
- `romImages`: Array of ROM files to load

#### Peripheral Settings
- `acia`: 68B50 ACIA configuration
- `via`: 65C22 VIA configuration

#### Debug Settings
- `enableTracing`: Enable instruction tracing
- `breakOnReset`: Pause execution after reset
- `symbolFile`: CC65 symbol file for debugging

## Loading Programs

### ROM File Formats

The emulator supports multiple ROM file formats:

#### Binary Files
```typescript
const romImage = {
  file: "program.bin",
  loadAddress: 0x8000,
  format: "binary"
};
```

#### Intel HEX Files
```typescript
const romImage = {
  file: "program.hex",
  loadAddress: 0x0000, // Address from HEX file
  format: "ihex"
};
```

#### Motorola S-Record Files
```typescript
const romImage = {
  file: "program.s19",
  loadAddress: 0x0000, // Address from S-record
  format: "srec"
};
```

### Loading at Runtime

```typescript
// Load ROM programmatically
const romData = fs.readFileSync('program.bin');
emulator.getSystemBus().getMemory().loadROM(romData, 0x8000);

// Load multiple ROMs
await emulator.getSystemBus().getMemory().loadMultipleROMs([
  { file: "monitor.bin", loadAddress: 0xF000, format: "binary" },
  { file: "basic.bin", loadAddress: 0xA000, format: "binary" }
]);
```

## Using Peripherals

### 68B50 ACIA (Serial Communication)

#### Basic ACIA Usage

```assembly
; Initialize ACIA
LDA #$03        ; Master reset
STA $5000       ; ACIA control register
LDA #$11        ; 8N1, /16 clock, RTS low
STA $5000       ; Configure ACIA

; Send character
LDA #'A'        ; Character to send
STA $5001       ; ACIA data register

; Wait for transmission complete
@wait:
LDA $5000       ; Read status
AND #$02        ; Check TDRE (Transmit Data Register Empty)
BEQ @wait       ; Wait until ready

; Receive character
@receive:
LDA $5000       ; Read status
AND #$01        ; Check RDRF (Receive Data Register Full)
BEQ @receive    ; Wait for data
LDA $5001       ; Read received character
```

#### ACIA Configuration

```typescript
// Configure ACIA in system config
"acia": {
  "baseAddress": 0x5000,
  "baudRate": 9600,
  "serialPort": "/dev/ttyUSB0"  // Optional: connect to real serial port
}
```

### 65C22 VIA (Versatile Interface Adapter)

#### Port I/O Operations

```assembly
; Configure Port A as output, Port B as input
LDA #$FF        ; All bits output
STA $6003       ; DDRA (Data Direction Register A)
LDA #$00        ; All bits input
STA $6002       ; DDRB (Data Direction Register B)

; Write to Port A
LDA #$AA        ; Test pattern
STA $6001       ; ORA (Output Register A)

; Read from Port B
LDA $6000       ; IRB (Input Register B)
```

#### Timer Operations

```assembly
; Set up Timer 1 for 1ms interval (assuming 1MHz clock)
LDA #<1000      ; Low byte of count
STA $6004       ; T1C-L (Timer 1 Counter Low)
LDA #>1000      ; High byte of count (starts timer)
STA $6005       ; T1C-H (Timer 1 Counter High)

; Wait for timer to expire
@wait:
LDA $600D       ; IFR (Interrupt Flag Register)
AND #$40        ; Timer 1 flag
BEQ @wait       ; Wait for timeout

; Clear timer flag
LDA #$40
STA $600D       ; Clear Timer 1 interrupt flag
```

#### VIA Interrupts

```assembly
; Enable Timer 1 interrupt
LDA #$C0        ; Set bit 7 (master enable) and bit 6 (Timer 1)
STA $600E       ; IER (Interrupt Enable Register)

; Set up interrupt vector
LDA #<timer_isr
STA $FFFE       ; IRQ vector low
LDA #>timer_isr
STA $FFFF       ; IRQ vector high

; Enable CPU interrupts
CLI

timer_isr:
  ; Handle timer interrupt
  LDA $600D     ; Read IFR to identify interrupt source
  AND #$40      ; Check Timer 1 flag
  BEQ @exit     ; Not our interrupt
  
  ; Process timer interrupt
  ; ... your code here ...
  
  ; Clear interrupt flag
  LDA #$40
  STA $600D     ; Clear Timer 1 flag
  
@exit:
  RTI           ; Return from interrupt
```

## Debugging Features

### Breakpoints

```typescript
const cpu = emulator.getSystemBus().getCPU();

// Set breakpoint
cpu.setBreakpoint(0x0200);

// Remove breakpoint
cpu.removeBreakpoint(0x0200);

// Clear all breakpoints
cpu.clearBreakpoints();

// Check if address has breakpoint
if (cpu.hasBreakpoint(0x0200)) {
  console.log('Breakpoint set at 0x0200');
}
```

### Memory Inspection

```typescript
const memoryInspector = emulator.getMemoryInspector();

// Read memory range
const data = memoryInspector.readRange(0x0200, 16);

// Write memory range
const newData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
memoryInspector.writeRange(0x0300, newData);

// Search for pattern
const pattern = new Uint8Array([0xA9, 0x00]); // LDA #$00
const addresses = memoryInspector.searchMemory(pattern);

// Memory dump
const hexDump = memoryInspector.dumpMemory(0x0200, 64, 'hex');
console.log(hexDump);
```

### Execution Tracing

```typescript
const debugInspector = emulator.getDebugInspector();

// Enable tracing
debugInspector.enableTracing(true);

// Get execution trace
const trace = debugInspector.getExecutionTrace();
trace.forEach(entry => {
  console.log(`${entry.address.toString(16)}: ${entry.instruction} (${entry.cycles} cycles)`);
});

// Clear trace
debugInspector.clearTrace();
```

### Manual Interrupt Generation

```typescript
const debugInspector = emulator.getDebugInspector();

// Trigger IRQ
debugInspector.triggerIRQ();

// Trigger NMI
debugInspector.triggerNMI();

// Check interrupt status
const status = debugInspector.getInterruptStatus();
console.log(`IRQ pending: ${status.irqPending}`);
console.log(`NMI pending: ${status.nmiPending}`);
```

## Performance Optimization

### Profiling

```typescript
// Enable profiling
emulator.enableProfiling(true);

// Run your program
emulator.start();
await new Promise(resolve => setTimeout(resolve, 1000));
emulator.stop();

// Get performance metrics
const profiler = emulator.getProfiler();
const metrics = profiler.getMetrics();
const analysis = profiler.getAnalysis();

console.log(`Instructions per second: ${metrics.averageIPS}`);
console.log(`Efficiency: ${analysis.efficiency}%`);

// Export profiling data
const exportData = profiler.exportData();
fs.writeFileSync('profile.json', JSON.stringify(exportData, null, 2));
```

### Speed Control

```typescript
// Set target clock speed
emulator.setClockSpeed(2000000); // 2MHz

// Enable adaptive speed control
emulator.setAdaptiveSpeed(true);

// Get speed controller
const speedController = emulator.getOptimizer().getSpeedController();
console.log(`Target speed: ${speedController.getTargetSpeed()} Hz`);
console.log(`Actual speed: ${speedController.getActualSpeed()} Hz`);
console.log(`Efficiency: ${speedController.getEfficiency()}%`);
```

### Memory Caching

```typescript
const optimizer = emulator.getOptimizer();
const memoryManager = optimizer.getMemoryManager();

// Enable memory caching
memoryManager.enableCache(true);

// Get cache statistics
const cacheStats = memoryManager.getCacheStats();
console.log(`Cache hit rate: ${cacheStats.hitRate}%`);
console.log(`Cache size: ${cacheStats.size} entries`);
```

### Benchmarking

```typescript
import { EmulatorBenchmark } from './src/performance/benchmark';

const benchmark = new EmulatorBenchmark(emulator);

// Run complete benchmark suite
const suite = await benchmark.runBenchmarkSuite();

console.log(`Overall efficiency: ${suite.summary.overallEfficiency}%`);
console.log('Recommendations:');
suite.summary.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});

// Export benchmark results
const report = benchmark.exportResults(suite);
fs.writeFileSync('benchmark-report.md', report);
```

## CC65 Integration

### Compiling Programs

```bash
# Compile C program for 6502
cc65 -t none -O program.c
ca65 program.s
ld65 -C memory.cfg program.o -o program.bin

# Generate debug symbols
cc65 -t none -g -O program.c
ca65 -g program.s
ld65 -C memory.cfg -Ln program.sym program.o -o program.bin
```

### Memory Configuration

Create a memory configuration file for CC65:

```
MEMORY {
    ZP:     start = $0000, size = $0100, type = rw;
    RAM:    start = $0200, size = $7E00, type = rw;
    ROM:    start = $8000, size = $8000, type = ro;
}

SEGMENTS {
    ZEROPAGE: load = ZP,  type = zp;
    DATA:     load = RAM, type = rw;
    BSS:      load = RAM, type = bss;
    CODE:     load = ROM, type = ro;
}
```

### Loading CC65 Programs

```typescript
// Load CC65-compiled program
const config = {
  // ... other config ...
  "memory": {
    "ramSize": 32768,
    "ramStart": 0x0200,
    "romImages": [
      {
        "file": "program.bin",
        "loadAddress": 0x8000,
        "format": "binary"
      }
    ]
  },
  "debugging": {
    "symbolFile": "program.sym"
  }
};

const emulator = new Emulator(config);
await emulator.initialize();

// Symbols are automatically loaded if symbolFile is specified
const symbolParser = emulator.getSymbolParser();
if (symbolParser) {
  const mainAddress = symbolParser.getSymbolAddress('main');
  console.log(`main() is at address: 0x${mainAddress.toString(16)}`);
}
```

### Source-Level Debugging

```typescript
// Set breakpoint at function
const symbolParser = emulator.getSymbolParser();
if (symbolParser) {
  const mainAddress = symbolParser.getSymbolAddress('main');
  emulator.getSystemBus().getCPU().setBreakpoint(mainAddress);
}

// Get current function name
const pc = emulator.getSystemBus().getCPU().getRegisters().PC;
const functionName = symbolParser?.getSymbolName(pc);
console.log(`Currently in function: ${functionName}`);
```

## Troubleshooting

### Common Issues

#### Native Addon Not Loading
```
Error: Cannot find module 'build/Release/fake6502_addon.node'
```

**Solution**: Rebuild the native addon:
```bash
npm run build
```

#### Memory Access Errors
```
Warning: Read from unmapped memory: 0x1234
```

**Solution**: Check your memory configuration and ensure all accessed addresses are mapped.

#### Peripheral Not Responding
```
Warning: Write to unmapped memory: 0x5000
```

**Solution**: Verify peripheral configuration in your system config file.

#### Performance Issues
```
Performance below baseline: 50000 IPS < 100000 IPS
```

**Solution**: Enable optimizations:
```typescript
emulator.enableProfiling(true);
// Run your program
const analysis = emulator.getProfiler().getAnalysis();
emulator.getOptimizer().applyOptimizations(analysis);
```

### Debug Output

Enable verbose logging:

```typescript
// Set log level
process.env.EMULATOR_LOG_LEVEL = 'debug';

// Enable specific debug categories
process.env.EMULATOR_DEBUG = 'cpu,memory,peripherals';
```

### Getting Help

1. Check the [API documentation](api-reference.md)
2. Review [example configurations](../examples/)
3. Run the regression test suite: `npm test`
4. File an issue on GitHub with:
   - System configuration
   - Program being executed
   - Error messages
   - Steps to reproduce

## Next Steps

- Explore the [API Reference](api-reference.md)
- Check out [example configurations](../examples/)
- Learn about [development workflow](development-guide.md)
- Contribute to the project on GitHub