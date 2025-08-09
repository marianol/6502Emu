import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { SystemConfig, SystemConfigLoader, ConfigurationError } from './system';

/**
 * Runtime configuration manager with hot-reloading capability
 */
export class RuntimeConfigManager extends EventEmitter {
  private currentConfig: SystemConfig;
  private configPath?: string;
  private watcher?: fs.FSWatcher;
  private reloadTimeout?: NodeJS.Timeout;

  constructor(initialConfig?: SystemConfig) {
    super();
    this.currentConfig = initialConfig || SystemConfigLoader.getDefaultConfig();
  }

  /**
   * Load configuration from file and enable hot-reloading
   * @param configPath Path to configuration file
   */
  loadFromFile(configPath: string): void {
    try {
      const newConfig = SystemConfigLoader.loadFromFile(configPath);
      const oldConfig = this.currentConfig;
      this.currentConfig = newConfig;
      this.configPath = configPath;

      // Enable file watching for hot-reload
      this.enableHotReload();

      this.emit('configLoaded', newConfig, oldConfig);
    } catch (error) {
      const configError = error instanceof Error ? error : new ConfigurationError(String(error));
      this.emit('configError', configError);
      throw error;
    }
  }

  /**
   * Update configuration programmatically
   * @param newConfig New configuration
   */
  updateConfig(newConfig: SystemConfig): void {
    try {
      // Validate the new configuration
      SystemConfigLoader['validateConfiguration'](newConfig);
      
      const oldConfig = this.currentConfig;
      this.currentConfig = newConfig;

      this.emit('configUpdated', newConfig, oldConfig);
    } catch (error) {
      const configError = error instanceof Error ? error : new ConfigurationError(String(error));
      this.emit('configError', configError);
      throw error;
    }
  }

  /**
   * Get current configuration
   * @returns Current system configuration
   */
  getConfig(): SystemConfig {
    return JSON.parse(JSON.stringify(this.currentConfig));
  }

  /**
   * Export current configuration to file
   * @param outputPath Output file path
   * @param format Output format ('json' or 'yaml')
   */
  exportConfig(outputPath: string, format: 'json' | 'yaml' = 'json'): void {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (format === 'json') {
        fs.writeFileSync(outputPath, JSON.stringify(this.currentConfig, null, 2));
      } else {
        const yaml = require('js-yaml');
        fs.writeFileSync(outputPath, yaml.dump(this.currentConfig, {
          indent: 2,
          lineWidth: 80,
          noRefs: true
        }));
      }

      this.emit('configExported', outputPath, format);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('configError', new ConfigurationError(`Failed to export configuration: ${errorMessage}`));
      throw error;
    }
  }

  /**
   * Validate configuration without applying it
   * @param config Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: SystemConfig): { valid: boolean; errors: string[] } {
    try {
      SystemConfigLoader['validateConfiguration'](config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof ConfigurationError) {
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
  getConfigDiff(newConfig: SystemConfig): ConfigDiff {
    return this.compareConfigs(this.currentConfig, newConfig);
  }

  /**
   * Apply partial configuration update
   * @param partialConfig Partial configuration to merge
   */
  applyPartialUpdate(partialConfig: Partial<SystemConfig>): void {
    const mergedConfig = this.mergeConfigs(this.currentConfig, partialConfig);
    this.updateConfig(mergedConfig);
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const defaultConfig = SystemConfigLoader.getDefaultConfig();
    this.updateConfig(defaultConfig);
  }

  /**
   * Dispose of resources and stop watching
   */
  dispose(): void {
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
  private enableHotReload(): void {
    if (!this.configPath) return;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('configError', new ConfigurationError(`Failed to enable hot-reload: ${errorMessage}`));
    }
  }

  /**
   * Reload configuration from file
   */
  private reloadConfig(): void {
    if (!this.configPath) return;

    try {
      const newConfig = SystemConfigLoader.loadFromFile(this.configPath);
      const oldConfig = this.currentConfig;
      this.currentConfig = newConfig;

      this.emit('configReloaded', newConfig, oldConfig);
    } catch (error) {
      const configError = error instanceof Error ? error : new ConfigurationError(String(error));
      this.emit('configError', configError);
    }
  }

  /**
   * Compare two configurations and return differences
   * @param oldConfig Old configuration
   * @param newConfig New configuration
   * @returns Configuration differences
   */
  private compareConfigs(oldConfig: SystemConfig, newConfig: SystemConfig): ConfigDiff {
    const diff: ConfigDiff = {
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
  private compareObjects(oldObj: any, newObj: any): ObjectDiff {
    const changes: { [key: string]: { old: any; new: any } } = {};
    const added: string[] = [];
    const removed: string[] = [];

    // Find changes and additions
    for (const key in newObj) {
      if (!(key in oldObj)) {
        added.push(key);
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
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
  private mergeConfigs(baseConfig: SystemConfig, partialConfig: Partial<SystemConfig>): SystemConfig {
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

// Configuration difference interfaces
export interface ConfigDiff {
  memory: ObjectDiff;
  peripherals: ObjectDiff;
  cpu: ObjectDiff;
  debugging: ObjectDiff;
}

export interface ObjectDiff {
  changes: { [key: string]: { old: any; new: any } };
  added: string[];
  removed: string[];
}

// Configuration manager events
export interface RuntimeConfigManagerEvents {
  configLoaded: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
  configUpdated: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
  configReloaded: (newConfig: SystemConfig, oldConfig: SystemConfig) => void;
  configExported: (path: string, format: string) => void;
  configError: (error: Error) => void;
  hotReloadEnabled: (path: string) => void;
}

export declare interface RuntimeConfigManager {
  on<U extends keyof RuntimeConfigManagerEvents>(
    event: U, listener: RuntimeConfigManagerEvents[U]
  ): this;
  
  emit<U extends keyof RuntimeConfigManagerEvents>(
    event: U, ...args: Parameters<RuntimeConfigManagerEvents[U]>
  ): boolean;
}