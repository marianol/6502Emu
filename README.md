# 6502 Homebrew Computer Emulator

A modular 6502/65C02 emulator designed for homebrew computer development, featuring custom memory mapping, peripheral simulation, and debugging tools optimized for the CC65 toolchain.

## Project Structure

```
src/
├── core/                 # Core emulation components
│   ├── cpu.ts           # CPU emulator integration layer
│   ├── memory.ts        # Memory management and mapping
│   └── bus.ts           # Bus controller coordination
├── peripherals/         # Hardware peripheral simulations
│   ├── base.ts          # Base peripheral interface and hub
│   ├── acia.ts          # Motorola 68B50 ACIA implementation
│   └── via.ts           # 65C22 VIA implementation
├── debug/               # Debugging and inspection tools
│   └── inspector.ts     # Memory inspector and debugging interface
├── config/              # Configuration management
│   └── system.ts        # System configuration loader
└── emulator.ts          # Main emulator application

docs/                    # Documentation
└── emulator-evaluation.md  # 6502 emulator options evaluation

tests/                   # Test suites (to be created)
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test ROM images and data
```

## Architecture Overview

The emulator follows a modular architecture where:

- **CPU Core**: Integrates an existing open-source 6502 emulator (fake6502)
- **Memory Manager**: Routes memory accesses between RAM, ROM, and I/O regions
- **Peripheral Hub**: Manages hardware component simulations
- **Configuration System**: Handles system setup and ROM loading
- **Debug Interface**: Provides development and troubleshooting tools

## Selected 6502 Emulator

After evaluation of multiple options (lib6502, fake6502, py65, 6502.ts), **fake6502** was selected as the core emulator due to:

- Public domain license (no restrictions)
- High performance C implementation
- Clean API suitable for integration
- Extensibility for 65C02 instructions
- Small footprint and fast execution

See `docs/emulator-evaluation.md` for detailed comparison and rationale.

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## Features (Planned)

- **CPU Emulation**: 6502 and 65C02 processor support
- **Memory Management**: Configurable RAM, ROM, and I/O mapping
- **Peripheral Simulation**: 68B50 ACIA, 65C22 VIA, timers, GPIO
- **ROM Loading**: Binary, Intel HEX, and Motorola S-record formats
- **Debugging Tools**: Breakpoints, tracing, memory inspection
- **CC65 Compatibility**: Symbol loading and toolchain integration
- **Configuration**: JSON/YAML system configuration files

## License

MIT License - See LICENSE file for details.

The integrated fake6502 emulator core is in the public domain.