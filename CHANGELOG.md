# Changelog

All notable changes to the 6502/65C02 Homebrew Computer Emulator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-19

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