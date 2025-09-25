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
    clockSpeed: number;
}
export interface DebuggingConfig {
    enableTracing: boolean;
    breakOnReset: boolean;
    symbolFile?: string;
}
export declare class ConfigurationError extends Error {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class SystemConfigLoader {
    private static readonly DEFAULT_CONFIG;
    /**
     * Load configuration from file
     * @param configPath Path to configuration file (JSON or YAML)
     * @returns Validated system configuration
     */
    static loadFromFile(configPath: string): SystemConfig;
    /**
     * Get default configuration
     * @returns Default system configuration
     */
    static getDefaultConfig(): SystemConfig;
    /**
     * Create configuration template files
     * @param outputDir Directory to create template files
     */
    static createTemplates(outputDir: string): void;
    /**
     * Validate and merge configuration with defaults
     * @param userConfig User-provided configuration
     * @returns Validated and merged configuration
     */
    private static validateAndMergeConfig;
    /**
     * Merge user configuration with defaults
     * @param userConfig User configuration
     * @returns Merged configuration
     */
    private static mergeWithDefaults;
    /**
     * Validate configuration values
     * @param config Configuration to validate
     */
    private static validateConfiguration;
    /**
     * Validate memory address
     * @param address Address to validate
     * @param fieldName Field name for error reporting
     */
    private static validateAddress;
    /**
     * Check for address conflicts between components
     * @param config Configuration to check
     */
    private static checkAddressConflicts;
    /**
     * Check if two address ranges overlap
     * @param range1 First range
     * @param range2 Second range
     * @returns True if ranges overlap
     */
    private static rangesOverlap;
}
//# sourceMappingURL=system.d.ts.map