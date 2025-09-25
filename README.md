# 6502/65C02 Homebrew Computer Emulator v1.0

A cycle-accurate 6502/65C02 emulator designed for homebrew computer development, featuring comprehensive debugging tools, peripheral simulation, and CC65 toolchain compatibility.

## Features

### Core Emulation
- **Accurate 6502/65C02 CPU emulation** using the fake6502 core
- **Cycle-accurate timing** for authentic hardware behavior
- **Configurable clock speeds** from 1KHz to 10MHz with adaptive control
- **Comprehensive instruction set** support including undocumented opcodes

### Memory Management
- **Flexible memory mapping** for RAM, ROM, and I/O regions
- **Multiple ROM format support** (binary, Intel HEX, Motorola S-record)
- **Memory region prioritization** (ROM > I/O > RAM)
- **Runtime memory manipulation** with write and poke commands

### Peripheral Simulation
- **68B50 ACIA** - Serial communication interface with configurable baud rates
- **65C22 VIA** - Versatile interface adapter with timers, ports, and interrupts
- **Extensible peripheral system** for adding custom hardware
- **Real-time peripheral polling** with adaptive frequency control

### Debugging & Development
- **Interactive CLI** with comprehensive command set
- **Breakpoint system** with optimized checking algorithms
- **Memory inspection** with hex dumps and pattern searching
- **CPU register monitoring** with flag decoding
- **Execution tracing** for instruction-level debugging
- **Memory region visualization** for system layout inspection

### Performance & Optimization
- **Real-time profiling** with bottleneck identification
- **Memory access caching** for frequently accessed addresses
- **Configurable execution speed** with real-time adjustment
- **Performance benchmarking** suite with automated testing
- **Optimization recommendations** based on profiling data

### CC65 Integration
- **CC65 toolchain compatibility** for C development
- **Symbol file support** for source-level debugging
- **Standard memory layouts** (homebrew, Apple II-like, C64-like)
- **Runtime library support** for C programs

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/marianol/6502Emu.git
cd 6502Emu

# Install dependencies
npm install

# Build the project (optional - launcher will use development mode if not built)
npm run build
```

### Global Installation

To use the emulator from anywhere on your system:

```bash
# Option 1: Add to PATH (recommended)
echo 'export PATH="$PATH:/path/to/6502Emu/bin"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Create symbolic link
sudo ln -s /path/to/6502Emu/bin/6502-emulator /usr/local/bin/6502-emulator

# Option 3: Copy script to PATH location
sudo cp bin/6502-emulator /usr/local/bin/6502-emulator
```

After installation, you can run the emulator from anywhere:
```bash
6502-emulator --help
6502-emulator --version
6502-emulator
```

### Basic Usage

```bash
# Start the interactive CLI (if installed globally)
6502-emulator

# Or run from project directory
npm run cli
# or
bin/6502-emulator

# Load a configuration and ROM
6502> load examples/basic-homebrew-config.json
6502> loadrom examples/test-program.bin 0200 binary

# Inspect and execute
6502> mem 0200 16
6502> regs
6502> step 5
6502> quit
```

### Launcher Script Features

The `bin/6502-emulator` script provides:
- **Self-contained execution** - works from any directory
- **Automatic fallback** - uses built version if available, otherwise development mode
- **Built-in help** - `--help` for usage information
- **Version display** - `--version` for version information
- **Auto-build option** - `--build` to build before running
- **Error handling** - clear error messages and troubleshooting guidance

### Example Session

```bash
$ npm run cli
6502/65C02 Homebrew Computer Emulator v1.0.0
Type "help" for available commands, "quit" to exit

6502> version
6502/65C02 Homebrew Computer Emulator v1.0.0
Description: A 6502/65C02 emulator for homebrew computer development
License: MIT

6502> help
Available commands:
  load         - Load configuration from file
  reset        - Reset the system
  status       - Show system status and statistics
  run          - Start continuous execution
  stop         - Stop execution
  pause        - Pause execution
  step         - Execute single instruction
  loadrom      - Load ROM image
  regs         - Show CPU registers
  mem          - Display memory contents
  write        - Write byte(s) to memory
  poke         - Write single byte to memory
  regions      - Show memory regions (RAM, ROM, I/O)
  break        - Set breakpoint
  unbreak      - Remove breakpoint
  speed        - Set clock speed in Hz
  version      - Show emulator version
  help         - Show available commands
  quit         - Exit the emulator

6502> write 0200 A9 42 8D 00 02
Wrote 5 byte(s) to 0200: A9 42 8D 00 02

6502> mem 0200 8
0200: A9 42 8D 00 02 00 00 00                         |.B......|

6502> step 2
Step 1: PC=0000 (7 cycles)
Step 2: PC=0000 (7 cycles)
```

## System Requirements

- **Node.js** 16 or later
- **Python** 3.8+ (for native addon compilation)
- **C++ compiler** (GCC, Clang, or MSVC)

## Documentation

- **[User Guide](docs/user-guide.md)** - Complete usage documentation
- **[API Reference](docs/api-reference.md)** - Comprehensive API documentation  
- **[Development Guide](docs/development-guide.md)** - Developer workflow and contribution guide
- **[Example Configurations](examples/)** - Ready-to-use system configurations

## Example Configurations

The project includes several pre-configured system examples:

- **[Basic Homebrew](examples/basic-homebrew-config.json)** - Simple homebrew computer with ACIA and VIA
- **[Apple II-like](examples/apple-ii-like-config.json)** - Configuration similar to Apple II
- **[C64-like](examples/c64-like-config.json)** - Configuration similar to Commodore 64
- **[Development System](examples/development-config.json)** - Optimized for software development
- **[Minimal System](examples/minimal-system.json)** - Bare minimum for testing

## CLI Commands

### System Control
- `load <config-file>` - Load system configuration
- `reset` - Reset the system
- `status` - Show system status and statistics

### Execution Control
- `run` - Start continuous execution
- `stop` - Stop execution
- `pause` - Pause execution
- `step [count]` - Execute single instruction(s)

### ROM Loading
- `loadrom <file> <address> [format]` - Load ROM image

### Memory Operations
- `mem <address> [length]` - Display memory contents
- `write <address> <byte1> [byte2] ...` - Write multiple bytes
- `poke <address> <byte>` - Write single byte

### Debugging
- `regs` - Show CPU registers and flags
- `regions` - Show memory regions
- `break <address>` - Set breakpoint
- `unbreak <address>` - Remove breakpoint

### Utility
- `speed <hz>` - Set clock speed
- `version` - Show version information
- `help [command]` - Show help

## Performance

The emulator achieves excellent performance through various optimizations:

- **Native CPU core** using fake6502 C implementation
- **Memory access caching** for frequently accessed addresses
- **Optimized breakpoint checking** with binary search for large sets
- **Adaptive peripheral polling** to reduce overhead
- **Configurable execution speed** from 1KHz to 10MHz

Typical performance on modern hardware:
- **1-5 million instructions per second** in real-time mode
- **10+ million instructions per second** in maximum speed mode
- **Sub-millisecond response** for debugging commands

## Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- --testPathPattern="performance"
npm test -- --testPathPattern="integration"

# Run regression test suite
npm run test:regression
```

Test coverage includes:
- **Unit tests** for individual components
- **Integration tests** for system functionality
- **Performance benchmarks** with timing validation
- **Regression tests** to prevent functionality breaks

## Contributing

We welcome contributions! Please see the [Development Guide](docs/development-guide.md) for:

- Development workflow and setup
- Code style guidelines
- Testing requirements
- Pull request process

## Author

**Mariano Luna** - Creator and lead developer of the 6502/65C02 Homebrew Computer Emulator

## License

MIT License - see LICENSE file for details.

## Version History

### v1.0.0 (Current)
- Initial release with full 6502/65C02 emulation
- Interactive CLI with comprehensive command set
- Peripheral simulation (ACIA, VIA)
- Performance profiling and optimization
- CC65 toolchain compatibility
- Comprehensive documentation and examples

## Acknowledgments

- **fake6502** - Mike Chambers' excellent 6502 CPU emulator core
- **CC65** - Ullrich von Bassewitz's 6502 C compiler and toolchain
- **6502.org** - Community resource for 6502 development
- **Visual6502** - Transistor-level 6502 simulation project

---

**6502/65C02 Homebrew Computer Emulator v1.0** - Bringing vintage computing to modern development workflows.