#!/usr/bin/env ts-node

import { SystemConfigLoader, RuntimeConfigManager } from '../src/config/system';
import { RuntimeConfigManager as ConfigManager } from '../src/config/runtime';

async function demonstrateConfigurationSystem() {
  console.log('=== 6502 Emulator Configuration System Demo ===\n');

  // 1. Create default configuration templates
  console.log('1. Creating configuration templates...');
  SystemConfigLoader.createTemplates('./config-templates');
  console.log('   ✓ Templates created in ./config-templates/\n');

  // 2. Load default configuration
  console.log('2. Loading default configuration...');
  const defaultConfig = SystemConfigLoader.getDefaultConfig();
  console.log('   Default RAM size:', defaultConfig.memory.ramSize);
  console.log('   Default CPU type:', defaultConfig.cpu.type);
  console.log('   Default clock speed:', defaultConfig.cpu.clockSpeed, 'Hz\n');

  // 3. Create runtime configuration manager
  console.log('3. Creating runtime configuration manager...');
  const configManager = new ConfigManager(defaultConfig);

  // Set up event listeners
  configManager.on('configUpdated', (newConfig, oldConfig) => {
    console.log('   ✓ Configuration updated');
    console.log('     Old clock speed:', oldConfig.cpu.clockSpeed);
    console.log('     New clock speed:', newConfig.cpu.clockSpeed);
  });

  configManager.on('configError', (error) => {
    console.log('   ✗ Configuration error:', error.message);
  });

  // 4. Update configuration
  console.log('\n4. Updating CPU clock speed...');
  const updatedConfig = { ...defaultConfig };
  updatedConfig.cpu.clockSpeed = 2000000; // 2MHz
  configManager.updateConfig(updatedConfig);

  // 5. Apply partial update
  console.log('\n5. Applying partial configuration update...');
  configManager.applyPartialUpdate({
    memory: { ramSize: 64 * 1024 } // 64KB RAM
  });
  
  const currentConfig = configManager.getConfig();
  console.log('   ✓ RAM size updated to:', currentConfig.memory.ramSize, 'bytes');

  // 6. Validate configuration
  console.log('\n6. Testing configuration validation...');
  const invalidConfig = { ...currentConfig };
  (invalidConfig.cpu as any).type = 'invalid-cpu';
  
  const validationResult = configManager.validateConfig(invalidConfig);
  console.log('   Validation result:', validationResult.valid ? 'VALID' : 'INVALID');
  if (!validationResult.valid) {
    console.log('   Errors:', validationResult.errors);
  }

  // 7. Export configuration
  console.log('\n7. Exporting configuration...');
  configManager.exportConfig('./exported-config.json', 'json');
  configManager.exportConfig('./exported-config.yaml', 'yaml');
  console.log('   ✓ Configuration exported to JSON and YAML formats');

  // 8. Get configuration differences
  console.log('\n8. Checking configuration differences...');
  const modifiedConfig = { ...currentConfig };
  modifiedConfig.cpu.clockSpeed = 4000000; // 4MHz
  modifiedConfig.debugging.enableTracing = true;
  
  const diff = configManager.getConfigDiff(modifiedConfig);
  console.log('   CPU changes:', Object.keys(diff.cpu.changes));
  console.log('   Debugging changes:', Object.keys(diff.debugging.changes));

  // Cleanup
  configManager.dispose();
  console.log('\n✓ Configuration system demonstration completed!');
}

// Run the demonstration
if (require.main === module) {
  demonstrateConfigurationSystem().catch(console.error);
}

export { demonstrateConfigurationSystem };