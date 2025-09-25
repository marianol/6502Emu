"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfigLoader = exports.ConfigurationError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
// Configuration validation errors
class ConfigurationError extends Error {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
// System configuration loader
class SystemConfigLoader {
    /**
     * Load configuration from file
     * @param configPath Path to configuration file (JSON or YAML)
     * @returns Validated system configuration
     */
    static loadFromFile(configPath) {
        try {
            if (!fs.existsSync(configPath)) {
                throw new ConfigurationError(`Configuration file not found: ${configPath}`);
            }
            const fileContent = fs.readFileSync(configPath, 'utf8');
            const ext = path.extname(configPath).toLowerCase();
            let config;
            if (ext === '.json') {
                config = JSON.parse(fileContent);
            }
            else if (ext === '.yaml' || ext === '.yml') {
                config = yaml.load(fileContent);
            }
            else {
                throw new ConfigurationError(`Unsupported configuration file format: ${ext}`);
            }
            return this.validateAndMergeConfig(config);
        }
        catch (error) {
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
    static getDefaultConfig() {
        return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
    }
    /**
     * Create configuration template files
     * @param outputDir Directory to create template files
     */
    static createTemplates(outputDir) {
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
        fs.writeFileSync(path.join(outputDir, 'system-config.json'), JSON.stringify(jsonTemplate, null, 2));
        // Create YAML template
        const yamlContent = yaml.dump(jsonTemplate, {
            indent: 2,
            lineWidth: 80,
            noRefs: true
        });
        fs.writeFileSync(path.join(outputDir, 'system-config.yaml'), yamlContent);
        // Create Apple II-like template
        const apple2Template = {
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
        fs.writeFileSync(path.join(outputDir, 'apple2-config.yaml'), yaml.dump(apple2Template, { indent: 2, lineWidth: 80, noRefs: true }));
    }
    /**
     * Validate and merge configuration with defaults
     * @param userConfig User-provided configuration
     * @returns Validated and merged configuration
     */
    static validateAndMergeConfig(userConfig) {
        const config = this.mergeWithDefaults(userConfig);
        this.validateConfiguration(config);
        return config;
    }
    /**
     * Merge user configuration with defaults
     * @param userConfig User configuration
     * @returns Merged configuration
     */
    static mergeWithDefaults(userConfig) {
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
    static validateConfiguration(config) {
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
    static validateAddress(address, fieldName) {
        if (address < 0 || address > 65535) {
            throw new ConfigurationError(`Address must be between 0x0000 and 0xFFFF`, fieldName);
        }
    }
    /**
     * Check for address conflicts between components
     * @param config Configuration to check
     */
    static checkAddressConflicts(config) {
        const addressRanges = [];
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
                    throw new ConfigurationError(`Address conflict between ${range1.name} (0x${range1.start.toString(16)}-0x${range1.end.toString(16)}) and ${range2.name} (0x${range2.start.toString(16)}-0x${range2.end.toString(16)})`);
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
    static rangesOverlap(range1, range2) {
        return range1.start <= range2.end && range2.start <= range1.end;
    }
}
exports.SystemConfigLoader = SystemConfigLoader;
SystemConfigLoader.DEFAULT_CONFIG = {
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
//# sourceMappingURL=system.js.map