# 6502 Emulator Evaluation

## Overview

This document evaluates open-source 6502/65C02 emulators for integration into our homebrew computer emulator project. The evaluation focuses on accuracy, licensing, integration ease, and community support.

## Evaluation Criteria

1. **Accuracy**: Cycle-accurate instruction execution and proper flag handling
2. **License Compatibility**: Open source with permissive licensing for commercial use
3. **Integration Ease**: Clean API for memory callbacks and state access
4. **Documentation**: Well-documented instruction set implementation
5. **Community Support**: Active maintenance and bug fixes
6. **65C02 Support**: Support for 65C02 extensions beyond basic 6502

## Evaluated Emulators

### 1. lib6502 (C Library)

**Repository**: https://github.com/ccoffing/lib6502
**License**: MIT License
**Language**: C
**Last Updated**: 2019 (less active)

**Pros**:
- Clean C API that's easy to wrap in TypeScript/Node.js
- Cycle-accurate execution
- Memory callback system for custom memory mapping
- Small footprint and fast execution
- MIT license allows commercial use

**Cons**:
- Limited recent activity (last major update 2019)
- Basic 6502 only, no 65C02 extensions
- Minimal documentation
- No built-in debugging features

**Integration Approach**:
- Use Node.js native addons (node-gyp) to wrap C library
- Implement TypeScript wrapper around native module
- Add 65C02 instruction extensions manually if needed

### 2. fake6502 (C Library)

**Repository**: https://github.com/gianlucag/fake6502
**License**: Public Domain
**Language**: C
**Last Updated**: 2021

**Pros**:
- Public domain license (no restrictions)
- Very lightweight and fast
- Easy to embed and modify
- Clean, readable code
- Supports both 6502 and some 65C02 instructions

**Cons**:
- Minimal documentation
- No official 65C02 support (would need custom implementation)
- Limited debugging features
- Less community support

**Integration Approach**:
- Embed C code directly in Node.js native addon
- Extend with 65C02 instructions as needed
- Build custom debugging layer on top

### 3. py65 (Python)

**Repository**: https://github.com/mnaberez/py65
**License**: BSD 3-Clause License
**Language**: Python
**Last Updated**: Active (2023)

**Pros**:
- Active development and maintenance
- Excellent documentation
- Built-in debugging and monitoring tools
- Support for multiple 6502 variants including 65C02
- Clean object-oriented design
- Strong community support

**Cons**:
- Python-based (slower than C implementations)
- Would require Python bridge or port to TypeScript
- Larger memory footprint
- More complex integration with Node.js/TypeScript

**Integration Approach**:
- Option 1: Use child process to run Python emulator, communicate via IPC
- Option 2: Port core emulation logic to TypeScript
- Option 3: Use PyNode or similar Python-Node.js bridge

### 4. 6502.ts (TypeScript)

**Repository**: https://github.com/6502ts/6502.ts
**License**: MIT License
**Language**: TypeScript
**Last Updated**: 2022

**Pros**:
- Native TypeScript implementation
- No FFI or binding complexity
- Good documentation
- Cycle-accurate emulation
- Built-in debugging support
- MIT license

**Cons**:
- Less mature than C implementations
- Potentially slower than native C code
- Limited 65C02 support
- Smaller community

**Integration Approach**:
- Direct npm dependency integration
- Extend with additional 65C02 instructions
- Customize memory and I/O interfaces

## Recommendation

### Primary Choice: fake6502 with Node.js Native Addon

**Rationale**:
1. **Public Domain License**: No licensing restrictions for any use case
2. **Performance**: C implementation provides optimal speed
3. **Simplicity**: Lightweight and easy to understand/modify
4. **Flexibility**: Can be extended with 65C02 instructions as needed
5. **Integration**: Clean C API suitable for Node.js native addon wrapping

**Implementation Plan**:
1. Create Node.js native addon using node-gyp
2. Wrap fake6502 C code with TypeScript interface
3. Add 65C02 instruction extensions
4. Implement memory callback system for homebrew hardware
5. Add debugging and tracing capabilities

### Secondary Choice: 6502.ts

**Rationale**:
- Fallback option if native addon proves problematic
- Easier development and debugging
- No build complexity for end users
- Can be modified directly in TypeScript

## Integration Architecture

```
┌─────────────────────┐
│   TypeScript App    │
├─────────────────────┤
│  CPU6502 Interface  │  ← Our wrapper interface
├─────────────────────┤
│   Native Addon      │  ← Node.js C++ binding
├─────────────────────┤
│     fake6502        │  ← C emulator core
└─────────────────────┘
```

## License Compliance

### fake6502 (Public Domain)
- **License Text**: "This code is released to the public domain"
- **Requirements**: None
- **Commercial Use**: Allowed
- **Modification**: Allowed
- **Distribution**: Allowed
- **Attribution**: Not required but recommended

### Integration License Strategy
- Our emulator wrapper: MIT License
- fake6502 core: Public Domain (no restrictions)
- Overall project: MIT License with attribution to fake6502

## Next Steps

1. Set up Node.js native addon build environment
2. Create initial TypeScript wrapper interface
3. Implement basic CPU integration with memory callbacks
4. Add 65C02 instruction extensions
5. Create test suite for CPU integration
6. Document integration approach and build requirements