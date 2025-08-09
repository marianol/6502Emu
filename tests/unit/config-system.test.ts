import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SystemConfigLoader, ConfigurationError, SystemConfig } from '../../src/config/system';
import { RuntimeConfigManager } from '../../src/config/runtime';

describe('Configuration System', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('SystemConfigLoader', () => {
    describe('loadFromFile', () => {
      it('should load valid JSON configuration', () => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          memory: {
            ramSize: 16384,
            ramStart: 0x0000,
            romImages: [
              {
                file: 'test.rom',
                loadAddress: 0xF000,
                format: 'binary'
              }
            ]
          },
          cpu: {
            type: '6502',
            clockSpeed: 1000000
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));
        const loadedConfig = SystemConfigLoader.loadFromFile(configPath);

        expect(loadedConfig.memory.ramSize).toBe(16384);
        expect(loadedConfig.cpu.type).toBe('6502');
        expect(loadedConfig.memory.romImages).toHaveLength(1);
      });

      it('should load valid YAML configuration', () => {
        const configPath = path.join(tempDir, 'config.yaml');
        const yamlContent = `
memory:
  ramSize: 32768
  ramStart: 0x0000
  romImages:
    - file: firmware.bin
      loadAddress: 0xE000
      format: binary
cpu:
  type: 65C02
  clockSpeed: 2000000
`;

        fs.writeFileSync(configPath, yamlContent);
        const loadedConfig = SystemConfigLoader.loadFromFile(configPath);

        expect(loadedConfig.memory.ramSize).toBe(32768);
        expect(loadedConfig.cpu.type).toBe('65C02');
        expect(loadedConfig.cpu.clockSpeed).toBe(2000000);
      });

      it('should throw error for non-existent file', () => {
        const configPath = path.join(tempDir, 'nonexistent.json');
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });

      it('should throw error for unsupported file format', () => {
        const configPath = path.join(tempDir, 'config.txt');
        fs.writeFileSync(configPath, 'invalid content');
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });

      it('should throw error for invalid JSON', () => {
        const configPath = path.join(tempDir, 'config.json');
        fs.writeFileSync(configPath, '{ invalid json }');
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });
    });

    describe('validation', () => {
      it('should reject invalid RAM size', () => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          memory: {
            ramSize: -1000,
            ramStart: 0x0000,
            romImages: []
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });

      it('should reject invalid CPU type', () => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          cpu: {
            type: 'invalid',
            clockSpeed: 1000000
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });

      it('should reject invalid ROM format', () => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          memory: {
            romImages: [
              {
                file: 'test.rom',
                loadAddress: 0xF000,
                format: 'invalid'
              }
            ]
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });

      it('should detect address conflicts', () => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          memory: {
            ramSize: 32768,
            ramStart: 0x0000,
            romImages: []
          },
          peripherals: {
            acia: {
              baseAddress: 0x1000 // Conflicts with RAM
            },
            via: {
              baseAddress: 0x1000 // Conflicts with ACIA
            }
          }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));
        
        expect(() => {
          SystemConfigLoader.loadFromFile(configPath);
        }).toThrow(ConfigurationError);
      });
    });

    describe('createTemplates', () => {
      it('should create template files', () => {
        SystemConfigLoader.createTemplates(tempDir);

        expect(fs.existsSync(path.join(tempDir, 'system-config.json'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'system-config.yaml'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'apple2-config.yaml'))).toBe(true);

        // Verify JSON template is valid
        const jsonContent = fs.readFileSync(path.join(tempDir, 'system-config.json'), 'utf8');
        const jsonConfig = JSON.parse(jsonContent);
        expect(jsonConfig.memory).toBeDefined();
        expect(jsonConfig.cpu).toBeDefined();
      });
    });

    describe('getDefaultConfig', () => {
      it('should return valid default configuration', () => {
        const defaultConfig = SystemConfigLoader.getDefaultConfig();

        expect(defaultConfig.memory.ramSize).toBeGreaterThan(0);
        expect(defaultConfig.cpu.type).toMatch(/^(6502|65C02)$/);
        expect(defaultConfig.cpu.clockSpeed).toBeGreaterThan(0);
      });
    });
  });

  describe('RuntimeConfigManager', () => {
    let configManager: RuntimeConfigManager;

    beforeEach(() => {
      configManager = new RuntimeConfigManager();
    });

    afterEach(() => {
      configManager.dispose();
    });

    describe('configuration loading', () => {
      it('should load configuration from file', (done) => {
        const configPath = path.join(tempDir, 'config.json');
        const config = {
          memory: { ramSize: 16384 },
          cpu: { type: '6502' }
        };

        fs.writeFileSync(configPath, JSON.stringify(config));

        configManager.on('configLoaded', (newConfig) => {
          expect(newConfig.memory.ramSize).toBe(16384);
          expect(newConfig.cpu.type).toBe('6502');
          done();
        });

        configManager.loadFromFile(configPath);
      });

      it('should emit error for invalid configuration', (done) => {
        const configPath = path.join(tempDir, 'invalid.json');
        fs.writeFileSync(configPath, '{ invalid }');

        configManager.on('configError', (error) => {
          expect(error).toBeInstanceOf(ConfigurationError);
          done();
        });

        try {
          configManager.loadFromFile(configPath);
        } catch (error) {
          // Expected to throw
        }
      });
    });

    describe('runtime configuration updates', () => {
      it('should update configuration programmatically', (done) => {
        const newConfig = SystemConfigLoader.getDefaultConfig();
        newConfig.cpu.clockSpeed = 2000000;

        configManager.on('configUpdated', (updatedConfig) => {
          expect(updatedConfig.cpu.clockSpeed).toBe(2000000);
          done();
        });

        configManager.updateConfig(newConfig);
      });

      it('should validate configuration before updating', () => {
        const invalidConfig = SystemConfigLoader.getDefaultConfig();
        (invalidConfig.cpu as any).type = 'invalid';

        expect(() => {
          configManager.updateConfig(invalidConfig);
        }).toThrow(ConfigurationError);
      });
    });

    describe('configuration export', () => {
      it('should export configuration to JSON', (done) => {
        const exportPath = path.join(tempDir, 'exported.json');

        configManager.on('configExported', (path, format) => {
          expect(path).toBe(exportPath);
          expect(format).toBe('json');
          expect(fs.existsSync(exportPath)).toBe(true);

          const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
          expect(exported.memory).toBeDefined();
          done();
        });

        configManager.exportConfig(exportPath, 'json');
      });

      it('should export configuration to YAML', (done) => {
        const exportPath = path.join(tempDir, 'exported.yaml');

        configManager.on('configExported', (path, format) => {
          expect(path).toBe(exportPath);
          expect(format).toBe('yaml');
          expect(fs.existsSync(exportPath)).toBe(true);
          done();
        });

        configManager.exportConfig(exportPath, 'yaml');
      });
    });

    describe('configuration validation', () => {
      it('should validate valid configuration', () => {
        const validConfig = SystemConfigLoader.getDefaultConfig();
        const result = configManager.validateConfig(validConfig);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect invalid configuration', () => {
        const invalidConfig = SystemConfigLoader.getDefaultConfig();
        (invalidConfig.memory as any).ramSize = -1;

        const result = configManager.validateConfig(invalidConfig);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('partial configuration updates', () => {
      it('should apply partial updates', () => {
        const partialConfig: Partial<SystemConfig> = {
          cpu: { type: '65C02', clockSpeed: 3000000 }
        };

        configManager.applyPartialUpdate(partialConfig);
        const currentConfig = configManager.getConfig();

        expect(currentConfig.cpu.clockSpeed).toBe(3000000);
        // Other values should remain unchanged
        expect(currentConfig.memory.ramSize).toBe(32768); // Default value
      });
    });

    describe('configuration differences', () => {
      it('should detect configuration differences', () => {
        const currentConfig = configManager.getConfig();
        const newConfig = { ...currentConfig };
        newConfig.cpu.clockSpeed = 2000000;
        newConfig.memory.ramSize = 16384;

        const diff = configManager.getConfigDiff(newConfig);

        expect(diff.cpu.changes.clockSpeed).toBeDefined();
        expect(diff.memory.changes.ramSize).toBeDefined();
      });
    });

    describe('hot-reload functionality', () => {
      it('should enable hot-reload when loading from file', (done) => {
        const configPath = path.join(tempDir, 'config.json');
        const config = { memory: { ramSize: 16384 } };

        fs.writeFileSync(configPath, JSON.stringify(config));

        configManager.on('hotReloadEnabled', (path) => {
          expect(path).toBe(configPath);
          done();
        });

        configManager.loadFromFile(configPath);
      });

      // Note: Testing actual file watching is complex in unit tests
      // Integration tests would be better for this functionality
    });

    describe('reset functionality', () => {
      it('should reset to default configuration', () => {
        // First modify the configuration
        const modifiedConfig = SystemConfigLoader.getDefaultConfig();
        modifiedConfig.cpu.clockSpeed = 5000000;
        configManager.updateConfig(modifiedConfig);

        // Then reset
        configManager.resetToDefaults();
        const currentConfig = configManager.getConfig();

        expect(currentConfig.cpu.clockSpeed).toBe(1000000); // Default value
      });
    });
  });
});