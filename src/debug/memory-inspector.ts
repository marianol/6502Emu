import { MemoryManager } from '../core/memory';

export interface MemoryInspector {
  readRange(startAddr: number, length: number): Uint8Array;
  writeRange(startAddr: number, data: Uint8Array): void;
  searchMemory(pattern: Uint8Array): number[];
  compareMemory(addr1: number, addr2: number, length: number): boolean;
  dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string;
}

export class MemoryInspectorImpl implements MemoryInspector {
  constructor(private memoryManager: MemoryManager) {}

  readRange(startAddr: number, length: number): Uint8Array {
    const data = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = this.memoryManager.read(startAddr + i);
    }
    return data;
  }

  writeRange(startAddr: number, data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.memoryManager.write(startAddr + i, data[i]);
    }
  }

  searchMemory(pattern: Uint8Array): number[] {
    const results: number[] = [];
    const memorySize = 0x10000; // 64KB address space
    
    for (let addr = 0; addr <= memorySize - pattern.length; addr++) {
      let match = true;
      for (let i = 0; i < pattern.length; i++) {
        if (this.memoryManager.read(addr + i) !== pattern[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        results.push(addr);
      }
    }
    
    return results;
  }

  compareMemory(addr1: number, addr2: number, length: number): boolean {
    for (let i = 0; i < length; i++) {
      if (this.memoryManager.read(addr1 + i) !== this.memoryManager.read(addr2 + i)) {
        return false;
      }
    }
    return true;
  }

  dumpMemory(startAddr: number, length: number, format: 'hex' | 'ascii' | 'disasm'): string {
    switch (format) {
      case 'hex':
        return this.dumpHex(startAddr, length);
      case 'ascii':
        return this.dumpAscii(startAddr, length);
      case 'disasm':
        return this.dumpDisassembly(startAddr, length);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private dumpHex(startAddr: number, length: number): string {
    const lines: string[] = [];
    const bytesPerLine = 16;
    
    for (let addr = startAddr; addr < startAddr + length; addr += bytesPerLine) {
      const hexBytes: string[] = [];
      const asciiChars: string[] = [];
      
      for (let i = 0; i < bytesPerLine && addr + i < startAddr + length; i++) {
        const byte = this.memoryManager.read(addr + i);
        hexBytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
        asciiChars.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
      }
      
      const addrStr = addr.toString(16).padStart(4, '0').toUpperCase();
      const hexStr = hexBytes.join(' ').padEnd(47, ' '); // 16 bytes * 3 chars - 1
      const asciiStr = asciiChars.join('');
      
      lines.push(`${addrStr}: ${hexStr} |${asciiStr}|`);
    }
    
    return lines.join('\n');
  }

  private dumpAscii(startAddr: number, length: number): string {
    const chars: string[] = [];
    
    for (let i = 0; i < length; i++) {
      const byte = this.memoryManager.read(startAddr + i);
      chars.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
    }
    
    return chars.join('');
  }

  private dumpDisassembly(startAddr: number, length: number): string {
    // Basic 6502 disassembly - simplified implementation
    const lines: string[] = [];
    let addr = startAddr;
    const endAddr = startAddr + length;
    
    while (addr < endAddr) {
      const opcode = this.memoryManager.read(addr);
      const instruction = this.disassembleInstruction(addr, opcode);
      lines.push(instruction);
      addr += this.getInstructionLength(opcode);
    }
    
    return lines.join('\n');
  }

  private disassembleInstruction(addr: number, opcode: number): string {
    const addrStr = addr.toString(16).padStart(4, '0').toUpperCase();
    const opcodeStr = opcode.toString(16).padStart(2, '0').toUpperCase();
    
    const length = this.getInstructionLength(opcode);
    const { mnemonic, operandDisplay } = this.formatInstruction(addr, opcode, length);
    
    // Build operand bytes string for display
    let operandBytes = '';
    if (length > 1) {
      const operand1 = this.memoryManager.read(addr + 1);
      operandBytes = operand1.toString(16).padStart(2, '0').toUpperCase();
      
      if (length > 2) {
        const operand2 = this.memoryManager.read(addr + 2);
        operandBytes += operand2.toString(16).padStart(2, '0').toUpperCase();
      }
    }
    
    return `${addrStr}: ${opcodeStr} ${operandBytes.padEnd(4)} ${mnemonic}${operandDisplay}`;
  }

  private formatInstruction(addr: number, opcode: number, length: number): { mnemonic: string, operandDisplay: string } {
    // Read operands
    let operand1 = 0, operand2 = 0, operand16 = 0;
    if (length > 1) {
      operand1 = this.memoryManager.read(addr + 1);
      if (length > 2) {
        operand2 = this.memoryManager.read(addr + 2);
        operand16 = operand1 | (operand2 << 8); // Little-endian 16-bit value
      }
    }

    // Format based on opcode
    switch (opcode) {
      // Implied/Accumulator instructions
      case 0x00: return { mnemonic: 'BRK', operandDisplay: '' };
      case 0x08: return { mnemonic: 'PHP', operandDisplay: '' };
      case 0x0A: return { mnemonic: 'ASL', operandDisplay: ' A' };
      case 0x18: return { mnemonic: 'CLC', operandDisplay: '' };
      case 0x28: return { mnemonic: 'PLP', operandDisplay: '' };
      case 0x2A: return { mnemonic: 'ROL', operandDisplay: ' A' };
      case 0x38: return { mnemonic: 'SEC', operandDisplay: '' };
      case 0x40: return { mnemonic: 'RTI', operandDisplay: '' };
      case 0x48: return { mnemonic: 'PHA', operandDisplay: '' };
      case 0x4A: return { mnemonic: 'LSR', operandDisplay: ' A' };
      case 0x58: return { mnemonic: 'CLI', operandDisplay: '' };
      case 0x60: return { mnemonic: 'RTS', operandDisplay: '' };
      case 0x68: return { mnemonic: 'PLA', operandDisplay: '' };
      case 0x6A: return { mnemonic: 'ROR', operandDisplay: ' A' };
      case 0x78: return { mnemonic: 'SEI', operandDisplay: '' };
      case 0x88: return { mnemonic: 'DEY', operandDisplay: '' };
      case 0x8A: return { mnemonic: 'TXA', operandDisplay: '' };
      case 0x98: return { mnemonic: 'TYA', operandDisplay: '' };
      case 0x9A: return { mnemonic: 'TXS', operandDisplay: '' };
      case 0xA8: return { mnemonic: 'TAY', operandDisplay: '' };
      case 0xAA: return { mnemonic: 'TAX', operandDisplay: '' };
      case 0xB8: return { mnemonic: 'CLV', operandDisplay: '' };
      case 0xBA: return { mnemonic: 'TSX', operandDisplay: '' };
      case 0xC8: return { mnemonic: 'INY', operandDisplay: '' };
      case 0xCA: return { mnemonic: 'DEX', operandDisplay: '' };
      case 0xD8: return { mnemonic: 'CLD', operandDisplay: '' };
      case 0xE8: return { mnemonic: 'INX', operandDisplay: '' };
      case 0xEA: return { mnemonic: 'NOP', operandDisplay: '' };
      case 0xF8: return { mnemonic: 'SED', operandDisplay: '' };

      // Immediate instructions
      case 0x09: return { mnemonic: 'ORA', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x29: return { mnemonic: 'AND', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x49: return { mnemonic: 'EOR', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x69: return { mnemonic: 'ADC', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA0: return { mnemonic: 'LDY', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA2: return { mnemonic: 'LDX', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA9: return { mnemonic: 'LDA', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xC0: return { mnemonic: 'CPY', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xC9: return { mnemonic: 'CMP', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xE0: return { mnemonic: 'CPX', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xE9: return { mnemonic: 'SBC', operandDisplay: ` #$${operand1.toString(16).padStart(2, '0').toUpperCase()}` };

      // Zero page instructions
      case 0x05: return { mnemonic: 'ORA', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x06: return { mnemonic: 'ASL', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x24: return { mnemonic: 'BIT', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x25: return { mnemonic: 'AND', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x26: return { mnemonic: 'ROL', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x45: return { mnemonic: 'EOR', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x46: return { mnemonic: 'LSR', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x65: return { mnemonic: 'ADC', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x66: return { mnemonic: 'ROR', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x84: return { mnemonic: 'STY', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x85: return { mnemonic: 'STA', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0x86: return { mnemonic: 'STX', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA4: return { mnemonic: 'LDY', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA5: return { mnemonic: 'LDA', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xA6: return { mnemonic: 'LDX', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xC4: return { mnemonic: 'CPY', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xC5: return { mnemonic: 'CMP', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xC6: return { mnemonic: 'DEC', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xE4: return { mnemonic: 'CPX', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xE5: return { mnemonic: 'SBC', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };
      case 0xE6: return { mnemonic: 'INC', operandDisplay: ` $${operand1.toString(16).padStart(2, '0').toUpperCase()}` };

      // Absolute instructions
      case 0x0D: return { mnemonic: 'ORA', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x0E: return { mnemonic: 'ASL', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x20: return { mnemonic: 'JSR', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x2C: return { mnemonic: 'BIT', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x2D: return { mnemonic: 'AND', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x2E: return { mnemonic: 'ROL', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x4C: return { mnemonic: 'JMP', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x4D: return { mnemonic: 'EOR', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x4E: return { mnemonic: 'LSR', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x6C: return { mnemonic: 'JMP', operandDisplay: ` ($${operand16.toString(16).padStart(4, '0').toUpperCase()})` };
      case 0x6D: return { mnemonic: 'ADC', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x6E: return { mnemonic: 'ROR', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x8C: return { mnemonic: 'STY', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x8D: return { mnemonic: 'STA', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x8E: return { mnemonic: 'STX', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xAC: return { mnemonic: 'LDY', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xAD: return { mnemonic: 'LDA', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xAE: return { mnemonic: 'LDX', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xCC: return { mnemonic: 'CPY', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xCD: return { mnemonic: 'CMP', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xCE: return { mnemonic: 'DEC', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xEC: return { mnemonic: 'CPX', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xED: return { mnemonic: 'SBC', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xEE: return { mnemonic: 'INC', operandDisplay: ` $${operand16.toString(16).padStart(4, '0').toUpperCase()}` };

      // Relative branches (calculate target address)
      case 0x10: return { mnemonic: 'BPL', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x30: return { mnemonic: 'BMI', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x50: return { mnemonic: 'BVC', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x70: return { mnemonic: 'BVS', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0x90: return { mnemonic: 'BCC', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xB0: return { mnemonic: 'BCS', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xD0: return { mnemonic: 'BNE', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };
      case 0xF0: return { mnemonic: 'BEQ', operandDisplay: ` $${this.calculateBranchTarget(addr, operand1).toString(16).padStart(4, '0').toUpperCase()}` };

      // Add more instructions as needed...
      default:
        return { mnemonic: `??? (${opcode.toString(16).padStart(2, '0').toUpperCase()})`, operandDisplay: '' };
    }
  }

  private calculateBranchTarget(addr: number, offset: number): number {
    // Convert unsigned byte to signed offset
    const signedOffset = offset > 127 ? offset - 256 : offset;
    // Branch target is PC + 2 (after instruction) + offset
    return (addr + 2 + signedOffset) & 0xFFFF;
  }

  private getOpcodeMnemonic(opcode: number): string {
    // Simplified opcode to mnemonic mapping
    const opcodes: { [key: number]: string } = {
      0x00: 'BRK',
      0x01: 'ORA ($nn,X)',
      0x05: 'ORA $nn',
      0x06: 'ASL $nn',
      0x08: 'PHP',
      0x09: 'ORA #$nn',
      0x0A: 'ASL A',
      0x0D: 'ORA $nnnn',
      0x0E: 'ASL $nnnn',
      0x10: 'BPL $nn',
      0x11: 'ORA ($nn),Y',
      0x15: 'ORA $nn,X',
      0x16: 'ASL $nn,X',
      0x18: 'CLC',
      0x19: 'ORA $nnnn,Y',
      0x1D: 'ORA $nnnn,X',
      0x1E: 'ASL $nnnn,X',
      0x20: 'JSR $nnnn',
      0x21: 'AND ($nn,X)',
      0x24: 'BIT $nn',
      0x25: 'AND $nn',
      0x26: 'ROL $nn',
      0x28: 'PLP',
      0x29: 'AND #$nn',
      0x2A: 'ROL A',
      0x2C: 'BIT $nnnn',
      0x2D: 'AND $nnnn',
      0x2E: 'ROL $nnnn',
      0x30: 'BMI $nn',
      0x31: 'AND ($nn),Y',
      0x35: 'AND $nn,X',
      0x36: 'ROL $nn,X',
      0x38: 'SEC',
      0x39: 'AND $nnnn,Y',
      0x3D: 'AND $nnnn,X',
      0x3E: 'ROL $nnnn,X',
      0x40: 'RTI',
      0x41: 'EOR ($nn,X)',
      0x45: 'EOR $nn',
      0x46: 'LSR $nn',
      0x48: 'PHA',
      0x49: 'EOR #$nn',
      0x4A: 'LSR A',
      0x4C: 'JMP $nnnn',
      0x4D: 'EOR $nnnn',
      0x4E: 'LSR $nnnn',
      0x50: 'BVC $nn',
      0x51: 'EOR ($nn),Y',
      0x55: 'EOR $nn,X',
      0x56: 'LSR $nn,X',
      0x58: 'CLI',
      0x59: 'EOR $nnnn,Y',
      0x5D: 'EOR $nnnn,X',
      0x5E: 'LSR $nnnn,X',
      0x60: 'RTS',
      0x61: 'ADC ($nn,X)',
      0x65: 'ADC $nn',
      0x66: 'ROR $nn',
      0x68: 'PLA',
      0x69: 'ADC #$nn',
      0x6A: 'ROR A',
      0x6C: 'JMP ($nnnn)',
      0x6D: 'ADC $nnnn',
      0x6E: 'ROR $nnnn',
      0x70: 'BVS $nn',
      0x71: 'ADC ($nn),Y',
      0x75: 'ADC $nn,X',
      0x76: 'ROR $nn,X',
      0x78: 'SEI',
      0x79: 'ADC $nnnn,Y',
      0x7D: 'ADC $nnnn,X',
      0x7E: 'ROR $nnnn,X',
      0x81: 'STA ($nn,X)',
      0x84: 'STY $nn',
      0x85: 'STA $nn',
      0x86: 'STX $nn',
      0x88: 'DEY',
      0x8A: 'TXA',
      0x8C: 'STY $nnnn',
      0x8D: 'STA $nnnn',
      0x8E: 'STX $nnnn',
      0x90: 'BCC $nn',
      0x91: 'STA ($nn),Y',
      0x94: 'STY $nn,X',
      0x95: 'STA $nn,X',
      0x96: 'STX $nn,Y',
      0x98: 'TYA',
      0x99: 'STA $nnnn,Y',
      0x9A: 'TXS',
      0x9D: 'STA $nnnn,X',
      0xA0: 'LDY #$nn',
      0xA1: 'LDA ($nn,X)',
      0xA2: 'LDX #$nn',
      0xA4: 'LDY $nn',
      0xA5: 'LDA $nn',
      0xA6: 'LDX $nn',
      0xA8: 'TAY',
      0xA9: 'LDA #$nn',
      0xAA: 'TAX',
      0xAC: 'LDY $nnnn',
      0xAD: 'LDA $nnnn',
      0xAE: 'LDX $nnnn',
      0xB0: 'BCS $nn',
      0xB1: 'LDA ($nn),Y',
      0xB4: 'LDY $nn,X',
      0xB5: 'LDA $nn,X',
      0xB6: 'LDX $nn,Y',
      0xB8: 'CLV',
      0xB9: 'LDA $nnnn,Y',
      0xBA: 'TSX',
      0xBC: 'LDY $nnnn,X',
      0xBD: 'LDA $nnnn,X',
      0xBE: 'LDX $nnnn,Y',
      0xC0: 'CPY #$nn',
      0xC1: 'CMP ($nn,X)',
      0xC4: 'CPY $nn',
      0xC5: 'CMP $nn',
      0xC6: 'DEC $nn',
      0xC8: 'INY',
      0xC9: 'CMP #$nn',
      0xCA: 'DEX',
      0xCC: 'CPY $nnnn',
      0xCD: 'CMP $nnnn',
      0xCE: 'DEC $nnnn',
      0xD0: 'BNE $nn',
      0xD1: 'CMP ($nn),Y',
      0xD5: 'CMP $nn,X',
      0xD6: 'DEC $nn,X',
      0xD8: 'CLD',
      0xD9: 'CMP $nnnn,Y',
      0xDD: 'CMP $nnnn,X',
      0xDE: 'DEC $nnnn,X',
      0xE0: 'CPX #$nn',
      0xE1: 'SBC ($nn,X)',
      0xE4: 'CPX $nn',
      0xE5: 'SBC $nn',
      0xE6: 'INC $nn',
      0xE8: 'INX',
      0xE9: 'SBC #$nn',
      0xEA: 'NOP',
      0xEC: 'CPX $nnnn',
      0xED: 'SBC $nnnn',
      0xEE: 'INC $nnnn',
      0xF0: 'BEQ $nn',
      0xF1: 'SBC ($nn),Y',
      0xF5: 'SBC $nn,X',
      0xF6: 'INC $nn,X',
      0xF8: 'SED',
      0xF9: 'SBC $nnnn,Y',
      0xFD: 'SBC $nnnn,X',
      0xFE: 'INC $nnnn,X'
    };
    
    return opcodes[opcode] || `??? ($${opcode.toString(16).padStart(2, '0').toUpperCase()})`;
  }

  private getInstructionLength(opcode: number): number {
    // Simplified instruction length lookup
    const lengths: { [key: number]: number } = {
      // Implied/Accumulator (1 byte)
      0x00: 1, 0x08: 1, 0x0A: 1, 0x18: 1, 0x28: 1, 0x2A: 1, 0x38: 1, 0x40: 1,
      0x48: 1, 0x4A: 1, 0x58: 1, 0x60: 1, 0x68: 1, 0x6A: 1, 0x78: 1, 0x88: 1,
      0x8A: 1, 0x98: 1, 0x9A: 1, 0xA8: 1, 0xAA: 1, 0xB8: 1, 0xBA: 1, 0xC8: 1,
      0xCA: 1, 0xD8: 1, 0xE8: 1, 0xEA: 1, 0xF8: 1,
      
      // Immediate/Zero Page/Relative (2 bytes)
      0x01: 2, 0x05: 2, 0x06: 2, 0x09: 2, 0x10: 2, 0x11: 2, 0x15: 2, 0x16: 2,
      0x19: 2, 0x21: 2, 0x24: 2, 0x25: 2, 0x26: 2, 0x29: 2, 0x30: 2, 0x31: 2,
      0x35: 2, 0x36: 2, 0x39: 2, 0x41: 2, 0x45: 2, 0x46: 2, 0x49: 2, 0x50: 2,
      0x51: 2, 0x55: 2, 0x56: 2, 0x59: 2, 0x61: 2, 0x65: 2, 0x66: 2, 0x69: 2,
      0x70: 2, 0x71: 2, 0x75: 2, 0x76: 2, 0x79: 2, 0x81: 2, 0x84: 2, 0x85: 2,
      0x86: 2, 0x90: 2, 0x91: 2, 0x94: 2, 0x95: 2, 0x96: 2, 0xA0: 2, 0xA1: 2,
      0xA2: 2, 0xA4: 2, 0xA5: 2, 0xA6: 2, 0xA9: 2, 0xB0: 2, 0xB1: 2, 0xB4: 2,
      0xB5: 2, 0xB6: 2, 0xB9: 2, 0xC0: 2, 0xC1: 2, 0xC4: 2, 0xC5: 2, 0xC6: 2,
      0xC9: 2, 0xD0: 2, 0xD1: 2, 0xD5: 2, 0xD6: 2, 0xD9: 2, 0xE0: 2, 0xE1: 2,
      0xE4: 2, 0xE5: 2, 0xE6: 2, 0xE9: 2, 0xF0: 2, 0xF1: 2, 0xF5: 2, 0xF6: 2,
      0xF9: 2,
      
      // Absolute (3 bytes)
      0x0D: 3, 0x0E: 3, 0x1D: 3, 0x1E: 3, 0x20: 3, 0x2C: 3, 0x2D: 3, 0x2E: 3,
      0x3D: 3, 0x3E: 3, 0x4C: 3, 0x4D: 3, 0x4E: 3, 0x5D: 3, 0x5E: 3, 0x6C: 3,
      0x6D: 3, 0x6E: 3, 0x7D: 3, 0x7E: 3, 0x8C: 3, 0x8D: 3, 0x8E: 3, 0x99: 3,
      0x9D: 3, 0xAC: 3, 0xAD: 3, 0xAE: 3, 0xBC: 3, 0xBD: 3, 0xBE: 3, 0xCC: 3,
      0xCD: 3, 0xCE: 3, 0xDD: 3, 0xDE: 3, 0xEC: 3, 0xED: 3, 0xEE: 3, 0xFD: 3,
      0xFE: 3
    };
    
    return lengths[opcode] || 1;
  }
}