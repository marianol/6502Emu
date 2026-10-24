# 6502/65C02 Homebrew Computer Emulator v1.4

A 6502/65C02 emulator designed for homebrew computer development, featuring instruction-level cycle counting, comprehensive debugging tools, peripheral simulation, a live serial terminal, and CC65 toolchain compatibility.

## Features

### Core Emulation
- **Accurate 6502/65C02 CPU emulation** using the improved MyLittle6502 core
- **Full 65C02 CMOS instruction set** - selected via `cpu.type: "65C02"` in config
  (INC A, DEC A, PHX/PHY, PLX/PLY, BRA, BIT #, zero-page indirect, TSB/TRB, STZ, JMP (abs,X))
- **Complete NMOS instruction set** - all 151 official 6502 opcodes implemented
- **Instruction-level cycle counting** - accurate total cycle counts per
  instruction (including page-crossing and branch penalties), suitable for
  timing-sensitive code like baud-rate delay loops. Not sub-instruction
  (per-cycle bus) accurate.
- **Configurable clock speeds** including baud-rate crystals (e.g. 1.8432 MHz)
- **Dual-mode architecture** - native C implementation with TypeScript fallback

### Memory Management
- **Flexible memory mapping** for RAM, ROM, and I/O regions
- **Hex or decimal addresses in config** - write `"0xE000"` or `57344`, your choice
- **Config-relative ROM paths** - keep configs and ROM images together in one folder
- **Multiple ROM format support** (binary, Intel HEX, Motorola S-record)
- **Memory region prioritization** (ROM > I/O > RAM)
- **Runtime memory manipulation** with write and poke commands

### Peripheral Simulation
- **68B50 ACIA** - Serial communication interface with configurable baud rates
- **65C22 VIA** - Versatile interface adapter with timers, ports, and interrupts
- **Partial address decoding** via `registerSize` - peripherals mirror across a
  configurable window, matching real hardware that doesn't decode all address lines
- **Extensible peripheral system** for adding custom hardware
- **Real-time peripheral polling** with adaptive frequency control

### Live Serial Terminal
- **Connect a real terminal program** (screen, minicom, picocom) to the running emulator
- **Clean raw PTY bridge** via socat - no character corruption or line-discipline interference
- **Bidirectional I/O** - type into the terminal, see firmware output live
- **Transmit FIFO** - handles firmware that uses blind delay loops (e.g. WozMon) without dropping characters
- **`serialdebug` command** - live hex dump of ACIA transmit bytes for debugging

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

### Serial Terminal Prerequisite

The live serial terminal uses [socat](http://www.dest-unreach.org/socat/) to create
a clean pseudo-terminal bridge. Install it if you want to connect a terminal program:

```bash
# macOS
brew install socat

# Debian/Ubuntu
sudo apt install socat
```

Without socat, the emulator still runs and ACIA output falls back to stdout.

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
# Start the emulator — loads the default config (bin/config/simple6502-config.json)
6502-emulator

# Or load a specific config on startup
6502-emulator -l config/simple6502-config.json

# Or run from project directory
bin/6502-emulator
```

Once started, the emulator loads a config automatically and drops you at the prompt:

```
6502> run           # start executing the loaded ROM
6502> regs          # inspect CPU registers
6502> mem 0300 16   # dump memory
6502> d FF00        # disassemble (65C02-aware)
6502> quit          # exit cleanly
```

### Connecting a Serial Terminal

When your config sets `"serialPort": "pty"` on the ACIA, the emulator prints a
device path on startup. Connect a terminal program to it in a second window:

```bash
screen /dev/ttysNNN 28800
```

Everything your firmware transmits appears there, and anything you type is sent
back to the firmware's ACIA receive register.

### Launcher Script Features

The `bin/6502-emulator` script provides:
- **Self-contained execution** - works from any directory
- **Default config on startup** - loads `bin/config/simple6502-config.json` if no `-l` given
- **Load flag** - `-l` / `--load <config>` to load a specific config on startup
- **Automatic fallback** - uses built version if available, otherwise development mode
- **Built-in help** - `--help` for usage information
- **Version display** - `--version` for version information
- **Auto-build option** - `--build` to build before running
- **Error handling** - clear error messages and troubleshooting guidance

### Example Session

```bash
$ bin/6502-emulator
6502/65C02 Homebrew Computer Emulator v1.4.0
Type "help" for available commands, "quit" to exit

No config specified, loading default: bin/config/simple6502-config.json
...
┌─────────────────────────────────────────────────┐
│  ACIA PTY ready (via socat)                     │
│  Connect with:                                  │
│  screen /dev/ttys003 28800                      │
└─────────────────────────────────────────────────┘
Configuration loaded from bin/config/simple6502-config.json

6502> regions
Memory Map (4 regions):
  Start  End    Size    Type
  ------ ------ ------- ----
  $0000  $7EFF  32512   RAM
  $7F20  $7F2F  16      VIA (16 bytes)
  $7F70  $7F73  4       ACIA (4 bytes)
  $8000  $FFFF  32768   ROM

6502> run
Execution started

6502> quit
Goodbye!
```

## System Requirements

- **Node.js** 16 or later
- **Python** 3.8+ (for native addon compilation)
- **C++ compiler** (GCC, Clang, or MSVC)
- **socat** (optional) - for the live serial terminal (`brew install socat` / `apt install socat`)

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
- `disasm <address> [length]` / `d` - Disassemble memory (65C02-aware)
- `regions` - Show memory regions, including peripherals with address ranges
- `break <address>` - Set breakpoint
- `unbreak <address>` - Remove breakpoint
- `serialdebug` - Toggle a live hex dump of ACIA transmit bytes

### Utility
- `speed <hz>` - Set clock speed
- `version` - Show version information
- `help [command]` - Show help

### Startup Options (command line)
- `-l` / `--load <config>` - Load a config file on startup
- `--version` / `-v` - Show version and exit
- `--help` / `-h` - Show help and exit
- `--build` - Build the project before running

## Performance

The emulator achieves excellent performance through various optimizations:

- **Native CPU core** using improved MyLittle6502 C implementation
- **Complete instruction set** - no more "unknown opcode" errors
- **Accurate cycle counting** - proper timing for all instructions
- **Memory access caching** for frequently accessed addresses
- **Optimized breakpoint checking** with binary search for large sets
- **Adaptive peripheral polling** to reduce overhead
- **Configurable execution speed** from 1KHz to 10MHz

Typical performance on modern hardware:
- **1-5 million instructions per second** in real-time mode
- **10+ million instructions per second** in maximum speed mode
- **Sub-millisecond response** for debugging commands
- **Zero false breakpoint detections** with proper cycle handling

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

### v1.4.0 (Current)
- **Full 65C02 CMOS instruction set**: `cpu.type: "65C02"` now activates INC A, DEC A,
  PHX/PHY, PLX/PLY, BRA, BIT #, zero-page indirect, TSB/TRB, STZ, and JMP (abs,X)
- **Live serial terminal**: connect screen/minicom/picocom to the running emulator
  through a clean raw PTY bridge (socat). Full bidirectional I/O, no corruption
- **ACIA transmit FIFO**: firmware using blind delay loops (e.g. WozMon) no longer
  drops characters
- **ACIA register mirroring**: `registerSize` makes peripherals mirror across the
  decoded window, matching hardware with partial address decoding
- **Hex addresses in config**: numeric fields accept `"0xE000"` or decimal
- **Config-relative ROM paths**: ROM files resolve relative to the config file
- **Startup config loading**: loads a default config automatically, or `-l <config>`
- **65C02-aware disassembler** and peripherals shown in the `regions` command
- **New commands**: `serialdebug`, `disasm`/`d`
- **Annotated reference config** (`examples/full-reference-config.yaml`)
- **Bug fixes**: clean `quit` (no hang), correct ACIA timing tied to CPU clock,
  no double-initialization on startup

### v1.2.0
- **Major CPU improvements**: Integrated improved MyLittle6502 core
- **Complete instruction set**: All 151 official 6502 opcodes now supported
- **Fixed cycle counting**: Proper timing for all instructions
- **Resolved false breakpoints**: Fixed issue where 0-cycle returns triggered breakpoint detection
- **Enhanced reliability**: AND, ORA, EOR, and all other missing instructions now work correctly
- **Improved debugging**: More accurate execution tracing and timing

### v1.0.0
- Initial release with basic 6502/65C02 emulation
- Interactive CLI with comprehensive command set
- Peripheral simulation (ACIA, VIA)
- Performance profiling and optimization
- CC65 toolchain compatibility
- Comprehensive documentation and examples

## Acknowledgments

- **MyLittle6502** - C-Chads' improved fake6502 implementation with bug fixes and complete instruction set
- **fake6502** - Mike Chambers' original 6502 CPU emulator core
- **CC65** - Ullrich von Bassewitz's 6502 C compiler and toolchain
- **6502.org** - Community resource for 6502 development
- **Visual6502** - Transistor-level 6502 simulation project

---

**6502/65C02 Homebrew Computer Emulator v1.4** - Bringing vintage computing to modern development workflows with a full 65C02 instruction set and a live serial terminal.