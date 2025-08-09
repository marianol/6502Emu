// ROM loading functionality
// Supports binary, Intel HEX, and Motorola S-record formats

import * as fs from 'fs';
import { ROMImage } from './memory';

export interface LoadedROM {
  data: Uint8Array;
  loadAddress: number;
  entryPoint?: number;
}

export class ROMLoader {
  // Load ROM from file based on format
  static async loadROM(romImage: ROMImage): Promise<LoadedROM> {
    const fileData = await fs.promises.readFile(romImage.file);
    
    switch (romImage.format) {
      case 'binary':
        return this.loadBinary(fileData, romImage.loadAddress);
      case 'ihex':
        return this.loadIntelHex(fileData);
      case 'srec':
        return this.loadMotorolaS(fileData);
      default:
        throw new Error(`Unsupported ROM format: ${romImage.format}`);
    }
  }

  // Load binary ROM file
  private static loadBinary(data: Buffer, loadAddress: number): LoadedROM {
    return {
      data: new Uint8Array(data),
      loadAddress: loadAddress
    };
  }

  // Load Intel HEX format
  private static loadIntelHex(data: Buffer): LoadedROM {
    const lines = data.toString('ascii').split(/\r?\n/);
    const memory = new Map<number, number>();
    let minAddress = 0xFFFF;
    let maxAddress = 0x0000;
    let entryPoint: number | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith(':')) {
        continue;
      }

      try {
        const record = this.parseIntelHexRecord(trimmed);
        
        switch (record.type) {
          case 0x00: // Data record
            for (let i = 0; i < record.data.length; i++) {
              const address = record.address + i;
              memory.set(address, record.data[i]);
              minAddress = Math.min(minAddress, address);
              maxAddress = Math.max(maxAddress, address);
            }
            break;
          case 0x01: // End of file record
            break;
          case 0x05: // Start linear address record (entry point)
            if (record.data.length === 4) {
              entryPoint = (record.data[0] << 24) | (record.data[1] << 16) | 
                          (record.data[2] << 8) | record.data[3];
            }
            break;
          default:
            console.warn(`Unsupported Intel HEX record type: 0x${record.type.toString(16).padStart(2, '0')}`);
        }
      } catch (error) {
        throw new Error(`Invalid Intel HEX record: ${trimmed} - ${error}`);
      }
    }

    if (memory.size === 0) {
      throw new Error('No data found in Intel HEX file');
    }

    // Create contiguous data array
    const size = maxAddress - minAddress + 1;
    const romData = new Uint8Array(size);
    romData.fill(0xFF); // Fill with 0xFF (unprogrammed EPROM value)
    
    for (const [address, value] of memory) {
      romData[address - minAddress] = value;
    }

    return {
      data: romData,
      loadAddress: minAddress,
      entryPoint
    };
  }

  // Parse Intel HEX record
  private static parseIntelHexRecord(line: string): {
    length: number;
    address: number;
    type: number;
    data: number[];
    checksum: number;
  } {
    if (line.length < 11) {
      throw new Error('Record too short');
    }

    const length = parseInt(line.substr(1, 2), 16);
    const address = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);
    const data: number[] = [];
    
    for (let i = 0; i < length; i++) {
      const bytePos = 9 + (i * 2);
      if (bytePos + 1 >= line.length) {
        throw new Error('Unexpected end of record');
      }
      data.push(parseInt(line.substr(bytePos, 2), 16));
    }
    
    const checksumPos = 9 + (length * 2);
    if (checksumPos + 1 >= line.length) {
      throw new Error('Missing checksum');
    }
    const checksum = parseInt(line.substr(checksumPos, 2), 16);

    // Verify checksum
    let sum = length + ((address >> 8) & 0xFF) + (address & 0xFF) + type;
    for (const byte of data) {
      sum += byte;
    }
    sum = (256 - (sum & 0xFF)) & 0xFF;
    
    if (sum !== checksum) {
      throw new Error(`Checksum mismatch: expected 0x${sum.toString(16).padStart(2, '0')}, got 0x${checksum.toString(16).padStart(2, '0')}`);
    }

    return { length, address, type, data, checksum };
  }

  // Load Motorola S-record format
  private static loadMotorolaS(data: Buffer): LoadedROM {
    const lines = data.toString('ascii').split(/\r?\n/);
    const memory = new Map<number, number>();
    let minAddress = 0xFFFF;
    let maxAddress = 0x0000;
    let entryPoint: number | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('S')) {
        continue;
      }

      try {
        const record = this.parseSRecord(trimmed);
        
        switch (record.type) {
          case 0: // Header record
            break;
          case 1: // Data record (16-bit address)
          case 2: // Data record (24-bit address)  
          case 3: // Data record (32-bit address)
            for (let i = 0; i < record.data.length; i++) {
              const address = record.address + i;
              memory.set(address, record.data[i]);
              minAddress = Math.min(minAddress, address);
              maxAddress = Math.max(maxAddress, address);
            }
            break;
          case 7: // Start address (32-bit)
          case 8: // Start address (24-bit)
          case 9: // Start address (16-bit)
            entryPoint = record.address;
            break;
          default:
            console.warn(`Unsupported S-record type: S${record.type}`);
        }
      } catch (error) {
        throw new Error(`Invalid S-record: ${trimmed} - ${error}`);
      }
    }

    if (memory.size === 0) {
      throw new Error('No data found in S-record file');
    }

    // Create contiguous data array
    const size = maxAddress - minAddress + 1;
    const romData = new Uint8Array(size);
    romData.fill(0xFF); // Fill with 0xFF (unprogrammed EPROM value)
    
    for (const [address, value] of memory) {
      romData[address - minAddress] = value;
    }

    return {
      data: romData,
      loadAddress: minAddress,
      entryPoint
    };
  }

  // Parse Motorola S-record
  private static parseSRecord(line: string): {
    type: number;
    address: number;
    data: number[];
  } {
    if (line.length < 4) {
      throw new Error('Record too short');
    }

    const type = parseInt(line.charAt(1), 10);
    const length = parseInt(line.substr(2, 2), 16);
    
    if (line.length < 4 + (length * 2)) {
      throw new Error('Record length mismatch');
    }

    let addressBytes: number;
    switch (type) {
      case 0: addressBytes = 2; break; // Header
      case 1: case 9: addressBytes = 2; break; // 16-bit address
      case 2: case 8: addressBytes = 3; break; // 24-bit address
      case 3: case 7: addressBytes = 4; break; // 32-bit address
      default:
        throw new Error(`Unsupported S-record type: S${type}`);
    }

    // Parse address
    let address = 0;
    for (let i = 0; i < addressBytes; i++) {
      const bytePos = 4 + (i * 2);
      address = (address << 8) | parseInt(line.substr(bytePos, 2), 16);
    }

    // Parse data
    const data: number[] = [];
    const dataLength = length - addressBytes - 1; // Subtract address bytes and checksum
    for (let i = 0; i < dataLength; i++) {
      const bytePos = 4 + (addressBytes * 2) + (i * 2);
      data.push(parseInt(line.substr(bytePos, 2), 16));
    }

    // Verify checksum
    const checksumPos = 4 + ((length - 1) * 2);
    const checksum = parseInt(line.substr(checksumPos, 2), 16);
    
    let sum = length;
    for (let i = 0; i < addressBytes; i++) {
      sum += (address >> (8 * (addressBytes - 1 - i))) & 0xFF;
    }
    for (const byte of data) {
      sum += byte;
    }
    sum = (255 - (sum & 0xFF)) & 0xFF;
    
    if (sum !== checksum) {
      throw new Error(`Checksum mismatch: expected 0x${sum.toString(16).padStart(2, '0')}, got 0x${checksum.toString(16).padStart(2, '0')}`);
    }

    return { type, address, data };
  }

  // Validate ROM file format
  static validateROMFile(filePath: string, format: 'binary' | 'ihex' | 'srec'): Promise<boolean> {
    return fs.promises.readFile(filePath)
      .then(data => {
        switch (format) {
          case 'binary':
            return true; // Any file can be treated as binary
          case 'ihex':
            return this.validateIntelHex(data.toString('ascii'));
          case 'srec':
            return this.validateSRecord(data.toString('ascii'));
          default:
            return false;
        }
      })
      .catch(() => false);
  }

  private static validateIntelHex(content: string): boolean {
    const lines = content.split(/\r?\n/);
    let hasEndRecord = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (!trimmed.startsWith(':')) {
        return false;
      }
      
      try {
        const record = this.parseIntelHexRecord(trimmed);
        if (record.type === 0x01) {
          hasEndRecord = true;
        }
      } catch {
        return false;
      }
    }
    
    return hasEndRecord;
  }

  private static validateSRecord(content: string): boolean {
    const lines = content.split(/\r?\n/);
    let hasEndRecord = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (!trimmed.startsWith('S')) {
        return false;
      }
      
      try {
        const record = this.parseSRecord(trimmed);
        if (record.type >= 7 && record.type <= 9) {
          hasEndRecord = true;
        }
      } catch {
        return false;
      }
    }
    
    return hasEndRecord;
  }
}