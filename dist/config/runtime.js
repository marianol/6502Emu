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
exports.RuntimeConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const system_1 = require("./system");
/**
 * Runtime configuration manager with hot-reloading capability
 */
class RuntimeConfigManager extends events_1.EventEmitter {
    constructor(initialConfig) {
        super();
        this.currentConfig = initialConfig || system_1.SystemConfigLoader.getDefaultConfig();
    }
    /**
     * Load configuration from file and enable hot-reloading
     * @param configPath Path to configuration file
     */
    loadFromFile(configPath) {
        try {
            const newConfig = system_1.SystemConfigLoader.loadFromFile(configPath);
            const oldConfig = this.currentConfig;
            this.currentConfig = newConfig;
            this.configPath = configPath;
            // Enable file watching for hot-reload
            this.enableHotReload();
            this.emit('configLoaded', newConfig, oldConfig);
        }
        catch (error) {
            const configError = error instanceof Error ? error : new system_1.ConfigurationError(String(error));
            this.emit('configError', configError);
            throw error;
        }
    }
    /**
     * Update configuration programmatically
     * @param newConfig New configuration
     */
    updateConfig(newConfig) {
        try {
            // Validate the new configuration
            system_1.SystemConfigLoader['validateConfiguration'](newConfig);
            const oldConfig = this.currentConfig;
            this.currentConfig = newConfig;
            this.emit('configUpdated', newConfig, oldConfig);
        }
        catch (error) {
            const configError = error instanceof Error ? error : new system_1.ConfigurationError(String(error));
            this.emit('configError', configError);
            throw error;
        }
    }
    /**
     * Get current configuration
     * @returns Current system configuration
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.currentConfig));
    }
    /**
     * Export current configuration to file
     * @param outputPath Output file path
     * @param format Output format ('json' or 'yaml')
     */
    exportConfig(outputPath, format = 'json') {
        try {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (format === 'json') {
                fs.writeFileSync(outputPath, JSON.stringify(this.currentConfig, null, 2));
            }
            else {
                const yaml = require('js-yaml');
                fs.writeFileSync(outputPath, yaml.dump(this.currentConfig, {
                    indent: 2,
                    lineWidth: 80,
                    noRefs: true
                }));
            }
            this.emit('configExported', outputPath, format);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('configError', new system_1.ConfigurationError(`Failed to export configuration: ${errorMessage}`));
            throw error;
        }
    }
    /**
     * Validate configuration without applying it
     * @param config Configuration to validate
     * @returns Validation result
     */
    validateConfig(config) {
        try {
            system_1.SystemConfigLoader['validateConfiguration'](config);
            return { valid: true, errors: [] };
        }
        catch (error) {
            if (error instanceof system_1.ConfigurationError) {
                return { valid: false, errors: [error.message] };
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { valid: false, errors: [`Validation failed: ${errorMessage}`] };
        }
    }
    /**
     * Get configuration differences between current and new config
     * @param newConfig New configuration to compare
     * @returns Configuration differences
     */
    getConfigDiff(newConfig) {
        return this.compareConfigs(this.currentConfig, newConfig);
    }
    /**
     * Apply partial configuration update
     * @param partialConfig Partial configuration to merge
     */
    applyPartialUpdate(partialConfig) {
        const mergedConfig = this.mergeConfigs(this.currentConfig, partialConfig);
        this.updateConfig(mergedConfig);
    }
    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        const defaultConfig = system_1.SystemConfigLoader.getDefaultConfig();
        this.updateConfig(defaultConfig);
    }
    /**
     * Dispose of resources and stop watching
     */
    dispose() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = undefined;
        }
        this.removeAllListeners();
    }
    /**
     * Enable hot-reloading of configuration file
     */
    enableHotReload() {
        if (!this.configPath)
            return;
        // Close existing watcher
        if (this.watcher) {
            this.watcher.close();
        }
        try {
            this.watcher = fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    // Debounce file changes
                    if (this.reloadTimeout) {
                        clearTimeout(this.reloadTimeout);
                    }
                    this.reloadTimeout = setTimeout(() => {
                        this.reloadConfig();
                    }, 100);
                }
            });
            this.emit('hotReloadEnabled', this.configPath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('configError', new system_1.ConfigurationError(`Failed to enable hot-reload: ${errorMessage}`));
        }
    }
    /**
     * Reload configuration from file
     */
    reloadConfig() {
        if (!this.configPath)
            return;
        try {
            const newConfig = system_1.SystemConfigLoader.loadFromFile(this.configPath);
            const oldConfig = this.currentConfig;
            this.currentConfig = newConfig;
            this.emit('configReloaded', newConfig, oldConfig);
        }
        catch (error) {
            const configError = error instanceof Error ? error : new system_1.ConfigurationError(String(error));
            this.emit('configError', configError);
        }
    }
    /**
     * Compare two configurations and return differences
     * @param oldConfig Old configuration
     * @param newConfig New configuration
     * @returns Configuration differences
     */
    compareConfigs(oldConfig, newConfig) {
        const diff = {
            memory: this.compareObjects(oldConfig.memory, newConfig.memory),
            peripherals: this.compareObjects(oldConfig.peripherals, newConfig.peripherals),
            cpu: this.compareObjects(oldConfig.cpu, newConfig.cpu),
            debugging: this.compareObjects(oldConfig.debugging, newConfig.debugging)
        };
        return diff;
    }
    /**
     * Compare two objects and return differences
     * @param oldObj Old object
     * @param newObj New object
     * @returns Object differences
     */
    compareObjects(oldObj, newObj) {
        const changes = {};
        const added = [];
        const removed = [];
        // Find changes and additions
        for (const key in newObj) {
            if (!(key in oldObj)) {
                added.push(key);
            }
            else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                changes[key] = { old: oldObj[key], new: newObj[key] };
            }
        }
        // Find removals
        for (const key in oldObj) {
            if (!(key in newObj)) {
                removed.push(key);
            }
        }
        return { changes, added, removed };
    }
    /**
     * Merge two configurations
     * @param baseConfig Base configuration
     * @param partialConfig Partial configuration to merge
     * @returns Merged configuration
     */
    mergeConfigs(baseConfig, partialConfig) {
        return {
            memory: { ...baseConfig.memory, ...partialConfig.memory },
            peripherals: {
                acia: partialConfig.peripherals?.acia ?
                    { ...baseConfig.peripherals.acia, ...partialConfig.peripherals.acia } :
                    baseConfig.peripherals.acia,
                via: partialConfig.peripherals?.via ?
                    { ...baseConfig.peripherals.via, ...partialConfig.peripherals.via } :
                    baseConfig.peripherals.via,
                timers: partialConfig.peripherals?.timers || baseConfig.peripherals.timers,
                gpio: partialConfig.peripherals?.gpio || baseConfig.peripherals.gpio
            },
            cpu: { ...baseConfig.cpu, ...partialConfig.cpu },
            debugging: { ...baseConfig.debugging, ...partialConfig.debugging }
        };
    }
}
exports.RuntimeConfigManager = RuntimeConfigManager;
//# sourceMappingURL=runtime.js.map