import { EventEmitter } from 'events';
import { SystemConfig } from './system';
/**
 * Runtime configuration manager with hot-reloading capability
 */
export declare class RuntimeConfigManager extends EventEmitter {
    private currentConfig;
    private configPath?;
    private watcher?;
    private reloadTimeout?;
    constructor(initialConfig?: SystemConfig);
    /**
     * Load configuration from file and enable hot-reloading
     * @param configPath Path to configuration file
     */
    loadFromFile(configPath: string): void;
    /**
     * Update configuration programmatically
     * @param newConfig New configuration
     */
    updateConfig(newConfig: SystemConfig): void;
    /**
     * Get current configuration
     * @returns Current system configuration
     */
    getConfig(): SystemConfig;
    /**
     * Export current configuration to file
     * @param outputPath Output file path
     * @param format Output format ('json' or 'yaml')
     */
    exportConfig(outputPath: string, format?: 'json' | 'yaml'): void;
    /**
     * Validate configuration without applying it
     * @param config Configuration to validate
     * @returns Validation result
     */
    validateConfig(config: SystemConfig): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get configuration differences between current and new config
     * @param newConfig New configuration to compare
     * @returns Configuration differences
     */
    getConfigDiff(newConfig: SystemConfig): ConfigDiff;
    /**
     * Apply partial configuration update
     * @param partialConfig Partial configuration to merge
     */
    applyPartialUpdate(partialConfig: Partial<SystemConfig>): void;
    /**
     * Reset configuration to defaults
     */
    resetToDefaults(): void;
    /**
     * Dispose of resources and stop watching
     */
    dispose(): void;
    /**
     * Enable hot-reloading of configuration file
     */
    private enableHotReload;
    /**
     * Reload configuration from file
     */
    private reloadConfig;
    /**
     * Compare two configurations and return differences
     * @param oldConfig Old configuration
     * @param newConfig New configuration
     * @returns Configuration differences
     */
    private compareConfigs;
    /**
     * Compare two objects and return differences
     * @param oldObj Old object
     * @param newObj New object
     * @returns Object differences
     */
    private compareObjects;
    /**
     * Merge two configurations
     * @param baseConfig Base configuration
     * @param partialConfig Partial configuration to merge
     * @returns Merged configuration
     */
    private mergeConfigs;
}
export interface ConfigDiff {
    memory: ObjectDiff;
    peripherals: ObjectDiff;
    cpu: ObjectDiff;
    debugging: ObjectDiff;
}
export interface ObjectDiff {
    changes: {
        [key: string]: {
            old: any;
            new: any;
        };
    };
    added: string[];
    removed: string[];
}
export interface RuntimeConfigManagerEvents {
    configLoaded: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
    configUpdated: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
    configReloaded: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
    configExported: (path: string, format: string) => void;
    configError: (error: Error) => void;
    hotReloadEnabled: (path: string) => void;
}
export declare interface RuntimeConfigManager {
    on<U extends keyof RuntimeConfigManagerEvents>(event: U, listener: RuntimeConfigManagerEvents[U]): this;
    emit<U extends keyof RuntimeConfigManagerEvents>(event: U, ...args: Parameters<RuntimeConfigManagerEvents[U]>): boolean;
}
//# sourceMappingURL=runtime.d.ts.map