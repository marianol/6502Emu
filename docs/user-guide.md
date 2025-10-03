# 6502 Emulator User Guide v1.2

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

The 6502 Emulator v1.2 is a cycle-accurate emulator designed for homebrew computer development. It provides:

- **Complete 6502/65C02 CPU emulation** using the improved MyLittle6502 core
- **All 151 official 6502 opcodes** - no more "unknown opcode" errors
- **Accurate cycle timing** for all instructions
- **Dual-mode architecture** - native C implementation with TypeScript fallback
- Configurable memory mapping for RAM, ROM, and I/O
- Peripheral simulation (68B50 ACIA, 65C22 VIA)
- Comprehensive debugging tools with reliable breakpoint detection
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

This compiles the improved MyLittle6502 native addon for optimal performance with complete instruction set support.

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

The emulator includes a comprehensive CLI for interactive use:

```bash
# Run using the launcher script (recommended)
bin/6502-emulator

# Or if installed globally
6502-emulator

# Run CLI in development mode
npm run cli

# Run CLI in production mode (after building)
npm run start

# Or use the built CLI directly
node dist/cli.js
```

#### CLI Commands

Once in the CLI, you can use these commands:

**System Control:**
- `load <config-file>` - Load system configuration
- `reset` - Reset the system
- `status` - Show system status and statistics

**Execution Control:**
- `run [address]` - Start continuous execution (optionally from specific address)
- `stop` - Stop execution
- `pause` - Pause execution
- `step [count]` - Execute single instruction(s) with register display

**ROM Loading:**
- `loadrom <file> <address> [format]` - Load ROM image
  - Formats: `binary`, `ihex`, `srec`
  - Address in hexadecimal (e.g., `0200`)

**Debugging:**
- `regs` - Show CPU registers and flags (P register shown in binary)
- `mem [address] [length]` or `m [address] [length]` - Display memory contents (press return to continue)
- `disasm [address] [length]` or `d [address] [length]` - Disassemble memory contents (press return to continue)
- `write <address> <byte1> [byte2] ...` or `w <address> <byte1> [byte2] ...` - Write multiple bytes to memory
- `poke <address> <byte>` - Write single byte to memory
- `regions` - Show memory regions (RAM, ROM, I/O)
- `break <address>` - Set breakpoint
- `unbreak <address>` - Remove breakpoint

**Configuration:**
- `speed <hz>` - Set clock speed in Hz

**Utility:**
- `version` - Show emulator version information

**Help:**
- `help [command]` - Show available commands or command details
- `quit` / `exit` - Exit the emulator

#### CLI Usage Examples

```bash
# Start CLI and load configuration
npm run cli
6502> load examples/minimal-system.json
6502> loadrom examples/test-program.bin 0200 binary
6502> regs
6502> step 5
6502> mem 200 16
6502> quit

# Memory manipulation and execution examples
npm run cli
6502> write 0200 A9 42 8D 00 02    # Write LDA #$42, STA $0200
6502> poke 0205 EA                 # Write NOP instruction
6502> mem 200 8                    # View written bytes
6502> m 200 8                      # Same as above using alias
6502> run 0200                     # Start execution from address 0x0200
6502> stop                         # Stop execution
6502> step 2                       # Step 2 instructions with register display
6502> quit

# Batch commands via pipe
echo "load examples/minimal-system.json
write 0200 A9 42
mem 200 4
status
quit" | npm run cli
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
      "baseAddress": 32768,
      "baudRate": 9600,
      "serialPort": "/dev/ttyUSB0"
    },
    "via": {
      "baseAddress": 32784,
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

### Creating Test Programs

You can create simple test programs using Node.js:

```javascript
// Create a simple test program
const fs = require('fs');
const program = Buffer.from([
  0xA9, 0x42,        // LDA #$42
  0x8D, 0x00, 0x02,  // STA $0200
  0xA9, 0x01,        // LDA #$01
  0x69, 0x01,        // ADC #$01
  0x8D, 0x01, 0x02,  // STA $0201
  0x4C, 0x00, 0x02   // JMP $0200 (loop)
]);
fs.writeFileSync('test-program.bin', program);
```

Then load and test in the CLI:
```bash
npm run cli
6502> load examples/minimal-system.json
6502> loadrom test-program.bin 0200 binary
6502> step 5
6502> regs
6502> mem 200 4
```

### CPU Register Manipulation

The CLI provides commands to directly manipulate CPU registers for debugging:

```bash
# Set program counter
6502> setpc 0200                   # Set PC to 0x0200

# Set individual registers
6502> setreg A 42                  # Set accumulator to 0x42
6502> setreg X 10                  # Set X register to 0x10
6502> setreg Y 20                  # Set Y register to 0x20
6502> setreg SP FE                 # Set stack pointer to 0xFE

# Set processor status flags
6502> setreg P 83                  # Set flags: N=1, Z=1, C=1
P set to 83
Flags: NZC

# View all registers
6502> regs
A:  42    X:  10    Y:  20
PC: 0200  SP: FE    P:  83
Cycles: 0
Flags: NZC
```

### Memory Manipulation

The CLI provides commands to directly write to and read from memory:

```bash
# Write multiple bytes at once
6502> write 0200 A9 42 8D 00 02    # LDA #$42, STA $0200
6502> w 0200 A9 42 8D 00 02        # Same as above using alias

# Write single byte (poke)
6502> poke 0300 FF                 # Write $FF to address $0300

# View memory contents
6502> mem 0200 8                   # Display 8 bytes from $0200
6502> m 0200 8                     # Same as above using alias
6502> m 0200                       # Display 16 bytes from $0200
6502> [press return]               # Continue to next 16 bytes (0x0210)
6502> [press return]               # Continue to next 16 bytes (0x0220)

# Disassemble memory contents
6502> disasm 0200 32               # Disassemble 32 bytes from $0200
6502> d 0200                       # Same using alias (default 32 bytes)
6502> [press return]               # Continue disassembly from next instruction

# Create and test a simple program
6502> write 0200 A9 01             # LDA #$01
6502> w 0202 69 01                 # ADC #$01 (using alias)
6502> write 0204 8D 00 03          # STA $0300
6502> w 0207 4C 00 02              # JMP $0200 (using alias)
6502> run 0200                     # Start execution from 0x0200
6502> stop                         # Stop after a moment
6502> step 3                       # Step through 3 instructions
Step 1: PC=0201 (2 cycles)         # Each step shows registers
A:01 X:00 Y:00 SP:FF P:00100000     # P register in binary
Flags: nv-bdizc (NV-BDIZC)          # Flag status (uppercase=set, lowercase=clear)
---
Step 2: PC=0203 (2 cycles)
A:02 X:00 Y:00 SP:FF P:00100000
Flags: nv-bdizc (NV-BDIZC)
---
Step 3: PC=0207 (4 cycles)
A:02 X:00 Y:00 SP:FF P:00100000
Flags: nv-bdizc (NV-BDIZC) 
6502> mem 0300 1                   # Check result

### Memory Browsing

The memory commands support continuation - after using `mem` or `m`, you can press return (empty line) to continue displaying the next block of memory:

```bash
6502> m 0200                       # Display 16 bytes starting at $0200
0200: 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 |................|
6502> [press return]               # Continue from $0210
0210: 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20 |............... |
6502> [press return]               # Continue from $0220  
0220: 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F 30 |!"#$%&'()*+,-./0|
```

This continuation only works after memory commands - other commands will break the sequence.

### Code Disassembly

The disassembler shows 6502 assembly instructions with addresses and opcodes:

```bash
6502> d 0200                       # Disassemble starting at $0200
0200: A9 42   LDA #$nn             # Load accumulator with immediate value
0202: 8D 0300 STA $nnnn            # Store accumulator to absolute address
0205: A9 01   LDA #$nn             # Load accumulator with immediate value
0207: 69 01   ADC #$nn             # Add with carry immediate
0209: 8D 0301 STA $nnnn            # Store accumulator to absolute address
020C: 4C 0200 JMP $nnnn            # Jump to absolute address
6502> [press return]               # Continue from next instruction
020F: 00      BRK                  # Break instruction
0210: 00      BRK                  # Break instruction
...
```

Like memory browsing, disassembly supports continuation by pressing return.

# Advanced debugging with disassembly and execution
6502> d 0200                       # See what code will execute
0200: A9 42   LDA #$nn             # Load $42 into accumulator
0202: 8D 0300 STA $nnnn            # Store to $0300
6502> setpc 0200                   # Set program counter to start of code
6502> step 1                       # Execute LDA #$42
6502> regs                         # Check that A register = $42
6502> step 1                       # Execute STA $0300
6502> m 0300 1                     # Verify $42 was stored to $0300
```

## Using Peripherals

### 68B50 ACIA (Serial Communication)

#### Basic ACIA Usage

```assembly
; Initialize ACIA
LDA #$03        ; Master reset
STA $8000       ; ACIA control register
LDA #$11        ; 8N1, /16 clock, RTS low
STA $8000       ; Configure ACIA

; Send character
LDA #'A'        ; Character to send
STA $8001       ; ACIA data register

; Wait for transmission complete
@wait:
LDA $8000       ; Read status
AND #$02        ; Check TDRE (Transmit Data Register Empty)
BEQ @wait       ; Wait until ready

; Receive character
@receive:
LDA $8000       ; Read status
AND #$01        ; Check RDRF (Receive Data Register Full)
BEQ @receive    ; Wait for data
LDA $8001       ; Read received character
```

#### ACIA Configuration

```typescript
// Configure ACIA in system config
"acia": {
  "baseAddress": 0x8000,
  "baudRate": 9600,
  "serialPort": "/dev/ttyUSB0"  // Optional: connect to real serial port
}
```

### 65C22 VIA (Versatile Interface Adapter)

#### Port I/O Operations

```assembly
; Configure Port A as output, Port B as input
LDA #$FF        ; All bits output
STA $8013       ; DDRA (Data Direction Register A)
LDA #$00        ; All bits input
STA $8012       ; DDRB (Data Direction Register B)

; Write to Port A
LDA #$AA        ; Test pattern
STA $8011       ; ORA (Output Register A)

; Read from Port B
LDA $8010       ; IRB (Input Register B)
```

#### Timer Operations

```assembly
; Set up Timer 1 for 1ms interval (assuming 1MHz clock)
LDA #<1000      ; Low byte of count
STA $8014       ; T1C-L (Timer 1 Counter Low)
LDA #>1000      ; High byte of count (starts timer)
STA $8015       ; T1C-H (Timer 1 Counter High)

; Wait for timer to expire
@wait:
LDA $801D       ; IFR (Interrupt Flag Register)
AND #$40        ; Timer 1 flag
BEQ @wait       ; Wait for timeout

; Clear timer flag
LDA #$40
STA $801D       ; Clear Timer 1 interrupt flag
```

#### VIA Interrupts

```assembly
; Enable Timer 1 interrupt
LDA #$C0        ; Set bit 7 (master enable) and bit 6 (Timer 1)
STA $801E       ; IER (Interrupt Enable Register)

; Set up interrupt vector
LDA #<timer_isr
STA $FFFE       ; IRQ vector low
LDA #>timer_isr
STA $FFFF       ; IRQ vector high

; Enable CPU interrupts
CLI

timer_isr:
  ; Handle timer interrupt
  LDA $801D     ; Read IFR to identify interrupt source
  AND #$40      ; Check Timer 1 flag
  BEQ @exit     ; Not our interrupt
  
  ; Process timer interrupt
  ; ... your code here ...
  
  ; Clear interrupt flag
  LDA #$40
  STA $801D     ; Clear Timer 1 flag
  
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
Warning: Write to unmapped memory: 0x8000
```

**Solution**: Verify peripheral configuration in your system config file and ensure addresses don't conflict with RAM.

#### CLI Import Errors
```
Error: import * as fs from 'fs';
```

**Solution**: Use the npm scripts instead of running TypeScript files directly:
```bash
npm run cli          # For development
npm run start        # For production
```

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