# Example Configurations

This directory contains example system configurations for different types of 6502-based computers.

## Configuration Files

### [basic-homebrew-config.json](basic-homebrew-config.json)
A simple homebrew computer configuration with:
- 32KB RAM
- 68B50 ACIA for serial communication
- 65C22 VIA for I/O (LEDs and buttons)
- System monitor ROM

**Use case**: Basic homebrew computer projects, learning 6502 assembly

### [apple-ii-like-config.json](apple-ii-like-config.json)
Configuration similar to the Apple II:
- 48KB RAM
- Applesoft BASIC ROM
- System monitor ROM
- Keyboard and audio interfaces

**Use case**: Running Apple II software, educational purposes

### [c64-like-config.json](c64-like-config.json)
Configuration similar to the Commodore 64:
- 64KB RAM (with ROM overlay)
- BASIC interpreter ROM
- Kernal ROM
- Character generator ROM
- Joystick interfaces

**Use case**: Running C64-style programs, game development

### [development-config.json](development-config.json)
Optimized for software development:
- 65C02 CPU with enhanced instructions
- High-speed serial interface (115200 baud)
- Debug LEDs and control buttons
- Enhanced debug monitor
- CC65 runtime support
- Tracing enabled

**Use case**: Software development, debugging, CC65 projects

### [minimal-system.json](minimal-system.json)
Bare minimum configuration:
- 8KB RAM only
- No peripherals
- No ROM

**Use case**: Testing, minimal programs, educational examples

## Using Configurations

### Command Line
```bash
# Use a specific configuration
node src/cli.ts --config examples/basic-homebrew-config.json

# Load additional ROM
node src/cli.ts --config examples/basic-homebrew-config.json --rom program.bin --load-address 0x0200
```

### Programmatic Usage
```typescript
import { SystemConfigLoader } from './src/config/system';
import { Emulator } from './src/emulator';

// Load configuration
const config = SystemConfigLoader.loadFromFile('examples/basic-homebrew-config.json');

// Create and initialize emulator
const emulator = new Emulator(config);
await emulator.initialize();

// Your program here...
```

## Memory Maps

### Basic Homebrew System
```
$0000-$7FFF  RAM (32KB)
$8000-$8001  ACIA (68B50)
$8010-$801F  VIA (65C22)
$E000-$FFFF  Monitor ROM (8KB)
```

### Apple II-like System
```
$0000-$BFFF  RAM (48KB)
$C0C0-$C0C1  ACIA
$C0E0-$C0EF  VIA
$D000-$F7FF  Applesoft BASIC ROM
$F800-$FFFF  Monitor ROM
```

### C64-like System
```
$0000-$FFFF  RAM (64KB)
$A000-$BFFF  BASIC ROM (overlay)
$D000-$DFFF  Character ROM (overlay)
$DD00-$DD0F  VIA
$DE00-$DE01  ACIA
$E000-$FFFF  Kernal ROM (overlay)
```

### Development System
```
$0000-$7FFF  RAM (32KB)
$5000-$5001  ACIA (115200 baud)
$6000-$600F  VIA (debug interface)
$C000-$DFFF  Debug Monitor ROM
$E000-$FFFF  CC65 Runtime ROM
```

## Peripheral Connections

### ACIA (68B50) Usage
```assembly
; Initialize ACIA
LDA #$03        ; Master reset
STA $8000       ; Control register
LDA #$11        ; 8N1, /16 clock
STA $8000       ; Configure

; Send character
LDA #'H'        ; Character to send
STA $8001       ; Data register

; Receive character
@wait:
LDA $8000       ; Status register
AND #$01        ; Check RDRF
BEQ @wait       ; Wait for data
LDA $8001       ; Read character
```

### VIA (65C22) Usage
```assembly
; Configure ports
LDA #$FF        ; All outputs
STA $8013       ; DDRA
LDA #$00        ; All inputs
STA $8012       ; DDRB

; Write to Port A (LEDs)
LDA #$AA        ; Pattern
STA $8011       ; ORA

; Read from Port B (buttons)
LDA $8010       ; IRB
```

## CC65 Integration

### Memory Configuration for CC65
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

### Compiling for Different Systems
```bash
# Basic homebrew system
cc65 -t none -O program.c
ca65 program.s
ld65 -C homebrew.cfg program.o -o program.bin

# Apple II-like system
cc65 -t apple2 -O program.c
ca65 program.s
ld65 -t apple2 program.o -o program.bin

# Development system with debugging
cc65 -t none -g -O program.c
ca65 -g program.s
ld65 -C development.cfg -Ln program.sym program.o -o program.bin
```

## Customizing Configurations

### Adding New Peripherals
```json
{
  "peripherals": {
    "acia": {
      "baseAddress": 20480,
      "baudRate": 9600
    },
    "via": {
      "baseAddress": 24576,
      "enableTimers": true
    },
    "custom_peripheral": {
      "baseAddress": 28672,
      "customOption": "value"
    }
  }
}
```

### Multiple ROM Images
```json
{
  "memory": {
    "romImages": [
      {
        "file": "monitor.bin",
        "loadAddress": 61440,
        "format": "binary"
      },
      {
        "file": "basic.hex",
        "loadAddress": 0,
        "format": "ihex"
      },
      {
        "file": "program.s19",
        "loadAddress": 0,
        "format": "srec"
      }
    ]
  }
}
```

### Debug Configuration
```json
{
  "debugging": {
    "enableTracing": true,
    "breakOnReset": true,
    "symbolFile": "program.sym",
    "traceInstructions": 1000,
    "logLevel": "debug"
  }
}
```

## Performance Considerations

### High-Speed Systems
For systems with clock speeds > 2MHz:
- Enable memory caching
- Use adaptive speed control
- Consider peripheral polling optimization

```typescript
// Enable optimizations for high-speed systems
emulator.getOptimizer().getMemoryManager().enableCache(true);
emulator.getOptimizer().getSpeedController().setAdaptiveMode(true);
```

### Development vs Production
- **Development**: Enable tracing, use breakpoints, lower speed
- **Production**: Disable tracing, enable optimizations, full speed

## Troubleshooting

### Common Issues

1. **ROM not loading**: Check file paths and load addresses
2. **Peripheral not responding**: Verify base addresses don't overlap
3. **Performance issues**: Enable profiling to identify bottlenecks
4. **Memory conflicts**: Use memory map validation

### Debug Tips

1. Start with minimal configuration
2. Add components incrementally
3. Use memory inspector to verify ROM loading
4. Enable tracing for instruction-level debugging
5. Check peripheral register values during operation