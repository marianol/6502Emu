import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// System configuration interfaces
export interface SystemConfig {
  memory: MemoryConfig;
  peripherals: PeripheralConfig;
  cpu: CPUConfig;
  debugging: DebuggingConfig;
}

export interface MemoryConfig {
  ramSize: number;
  ramStart: number;
  romImages: ROMImage[];
}

export interface ROMImage {
  file: string;
  loadAddress: number;
  format: 'binary' | 'ihex' | 'srec';
}

export interface PeripheralConfig {
  acia?: ACIAConfig;
  via?: VIAConfig;
  timers?: TimerConfig[];
  gpio?: GPIOConfig;
}

export interface ACIAConfig {
  baseAddress: number;
  baudRate: number;
  serialPort?: string;
}

export interface VIAConfig {
  baseAddress: number;
  portAConnections?: PortConnection[];
  portBConnections?: PortConnection[];
  enableTimers: boolean;
}

export interface PortConnection {
  pin: number;
  device: string;
  type: 'input' | 'output' | 'bidirectional';
}

export interface TimerConfig {
  id: string;
  baseAddress: number;
  frequency: number;
}

export interface GPIOConfig {
  baseAddress: number;
  pins: number;
}

export interface CPUConfig {
  type: '6502' | '65C02';
  clockSpeed: number; // Hz
}

export interface DebuggingConfig {
  enableTracing: boolean;
  breakOnReset: boolean;
  symbolFile?: string;
}

// Configuration validation errors
export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// System configuration loader
export class SystemConfigLoader {
  private static readonly DEFAULT_CONFIG: SystemConfig = {
    memory: {
      ramSize: 32768, // 32KB
      ramStart: 0x0000,
      romImages: []
    },
    peripherals: {
      acia: {
        baseAddress: 0x8000,
        baudRate: 9600
      },
      via: {
        baseAddress: 0x8010,
        enableTimers: true
      }
    },
    cpu: {
      type: '65C02',
      clockSpeed: 1000000 // 1MHz
    },
    debugging: {
      enableTracing: false,
      breakOnReset: false
    }
  };

  /**
   * Load configuration from file
   * @param configPath Path to configuration file (JSON or YAML)
   * @returns Validated system configuration
   */
  static loadFromFile(configPath: string): SystemConfig {
    try {
      if (!fs.existsSync(configPath)) {
        throw new ConfigurationError(`Configuration file not found: ${configPath}`);
      }

      const fileContent = fs.readFileSync(configPath, 'utf8');
      const ext = path.extname(configPath).toLowerCase();
      
      let config: any;
      
      if (ext === '.json') {
        config = JSON.parse(fileContent);
      } else if (ext === '.yaml' || ext === '.yml') {
        config = yaml.load(fileContent);
      } else {
        throw new ConfigurationError(`Unsupported configuration file format: ${ext}`);
      }

      return this.validateAndMergeConfig(config);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to load configuration: ${errorMessage}`);
    }
  }

  /**
   * Get default configuration
   * @returns Default system configuration
   */
  static getDefaultConfig(): SystemConfig {
    return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
  }

  /**
   * Create configuration template files
   * @param outputDir Directory to create template files
   */
  static createTemplates(outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create JSON template
    const jsonTemplate = {
      ...this.DEFAULT_CONFIG,
      memory: {
        ...this.DEFAULT_CONFIG.memory,
        romImages: [
          {
            file: "firmware.bin",
            loadAddress: 0xF000,
            format: "binary"
          }
        ]
      }
    };

    fs.writeFileSync(
      path.join(outputDir, 'system-config.json'),
      JSON.stringify(jsonTemplate, null, 2)
    );

    // Create YAML template
    const yamlContent = yaml.dump(jsonTemplate, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });

    fs.writeFileSync(
      path.join(outputDir, 'system-config.yaml'),
      yamlContent
    );

    // Create Apple II-like template
    const apple2Template: SystemConfig = {
      memory: {
        ramSize: 48 * 1024, // 48KB
        ramStart: 0x0000,
        romImages: [
          {
            file: "apple2.rom",
            loadAddress: 0xD000,
            format: "binary"
          }
        ]
      },
      peripherals: {
        acia: {
          baseAddress: 0xC0A0,
          baudRate: 9600,
          serialPort: "/dev/ttyUSB0"
        },
        via: {
          baseAddress: 0xC0B0,
          enableTimers: true,
          portAConnections: [
            { pin: 0, device: "keyboard", type: "input" },
            { pin: 1, device: "speaker", type: "output" }
          ]
        }
      },
      cpu: {
        type: '6502',
        clockSpeed: 1023000 // ~1MHz
      },
      debugging: {
        enableTracing: true,
        breakOnReset: true,
        symbolFile: "program.sym"
      }
    };

    fs.writeFileSync(
      path.join(outputDir, 'apple2-config.yaml'),
      yaml.dump(apple2Template, { indent: 2, lineWidth: 80, noRefs: true })
    );
  }

  /**
   * Validate and merge configuration with defaults
   * @param userConfig User-provided configuration
   * @returns Validated and merged configuration
   */
  private static validateAndMergeConfig(userConfig: any): SystemConfig {
    const config = this.mergeWithDefaults(userConfig);
    this.validateConfiguration(config);
    return config;
  }

  /**
   * Merge user configuration with defaults
   * @param userConfig User configuration
   * @returns Merged configuration
   */
  private static mergeWithDefaults(userConfig: any): SystemConfig {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      memory: { ...defaultConfig.memory, ...userConfig.memory },
      peripherals: {
        acia: userConfig.peripherals?.acia ? 
          { ...defaultConfig.peripherals.acia, ...userConfig.peripherals.acia } : 
          defaultConfig.peripherals.acia,
        via: userConfig.peripherals?.via ? 
          { ...defaultConfig.peripherals.via, ...userConfig.peripherals.via } : 
          defaultConfig.peripherals.via,
        timers: userConfig.peripherals?.timers || defaultConfig.peripherals.timers,
        gpio: userConfig.peripherals?.gpio || defaultConfig.peripherals.gpio
      },
      cpu: { ...defaultConfig.cpu, ...userConfig.cpu },
      debugging: { ...defaultConfig.debugging, ...userConfig.debugging }
    };
  }

  /**
   * Validate configuration values
   * @param config Configuration to validate
   */
  private static validateConfiguration(config: SystemConfig): void {
    // Validate memory configuration
    if (config.memory.ramSize <= 0 || config.memory.ramSize > 65536) {
      throw new ConfigurationError('RAM size must be between 1 and 65536 bytes', 'memory.ramSize');
    }

    if (config.memory.ramStart < 0 || config.memory.ramStart > 65535) {
      throw new ConfigurationError('RAM start address must be between 0x0000 and 0xFFFF', 'memory.ramStart');
    }

    // Validate ROM images
    for (let i = 0; i < config.memory.romImages.length; i++) {
      const rom = config.memory.romImages[i];
      if (!rom.file) {
        throw new ConfigurationError(`ROM image ${i} missing file path`, `memory.romImages[${i}].file`);
      }
      if (rom.loadAddress < 0 || rom.loadAddress > 65535) {
        throw new ConfigurationError(`ROM image ${i} load address must be between 0x0000 and 0xFFFF`, `memory.romImages[${i}].loadAddress`);
      }
      if (!['binary', 'ihex', 'srec'].includes(rom.format)) {
        throw new ConfigurationError(`ROM image ${i} format must be 'binary', 'ihex', or 'srec'`, `memory.romImages[${i}].format`);
      }
    }

    // Validate CPU configuration
    if (!['6502', '65C02'].includes(config.cpu.type)) {
      throw new ConfigurationError('CPU type must be "6502" or "65C02"', 'cpu.type');
    }

    if (config.cpu.clockSpeed <= 0) {
      throw new ConfigurationError('CPU clock speed must be positive', 'cpu.clockSpeed');
    }

    // Validate peripheral addresses
    if (config.peripherals.acia) {
      this.validateAddress(config.peripherals.acia.baseAddress, 'peripherals.acia.baseAddress');
      if (config.peripherals.acia.baudRate <= 0) {
        throw new ConfigurationError('ACIA baud rate must be positive', 'peripherals.acia.baudRate');
      }
    }

    if (config.peripherals.via) {
      this.validateAddress(config.peripherals.via.baseAddress, 'peripherals.via.baseAddress');
    }

    // Check for address conflicts
    this.checkAddressConflicts(config);
  }

  /**
   * Validate memory address
   * @param address Address to validate
   * @param fieldName Field name for error reporting
   */
  private static validateAddress(address: number, fieldName: string): void {
    if (address < 0 || address > 65535) {
      throw new ConfigurationError(`Address must be between 0x0000 and 0xFFFF`, fieldName);
    }
  }

  /**
   * Check for address conflicts between components
   * @param config Configuration to check
   */
  private static checkAddressConflicts(config: SystemConfig): void {
    const addressRanges: Array<{ start: number; end: number; name: string }> = [];

    // Add RAM range
    addressRanges.push({
      start: config.memory.ramStart,
      end: config.memory.ramStart + config.memory.ramSize - 1,
      name: 'RAM'
    });

    // Add ROM ranges
    config.memory.romImages.forEach((rom, index) => {
      addressRanges.push({
        start: rom.loadAddress,
        end: rom.loadAddress + 8191, // Assume 8KB ROM size for conflict checking
        name: `ROM[${index}]`
      });
    });

    // Add peripheral ranges
    if (config.peripherals.acia) {
      addressRanges.push({
        start: config.peripherals.acia.baseAddress,
        end: config.peripherals.acia.baseAddress + 1,
        name: 'ACIA'
      });
    }

    if (config.peripherals.via) {
      addressRanges.push({
        start: config.peripherals.via.baseAddress,
        end: config.peripherals.via.baseAddress + 15,
        name: 'VIA'
      });
    }

    // Check for overlaps
    for (let i = 0; i < addressRanges.length; i++) {
      for (let j = i + 1; j < addressRanges.length; j++) {
        const range1 = addressRanges[i];
        const range2 = addressRanges[j];

        if (this.rangesOverlap(range1, range2)) {
          throw new ConfigurationError(
            `Address conflict between ${range1.name} (0x${range1.start.toString(16)}-0x${range1.end.toString(16)}) and ${range2.name} (0x${range2.start.toString(16)}-0x${range2.end.toString(16)})`
          );
        }
      }
    }
  }

  /**
   * Check if two address ranges overlap
   * @param range1 First range
   * @param range2 Second range
   * @returns True if ranges overlap
   */
  private static rangesOverlap(
    range1: { start: number; end: number },
    range2: { start: number; end: number }
  ): boolean {
    return range1.start <= range2.end && range2.start <= range1.end;
  }
}