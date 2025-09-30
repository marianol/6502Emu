# Design Document

## Overview

This design document outlines the implementation of a complete 6502 instruction set for the fallback CPU emulator. The current implementation only supports a handful of instructions, causing programs to fail when they encounter common opcodes like AND (0x29). The solution involves extending the `executeInstruction` method with all 151 official 6502 opcodes, organized by instruction type and addressing mode.

## Architecture

### Current Architecture Analysis

The CPU emulator uses a dual-mode architecture:
- **Native Mode**: Uses a C-based fake6502 implementation via Node.js addon
- **Fallback Mode**: Pure TypeScript implementation for when native addon is unavailable

The fallback mode currently implements only ~10 instructions out of 151 total 6502 opcodes. The `executeInstruction` method uses a switch statement to handle opcodes, with a default case that logs unknown opcodes and advances the PC.

### Proposed Architecture

The design maintains the existing architecture but significantly expands the fallback implementation:

1. **Instruction Decoder**: Enhanced switch statement with all 151 opcodes
2. **Addressing Mode Handlers**: Reusable methods for different addressing modes
3. **Flag Management**: Centralized flag setting logic for consistency
4. **Cycle Timing**: Accurate cycle counts for each instruction and addressing mode

## Components and Interfaces

### 1. Instruction Categories

Instructions will be organized into logical groups:

- **Load/Store**: LDA, LDX, LDY, STA, STX, STY
- **Arithmetic**: ADC, SBC
- **Logical**: AND, ORA, EOR
- **Shift/Rotate**: ASL, LSR, ROL, ROR
- **Compare**: CMP, CPX, CPY
- **Branch**: BCC, BCS, BEQ, BNE, BMI, BPL, BVC, BVS
- **Jump/Call**: JMP, JSR, RTS
- **Stack**: PHA, PLA, PHP, PLP
- **Register Transfer**: TAX, TAY, TXA, TYA, TSX, TXS
- **Increment/Decrement**: INC, DEC, INX, INY, DEX, DEY
- **Flag Control**: CLC, SEC, CLI, SEI, CLV, CLD, SED
- **System**: BRK, RTI, NOP

### 2. Addressing Mode Handlers

```typescript
interface AddressingModeHandlers {
  immediate(): number;           // #$nn
  zeroPage(): number;           // $nn
  zeroPageX(): number;          // $nn,X
  zeroPageY(): number;          // $nn,Y
  absolute(): number;           // $nnnn
  absoluteX(): number;          // $nnnn,X
  absoluteY(): number;          // $nnnn,Y
  indirectX(): number;          // ($nn,X)
  indirectY(): number;          // ($nn),Y
  relative(): number;           // Branch target
  indirect(): number;           // ($nnnn) - JMP only
}
```

### 3. Flag Management System

```typescript
interface FlagManager {
  setZeroNegative(value: number): void;
  setCarry(carry: boolean): void;
  setOverflow(overflow: boolean): void;
  getCarry(): boolean;
  getZero(): boolean;
  getNegative(): boolean;
  getOverflow(): boolean;
}
```

### 4. Instruction Implementation Pattern

Each instruction follows a consistent pattern:
1. Fetch operand using appropriate addressing mode
2. Perform operation
3. Store result (if applicable)
4. Update flags
5. Update PC
6. Return cycle count

## Data Models

### Opcode Mapping Table

```typescript
interface OpcodeInfo {
  mnemonic: string;
  addressingMode: AddressingMode;
  cycles: number;
  pageCrossPenalty?: boolean;
}

const OPCODE_TABLE: Record<number, OpcodeInfo> = {
  0x29: { mnemonic: 'AND', addressingMode: 'immediate', cycles: 2 },
  0x25: { mnemonic: 'AND', addressingMode: 'zeroPage', cycles: 3 },
  0x2D: { mnemonic: 'AND', addressingMode: 'absolute', cycles: 4 },
  // ... all 151 opcodes
};
```

### Flag Bit Definitions

```typescript
const FLAGS = {
  CARRY: 0x01,
  ZERO: 0x02,
  INTERRUPT: 0x04,
  DECIMAL: 0x08,
  BREAK: 0x10,
  UNUSED: 0x20,
  OVERFLOW: 0x40,
  NEGATIVE: 0x80
} as const;
```

## Error Handling

### Unknown Opcode Handling
- Log warning with opcode and PC address
- Advance PC by 1 to prevent infinite loops
- Return minimum cycle count (2 cycles)
- Consider adding optional strict mode that throws errors

### Memory Access Errors
- Wrap all memory accesses in try-catch blocks
- Handle cases where memory callbacks are not properly set
- Provide meaningful error messages for debugging

### Flag Overflow Protection
- Ensure all flag operations use bitwise AND with appropriate masks
- Prevent flag register corruption from invalid values

## Testing Strategy

### Unit Test Categories

1. **Individual Instruction Tests**
   - Test each opcode with all valid addressing modes
   - Verify correct flag setting behavior
   - Test edge cases (zero results, negative results, carry/overflow)

2. **Addressing Mode Tests**
   - Test each addressing mode with multiple instructions
   - Verify correct memory address calculation
   - Test page boundary crossing behavior

3. **Flag Interaction Tests**
   - Test instructions that read flags (branches, arithmetic with carry)
   - Test flag preservation during operations that don't affect them
   - Test flag combinations

4. **Cycle Timing Tests**
   - Verify correct cycle counts for each instruction
   - Test page crossing penalties
   - Test branch taken/not taken timing

### Integration Tests

1. **Program Execution Tests**
   - Run complete 6502 programs and verify results
   - Test the specific AND instruction case from the user's report
   - Test complex instruction sequences

2. **Compatibility Tests**
   - Compare fallback implementation results with native addon
   - Test against known 6502 test suites
   - Verify identical behavior between modes

### Test Data Structure

```typescript
interface InstructionTest {
  name: string;
  setup: {
    memory: Record<number, number>;
    registers: Partial<CPUState>;
  };
  instruction: {
    opcode: number;
    operands: number[];
  };
  expected: {
    registers: Partial<CPUState>;
    memory?: Record<number, number>;
    cycles: number;
  };
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
- Implement addressing mode helper methods
- Create flag management utilities
- Set up opcode mapping table

### Phase 2: Instruction Groups
- Implement logical operations (AND, ORA, EOR) - addresses immediate user issue
- Implement arithmetic operations (ADC, SBC)
- Implement comparison operations (CMP, CPX, CPY)

### Phase 3: Control Flow
- Implement branch instructions
- Implement jump and subroutine instructions
- Implement stack operations

### Phase 4: Register and Memory Operations
- Implement register transfer instructions
- Implement increment/decrement operations
- Implement shift/rotate operations

### Phase 5: System Instructions
- Implement flag control instructions
- Implement interrupt handling improvements
- Implement remaining miscellaneous instructions

### Phase 6: Testing and Validation
- Comprehensive test suite implementation
- Performance optimization
- Documentation updates

## Performance Considerations

### Optimization Strategies
- Use lookup tables for flag calculations where possible
- Minimize object allocations in hot paths
- Cache frequently accessed values
- Consider using typed arrays for better performance

### Memory Usage
- Reuse addressing mode calculation results
- Avoid creating temporary objects during instruction execution
- Use bitwise operations for flag manipulation

## Compatibility Notes

### 6502 vs 65C02 Differences
- Current design focuses on original 6502 behavior
- Future enhancement could add 65C02 instruction support
- Flag behavior differences should be documented

### Timing Accuracy
- Cycle counts match original 6502 specifications
- Page crossing penalties implemented where applicable
- Branch timing includes taken/not-taken differences