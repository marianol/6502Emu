# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-19

### Added
- **Memory Disassembler**: New `disasm`/`d` commands for 6502 assembly disassembly
  - Shows actual operand values instead of generic placeholders
  - Calculates branch targets for relative instructions
  - Supports all 6502 addressing modes (immediate, zero page, absolute, indirect)
  - Continuation support with return key like memory commands
- **Memory Continuation Feature**: Press return after `mem`/`m` commands to continue viewing next memory block
- **Single-Letter Command Aliases**: 
  - `m` as alias for `mem` command
  - `w` as alias for `write` command
  - `d` as alias for `disasm` command
- **Enhanced Stop Command**: Now displays CPU registers when stopping execution
- **Self-Contained Launcher Script**: Global installation support with automatic fallback modes

### Fixed
- **CPU Execution Issues**: 
  - Fixed native addon C++ compilation errors
  - Improved fallback CPU implementation with more 6502 instruction support
  - Fixed ROM loading order to ensure ROM loads before CPU reset
  - CPU now correctly starts at reset vector and executes instructions
- **CLI Output Issues**:
  - Removed duplicate "Execution started" and "Execution stopped" messages
  - Fixed timing issues with async ROM loading
- **Disassembler Output**: Now shows actual operand values (e.g., `LDA #$42` instead of `LDA #$nn`)

### Improved
- **Fallback CPU Implementation**: Added support for more 6502 instructions (LDA, STA, JMP, NOP, BRK, RTI)
- **Memory System**: Better ROM region management and loading
- **Documentation**: Comprehensive updates with new command examples and debugging workflows
- **Error Handling**: Better memory region conflict resolution

### Technical
- Added comprehensive .gitignore for build artifacts
- Enhanced instruction cycle counting and flag handling
- Improved memory region filtering and ROM loading logic
- Better async command processing in CLI

## [1.0.0] - 2024-12-18

### Added
- Complete 6502/65C02 CPU emulation
- Configurable memory mapping for RAM, ROM, and I/O
- Peripheral simulation (68B50 ACIA, 65C22 VIA)
- Comprehensive debugging tools
- Performance optimization and benchmarking
- Extensive test suite
- Complete documentation and examples
- CLI interface with debugging commands
- CC65 toolchain compatibility
- Multiple system configuration examples

### Features
- Accurate CPU emulation with fallback implementation
- Memory inspection and manipulation commands
- Step-by-step execution and breakpoint support
- Register manipulation and status display
- ROM loading from binary files
- Peripheral I/O simulation
- Performance profiling and optimization
- Comprehensive test coverage
- User guide and API documentation