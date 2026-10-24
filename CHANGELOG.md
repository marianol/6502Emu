# Changelog

All notable changes to the 6502/65C02 Homebrew Computer Emulator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-23

Minor release consolidating a working end-to-end homebrew emulator with a live
serial terminal and full 65C02 support. Highlights since 1.2.0:

### Added
- Full 65C02 CMOS instruction set, selectable via `cpu.type: "65C02"`
- Live serial terminal via a raw socat PTY bridge; connect screen/minicom/picocom
- `registerSize` for ACIA/VIA to model partial address decoding (register mirroring)
- Hex addresses in config files (`"0xE000"`) alongside decimal
- ROM paths resolved relative to the config file
- `-l` / `--load <config>` startup flag; default config loaded when none given
- `serialdebug` command (live ACIA TX hex dump) and 65C02-aware `disasm`/`d`
- Peripherals shown in the `regions` command with address ranges
- Annotated reference config (`examples/full-reference-config.yaml`)
- Test BIOS binaries for serial echo and WozMon

### Fixed
- ACIA transmit FIFO so blind-delay drivers (WozMon) don't drop characters
- ACIA register mirroring across the decoded window
- ACIA timing tied to the configured CPU clock (supports baud-rate crystals)
- `quit` no longer hangs the terminal
- No double-initialization / double config block on startup
- All example configs corrected (hex, registerSize, RAM/IO layout, ROM paths)

See 1.3.x entries below for the detailed per-fix history.

## [1.3.6] - 2026-10-23

### Fixed
- **ACIA transmit no longer drops characters under blind-delay drivers.**
  Firmware like WozMon writes a byte then waits a fixed delay loop instead of
  polling TDRE. The emulator models transmit time in CPU cycles, and that
  window was longer than the firmware's delay, so the next write landed while
  the transmitter was still "busy" and was silently discarded — producing
  missing characters in serial output. The ACIA now queues bytes written
  during the busy window into a transmit FIFO and sends them in order, so no
  character is lost regardless of how the driver paces its writes.

## [1.3.5] - 2026-10-23

### Fixed
- **ACIA register mirroring.** With `registerSize` > 2, the 68B50 ACIA only
  responded at offsets 0 and 1 and silently ignored writes to higher offsets.
  Firmware relying on partial address decoding (e.g. writing the control
  register at `$7F72` when the base is `$7F70`) had its ACIA config dropped,
  producing no serial output. The register select now masks with `& 0x01` so
  the two real registers mirror across the whole decoded window, matching how
  a 68B50 behaves on hardware that doesn't decode A1.

## [1.3.4] - 2026-10-23

### Fixed
- **Disassembler now decodes 65C02 opcodes.** The `disasm` / `d` command showed
  `??? (3A)` for CMOS-only instructions because the disassembler's opcode table
  predated the 65C02 core support. Added all 65C02 opcodes (INC A, DEC A, PHX/PHY,
  PLX/PLY, BRA, BIT #, zero-page indirect, TSB/TRB, STZ, JMP (abs,X)) to the
  disassembler and to both instruction-length tables (cli.ts and memory-inspector.ts)
  so listings advance the program counter correctly past CMOS instructions.

  Note: the 65C02 *execution* core was already correct since v1.3.0 — this was
  purely a disassembly display gap.

## [1.3.3] - 2026-10-22

### Fixed
- **`quit` no longer hangs the terminal.** The socat PTY bridge held the Node
  event loop open through a blocking `fs.read` on the master fd. Rewritten to:
  - Open the master PTY fd in non-blocking mode (`O_NONBLOCK`)
  - Poll it on a timer instead of a chained blocking async read, so no syscall
    is ever in flight at exit
  - Spawn socat exactly once (previously spawned twice — a blocking `spawnSync`
    then a second `spawn`, orphaning a PTY pair)
  - Kill the socat process with SIGKILL and clear the poll timer on close()
- Removed the duplicate "Execution stopped" message on quit. `stop()` now only
  logs when it actually stops a running execution.

## [1.3.2] - 2026-10-22

### Changed
- **Startup always loads a config file.** If `-l` / `--load` is given, that config
  is loaded; otherwise the default config (`bin/config/simple6502-config.json`) is
  loaded. This removes the previous double-initialization where the built-in default
  ran first and a `-l` config loaded on top, producing two configuration blocks and
  double-registering peripherals.
- Input handling is paused until the startup config load completes, so piped or
  queued input can no longer race ahead of initialization.

## [1.3.1] - 2026-10-22

### Added
- **`-l` / `--load <config>` command-line flag** — load a config file on startup
  instead of typing `load ...` at the prompt:
  `./6502-emulator -l config/simple6502-config.json`

### Fixed
- Launcher now forwards command-line arguments to the CLI process. Previously
  flags like `-l` were parsed only by the launcher and never reached the emulator,
  so `-l` silently had no effect.

## [1.3.0] - 2026-10-22

### Added
- **Live serial terminal via socat** — ACIA now creates a clean raw PTY pair using socat.
  Connect any terminal program (`screen /dev/ttysN 28800`) and get full bidirectional
  serial I/O with zero character corruption. Set `"serialPort": "pty"` in your config.
- **`registerSize` config field** for ACIA and VIA — controls how many bytes the peripheral
  occupies in the address space, enabling correct partial address decoding (e.g. ACIA
  mirrored across `$7F70–$7F73` with `registerSize: 4`).
- **Hex address support in config files** — all numeric fields now accept `"0xE000"` strings
  alongside plain decimal integers.
- **ROM paths resolve relative to config file** — keep your config and ROM images in the same
  folder; paths resolve from the config's location regardless of where the emulator was launched.
- **`load` command path resolution** — relative paths in the `load` command now resolve from
  the directory you launched the emulator from (`EMU_LAUNCH_DIR`), not the process CWD.
- **`regions` command shows peripherals** — ACIA, VIA, and all registered peripherals now
  appear in the memory map alongside RAM and ROM, sorted by address.
- **`serialdebug` command** — toggles a live hex dump of every ACIA TX byte to the CLI
  console, letting you verify serial output without a terminal program.
- **ACIA clock frequency config** — `setCpuFrequency()` lets the ACIA timing model use the
  actual configured CPU clock. Supports baud-rate crystals (e.g. 1.8432 MHz → exact 28800 baud
  with `/16` divide, `cyclesPerBit = 1024`).
- **`Emulator.shutdown()`** — cleanly closes serial ports and PTY processes on exit, preventing
  the `quit` command from hanging.
- **Full reference config** (`examples/full-reference-config.yaml`) — annotated YAML documenting
  every available option with explanations, valid values, and practical advice.
- **Test BIOS** (`bin/config/BIOS.bin` / `make-bios.js`) — minimal 65C02 BIOS that initialises
  the ACIA, prints a startup banner, and echoes received characters. No assembler required.
- All example configs updated: hex addresses, `registerSize`, corrected RAM/IO layouts,
  ROM paths relative to config file.

### Fixed
- ACIA `CTS`/`DCD` status bits now asserted at startup (were always 0, blocking firmware
  that checks CTS before transmitting).
- `quit`/`exit` no longer hangs when a PTY serial port is active.
- Regression: ROM path resolution fix restored after being lost in a previous edit.

### Changed
- Serial port backend for ACIA is now selected via `serialPort` in config:
  `"pty"` → socat raw PTY (recommended), omit → console stdout.
- `node_modules/`, `dist/`, and `build/` removed from git tracking (were committed
  despite being in `.gitignore`).
- Default clock speed for simple6502 config updated to 1.8432 MHz to match real SBC hardware.



### Added
- Complete 6502 instruction set support with all 151 official opcodes
- Improved MyLittle6502 core integration for enhanced accuracy
- Comprehensive spec system for CPU instruction set completion
- Proper C linkage with extern "C" declarations for native addon
- Accessor functions for CPU state management in native implementation

### Fixed
- **CRITICAL**: Fixed "Unknown opcode" errors for AND (0x29), ORA, EOR, and other missing instructions
- **CRITICAL**: Fixed false breakpoint detection caused by incorrect cycle counting
- Fixed native addon cycle counting - now returns proper instruction cycles instead of 0
- Fixed CPU step function to properly handle step6502() return values
- Resolved segmentation faults in native addon execution

### Changed
- Replaced incomplete fake6502 implementation with improved MyLittle6502 core
- Updated native CPU implementation to use complete instruction set
- Enhanced cycle timing accuracy for all instructions
- Improved error handling and symbol resolution in native addon

### Technical Details
- Integrated MyLittle6502 core from C-Chads repository with bug fixes
- Added proper cycle counting mechanism that tracks instruction-specific cycles
- Implemented accessor functions to bridge static variables in header-only implementation
- Fixed C++ name mangling issues that prevented proper symbol linking
- Enhanced CPU reset function to avoid memory access during initialization

### Performance
- Eliminated "unknown opcode" execution halts
- Improved instruction execution reliability
- Enhanced debugging accuracy with proper cycle timing
- Reduced false positive breakpoint triggers to zero

## [1.0.0] - 2024-12-18

### Added
- Initial release of 6502/65C02 Homebrew Computer Emulator
- Interactive CLI with comprehensive command set
- Basic 6502 CPU emulation with limited instruction set
- Memory management system with RAM, ROM, and I/O regions
- Peripheral simulation (68B50 ACIA, 65C22 VIA)
- Breakpoint system and debugging tools
- Performance profiling and optimization features
- CC65 toolchain compatibility
- Multiple ROM format support (binary, Intel HEX, Motorola S-record)
- Configurable system configurations and examples
- Comprehensive documentation and user guide

### Known Issues (Fixed in 1.2.0)
- Limited instruction set causing "Unknown opcode" errors
- False breakpoint detection due to cycle counting issues
- Incomplete native CPU implementation