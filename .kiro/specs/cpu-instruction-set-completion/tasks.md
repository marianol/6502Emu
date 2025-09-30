# Implementation Plan

**Note: The native implementation has been successfully updated with the improved MyLittle6502 core and now supports the complete 6502 instruction set, including the AND instruction that was causing the original issue. The focus now is on completing the fallback TypeScript implementation to match the native implementation's capabilities.**

- [ ] 1. Set up instruction infrastructure and addressing modes
  - Create addressing mode helper methods for immediate, zero page, absolute, etc.
  - Implement flag management utilities for consistent flag setting
  - Create opcode mapping table with cycle counts and addressing modes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Implement logical operations (AND, ORA, EOR)
  - [ ] 2.1 Implement AND instruction with all addressing modes
    - Add AND immediate (0x29), zero page (0x25), and absolute (0x2D) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for AND instruction with various operands
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 2.2 Implement ORA instruction with all addressing modes
    - Add ORA immediate (0x09), zero page (0x05), and absolute (0x0D) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for ORA instruction
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 2.3 Implement EOR instruction with all addressing modes
    - Add EOR immediate (0x49), zero page (0x45), and absolute (0x4D) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for EOR instruction
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Implement arithmetic operations (ADC, SBC)
  - [ ] 3.1 Implement ADC instruction with all addressing modes
    - Add ADC immediate (0x69), zero page (0x65), and absolute (0x6D) opcodes
    - Implement proper flag setting for Zero, Negative, Carry, and Overflow flags
    - Handle decimal mode arithmetic correctly
    - Write unit tests for ADC instruction including overflow cases
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 3.2 Implement SBC instruction with all addressing modes
    - Add SBC immediate (0xE9), zero page (0xE5), and absolute (0xED) opcodes
    - Implement proper flag setting for Zero, Negative, Carry, and Overflow flags
    - Handle decimal mode arithmetic correctly
    - Write unit tests for SBC instruction including underflow cases
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Implement comparison operations (CMP, CPX, CPY)
  - [ ] 4.1 Implement CMP instruction with all addressing modes
    - Add CMP immediate (0xC9), zero page (0xC5), and absolute (0xCD) opcodes
    - Implement proper flag setting for Carry, Zero, and Negative flags
    - Write unit tests for CMP instruction with various comparison scenarios
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.2 Implement CPX instruction with all addressing modes
    - Add CPX immediate (0xE0), zero page (0xE4), and absolute (0xEC) opcodes
    - Implement proper flag setting for comparison results
    - Write unit tests for CPX instruction
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.3 Implement CPY instruction with all addressing modes
    - Add CPY immediate (0xC0), zero page (0xC4), and absolute (0xCC) opcodes
    - Implement proper flag setting for comparison results
    - Write unit tests for CPY instruction
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Implement register transfer and increment/decrement operations
  - [ ] 5.1 Implement register transfer instructions
    - Add TAX (0xAA), TAY (0xA8), TXA (0x8A), TYA (0x98), TSX (0xBA), TXS (0x9A) opcodes
    - Implement proper flag setting for Zero and Negative flags where applicable
    - Write unit tests for all register transfer instructions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 5.2 Implement increment instructions
    - Add INC zero page (0xE6) and absolute (0xEE), INX (0xE8), INY (0xC8) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for increment instructions including wraparound cases
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 5.3 Implement decrement instructions
    - Add DEC zero page (0xC6) and absolute (0xCE), DEX (0xCA), DEY (0x88) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for decrement instructions including wraparound cases
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Implement shift and rotate operations
  - [ ] 6.1 Implement arithmetic shift left (ASL)
    - Add ASL accumulator (0x0A), zero page (0x06), and absolute (0x0E) opcodes
    - Implement proper flag setting for Carry, Zero, and Negative flags
    - Write unit tests for ASL instruction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 6.2 Implement logical shift right (LSR)
    - Add LSR accumulator (0x4A), zero page (0x46), and absolute (0x4E) opcodes
    - Implement proper flag setting for Carry, Zero, and Negative flags
    - Write unit tests for LSR instruction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 6.3 Implement rotate left (ROL)
    - Add ROL accumulator (0x2A), zero page (0x26), and absolute (0x2E) opcodes
    - Implement proper flag setting for Carry, Zero, and Negative flags
    - Write unit tests for ROL instruction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 6.4 Implement rotate right (ROR)
    - Add ROR accumulator (0x6A), zero page (0x66), and absolute (0x6E) opcodes
    - Implement proper flag setting for Carry, Zero, and Negative flags
    - Write unit tests for ROR instruction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Implement branch instructions
  - [ ] 7.1 Implement conditional branch instructions
    - Add BCC (0x90), BCS (0xB0), BEQ (0xF0), BNE (0xD0) opcodes
    - Add BMI (0x30), BPL (0x10), BVC (0x50), BVS (0x70) opcodes
    - Implement proper relative addressing and PC calculation
    - Handle page boundary crossing cycle penalties
    - Write unit tests for all branch conditions
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. Implement stack operations
  - [ ] 8.1 Implement stack push/pull instructions
    - Add PHA (0x48), PLA (0x68), PHP (0x08), PLP (0x28) opcodes
    - Implement proper stack pointer management
    - Implement proper flag setting for PLA instruction
    - Write unit tests for stack operations including stack overflow/underflow
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Implement remaining load/store operations
  - [ ] 9.1 Implement additional LDX and LDY addressing modes
    - Add LDX immediate (0xA2), zero page (0xA6), absolute (0xAE) opcodes
    - Add LDY immediate (0xA0), zero page (0xA4), absolute (0xAC) opcodes
    - Implement proper flag setting for Zero and Negative flags
    - Write unit tests for LDX and LDY instructions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 9.2 Implement additional STX and STY addressing modes
    - Add STX zero page (0x86), absolute (0x8E) opcodes
    - Add STY zero page (0x84), absolute (0x8C) opcodes
    - Write unit tests for STX and STY instructions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Implement flag control instructions
  - [ ] 10.1 Implement flag manipulation instructions
    - Add CLC (0x18), SEC (0x38), CLI (0x58), SEI (0x78) opcodes
    - Add CLV (0xB8), CLD (0xD8), SED (0xF8) opcodes
    - Write unit tests for flag control instructions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Implement subroutine operations
  - [ ] 11.1 Implement JSR and RTS instructions
    - Add JSR absolute (0x20) opcode with proper stack management
    - Add RTS (0x60) opcode with proper stack management
    - Write unit tests for subroutine call/return operations
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Add comprehensive integration tests
  - [ ] 12.1 Create instruction set validation tests
    - Write integration tests that verify the specific AND instruction issue is resolved
    - Create test programs that exercise all implemented instructions
    - Verify cycle timing accuracy for all instructions
    - Test complex instruction sequences and flag interactions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.2 Create compatibility tests with native implementation
    - Write tests that compare fallback and native implementation results
    - Ensure both implementations produce identical results for all instructions
    - Test edge cases and boundary conditions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_