/**
 * Main emulator application
 * Coordinates CPU, memory, peripherals, and provides execution control
 */

import { SystemBus } from './core/bus';
import { SystemConfig, SystemConfigLoader } from './config/system';
import { MemoryInspectorImpl } from './debug/memory-inspector';
import { DebugInspectorImpl } from './debug/inspector';
import { ACIA68B50 } from './peripherals/acia';
import { VIA65C22Implementation } from './peripherals/via';
import { CC65SymbolParser } from './cc65/symbol-parser';
import { CC65MemoryConfigurator } from './cc65/memory-layout';
import { EmulatorProfiler } from './performance/profiler';
import { EmulatorOptimizer, ExecutionSpeedController } from './performance/optimizer';

/**
 * Execution state of the emulator
 */
export enum EmulatorState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused',
  STEPPING = 'stepping',
  ERROR = 'error'
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  totalCycles: number;
  instructionsExecuted: number;
  executionTimeMs: number;
  averageIPS: number; // Instructions per second
  clockSpeed: number; // Actual clock speed in Hz
}

/**
 * Main emulator class that coordinates all components
 */
export class Emulator {
  private systemBus: SystemBus;
  private config: SystemConfig;
  private state: EmulatorState = EmulatorState.STOPPED;
  private memoryInspector: MemoryInspectorImpl;
  private debugInspector: DebugInspectorImpl;
  private symbolParser?: CC65SymbolParser;
  private memoryLayout?: any; // Will be a layout object from CC65MemoryConfigurator
  
  // Performance optimization
  private profiler: EmulatorProfiler;
  private optimizer: EmulatorOptimizer;
  private speedController: ExecutionSpeedController;
  
  // Execution control
  private executionTimer?: NodeJS.Timeout;
  private targetClockSpeed: number = 1000000; // 1MHz default
  private cyclesPerTick: number = 1000; // Execute 1000 cycles per timer tick
  
  // Statistics
  private stats: ExecutionStats = {
    totalCycles: 0,
    instructionsExecuted: 0,
    executionTimeMs: 0,
    averageIPS: 0,
    clockSpeed: 0
  };
  
  private startTime: number = 0;
  private lastStatsUpdate: number = 0;

  constructor(config?: SystemConfig) {
    this.config = config || SystemConfigLoader.getDefaultConfig();
    
    // Initialize performance components
    this.profiler = new EmulatorProfiler();
    this.optimizer = new EmulatorOptimizer();
    this.speedController = this.optimizer.getSpeedController();
    
    this.systemBus = new SystemBus();
    this.memoryInspector = new MemoryInspectorImpl(this.systemBus.getMemory());
    this.debugInspector = new DebugInspectorImpl(
      this.systemBus.getCPU(),
      this.systemBus.getMemory(),
      this.systemBus.getInterruptController()
    );
    
    this.targetClockSpeed = this.config.cpu.clockSpeed;
    this.speedController.setTargetSpeed(this.targetClockSpeed);
    this.calculateCyclesPerTick();
  }

  /**
   * Initialize the emulator from configuration
   */
  async initialize(): Promise<void> {
    try {
      this.state = EmulatorState.STOPPED;
      
      // Configure CPU
      this.systemBus.getCPU().setCPUType(this.config.cpu.type);
      
      // Configure memory
      const memory = this.systemBus.getMemory();
      memory.configureRAM(this.config.memory.ramStart, this.config.memory.ramSize);
      
      // Add default reset vectors if no ROM is loaded
      if (this.config.memory.romImages.length === 0) {
        // Create a minimal ROM with reset vector pointing to RAM start
        const resetVector = new Uint8Array(6);
        resetVector[4] = this.config.memory.ramStart & 0xFF;        // Reset vector low byte
        resetVector[5] = (this.config.memory.ramStart >> 8) & 0xFF; // Reset vector high byte
        memory.loadROM(resetVector, 0xFFFA); // NMI, Reset, IRQ vectors
      }
      
      // Load ROM images
      if (this.config.memory.romImages.length > 0) {
        await memory.loadMultipleROMs(this.config.memory.romImages);
      }
      
      // Configure peripherals
      await this.configurePeripherals();
      
      // Load CC65 symbols if specified
      if (this.config.debugging.symbolFile) {
        try {
          this.symbolParser = new CC65SymbolParser();
          // Note: Symbol file loading would need to be implemented
          console.log(`CC65 symbol file specified: ${this.config.debugging.symbolFile}`);
          
          // Use standard homebrew layout for now
          this.memoryLayout = CC65MemoryConfigurator.getHomebrewLayout();
        } catch (error) {
          console.warn('Failed to load CC65 symbols:', error);
        }
      }
      
      // Reset system to initial state
      this.reset();
      
      console.log('Emulator initialized successfully');
      this.logSystemInfo();
      
    } catch (error) {
      this.state = EmulatorState.ERROR;
      throw new Error(`Failed to initialize emulator: ${error}`);
    }
  }

  /**
   * Configure peripherals based on system configuration
   */
  private async configurePeripherals(): Promise<void> {
    const peripheralHub = this.systemBus.getPeripheralHub();
    
    // Clear existing peripherals
    const existingPeripherals = peripheralHub.getPeripherals();
    for (const peripheral of existingPeripherals) {
      peripheralHub.unregisterPeripheral(peripheral.name);
    }
    
    // Configure ACIA if specified
    if (this.config.peripherals.acia) {
      const acia = new ACIA68B50();
      acia.setBaudRate(this.config.peripherals.acia.baudRate);
      
      if (this.config.peripherals.acia.serialPort) {
        // TODO: Connect to actual serial port when available
        console.log(`ACIA configured for serial port: ${this.config.peripherals.acia.serialPort}`);
      }
      
      peripheralHub.registerPeripheral(
        acia,
        this.config.peripherals.acia.baseAddress,
        this.config.peripherals.acia.baseAddress + 1,
        'ACIA'
      );
      
      console.log(`ACIA registered at $${this.config.peripherals.acia.baseAddress.toString(16).toUpperCase().padStart(4, '0')}-$${(this.config.peripherals.acia.baseAddress + 1).toString(16).toUpperCase().padStart(4, '0')}`);
    }
    
    // Configure VIA if specified
    if (this.config.peripherals.via) {
      const via = new VIA65C22Implementation();
      
      peripheralHub.registerPeripheral(
        via,
        this.config.peripherals.via.baseAddress,
        this.config.peripherals.via.baseAddress + 15,
        'VIA'
      );
      
      console.log(`VIA registered at $${this.config.peripherals.via.baseAddress.toString(16).toUpperCase().padStart(4, '0')}-$${(this.config.peripherals.via.baseAddress + 15).toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }

  /**
   * Reset the entire system
   */
  reset(): void {
    this.stop();
    this.systemBus.reset();
    this.resetStats();
    
    if (this.config.debugging.breakOnReset) {
      this.state = EmulatorState.PAUSED;
    } else {
      this.state = EmulatorState.STOPPED;
    }
    
    console.log('System reset');
  }

  /**
   * Start continuous execution
   */
  start(): void {
    if (this.state === EmulatorState.RUNNING) {
      return;
    }
    
    this.state = EmulatorState.RUNNING;
    this.startTime = Date.now();
    this.lastStatsUpdate = this.startTime;
    
    this.scheduleExecution();
    console.log('Execution started');
  }

  /**
   * Stop execution
   */
  stop(): void {
    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
      this.executionTimer = undefined;
    }
    
    if (this.state === EmulatorState.RUNNING) {
      this.updateStats();
    }
    
    this.state = EmulatorState.STOPPED;
    console.log('Execution stopped');
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (this.state === EmulatorState.RUNNING) {
      this.stop();
      this.state = EmulatorState.PAUSED;
      console.log('Execution paused');
    }
  }

  /**
   * Resume execution from paused state
   */
  resume(): void {
    if (this.state === EmulatorState.PAUSED) {
      this.start();
    }
  }

  /**
   * Execute a single instruction
   */
  step(): number {
    if (this.state === EmulatorState.ERROR) {
      throw new Error('Cannot step: emulator is in error state');
    }
    
    this.state = EmulatorState.STEPPING;
    
    try {
      const cycles = this.systemBus.step();
      
      // Check if execution was halted due to breakpoint (0 cycles returned)
      if (cycles === 0) {
        const pc = this.systemBus.getCPU().getRegisters().PC;
        console.log(`Breakpoint hit at ${pc.toString(16).toUpperCase().padStart(4, '0')}`);
        this.state = EmulatorState.PAUSED;
        return 0;
      }
      
      this.stats.totalCycles += cycles;
      this.stats.instructionsExecuted++;
      
      this.state = EmulatorState.PAUSED;
      return cycles;
    } catch (error) {
      this.state = EmulatorState.ERROR;
      throw error;
    }
  }

  /**
   * Schedule the next execution cycle
   */
  private scheduleExecution(): void {
    if (this.state !== EmulatorState.RUNNING) {
      return;
    }
    
    // Calculate timing for accurate clock speed simulation
    const targetInterval = (this.cyclesPerTick / this.targetClockSpeed) * 1000;
    
    this.executionTimer = setTimeout(() => {
      this.executeChunk();
    }, Math.max(1, targetInterval));
  }

  /**
   * Execute a chunk of instructions
   */
  private executeChunk(): void {
    if (this.state !== EmulatorState.RUNNING) {
      return;
    }
    
    try {
      const chunkStartTime = performance.now();
      let cyclesExecuted = 0;
      
      // Execute cycles in chunks for better performance
      while (cyclesExecuted < this.cyclesPerTick && this.state === EmulatorState.RUNNING) {
        const stepStartTime = this.profiler.startTiming();
        const cycles = this.systemBus.step();
        this.profiler.endTiming(stepStartTime, 'cpu_step');
        
        // Check if execution was halted due to breakpoint (0 cycles returned)
        if (cycles === 0) {
          const pc = this.systemBus.getCPU().getRegisters().PC;
          console.log(`Breakpoint hit at ${pc.toString(16).toUpperCase().padStart(4, '0')}`);
          this.pause();
          return;
        }
        
        cyclesExecuted += cycles;
        this.stats.totalCycles += cycles;
        this.stats.instructionsExecuted++;
      }
      
      // Update speed controller
      const chunkTime = performance.now() - chunkStartTime;
      this.speedController.updateActualSpeed(cyclesExecuted, chunkTime);
      
      // Calculate delay for speed control
      const delay = this.speedController.calculateDelay(cyclesExecuted, chunkTime);
      
      // Update statistics periodically
      const now = Date.now();
      if (now - this.lastStatsUpdate > 1000) {
        this.updateStats();
        this.lastStatsUpdate = now;
        
        // Apply optimizations based on profiling data
        if (this.profiler.getMetrics().instructionCount > 10000) {
          const analysis = this.profiler.getAnalysis();
          this.optimizer.applyOptimizations(analysis);
        }
      }
      
      // Schedule next execution with speed control delay
      setTimeout(() => this.scheduleExecution(), delay);
      
    } catch (error) {
      this.state = EmulatorState.ERROR;
      console.error('Execution error:', error);
    }
  }

  /**
   * Calculate cycles per tick based on target clock speed
   */
  private calculateCyclesPerTick(): void {
    this.cyclesPerTick = this.speedController.getCyclesPerChunk();
  }

  /**
   * Update execution statistics
   */
  private updateStats(): void {
    const now = Date.now();
    this.stats.executionTimeMs = now - this.startTime;
    
    if (this.stats.executionTimeMs > 0) {
      this.stats.averageIPS = (this.stats.instructionsExecuted * 1000) / this.stats.executionTimeMs;
      this.stats.clockSpeed = (this.stats.totalCycles * 1000) / this.stats.executionTimeMs;
    }
  }

  /**
   * Reset execution statistics
   */
  private resetStats(): void {
    this.stats = {
      totalCycles: 0,
      instructionsExecuted: 0,
      executionTimeMs: 0,
      averageIPS: 0,
      clockSpeed: 0
    };
  }

  /**
   * Log system information
   */
  private logSystemInfo(): void {
    console.log('=== System Configuration ===');
    console.log(`CPU: ${this.config.cpu.type} @ ${this.config.cpu.clockSpeed} Hz`);
    console.log(`RAM: ${this.config.memory.ramSize} bytes at $${this.config.memory.ramStart.toString(16).toUpperCase().padStart(4, '0')}`);
    
    if (this.config.memory.romImages.length > 0) {
      console.log('ROM Images:');
      this.config.memory.romImages.forEach((rom, index) => {
        console.log(`  ${index + 1}. ${rom.file} at $${rom.loadAddress.toString(16).toUpperCase().padStart(4, '0')} (${rom.format})`);
      });
    }
    
    const peripherals = this.systemBus.getPeripheralHub().getPeripherals();
    if (peripherals.length > 0) {
      console.log('Peripherals:');
      peripherals.forEach(p => {
        console.log(`  ${p.name}: $${p.startAddress.toString(16).toUpperCase().padStart(4, '0')}-$${p.endAddress.toString(16).toUpperCase().padStart(4, '0')}`);
      });
    }
    
    console.log('============================');
  }

  // Getters for accessing system components
  getState(): EmulatorState {
    return this.state;
  }

  getStats(): ExecutionStats {
    if (this.state === EmulatorState.RUNNING) {
      this.updateStats();
    }
    return { ...this.stats };
  }

  getSystemBus(): SystemBus {
    return this.systemBus;
  }

  getConfig(): SystemConfig {
    return this.config;
  }

  getMemoryInspector(): MemoryInspectorImpl {
    return this.memoryInspector;
  }

  getDebugInspector(): DebugInspectorImpl {
    return this.debugInspector;
  }

  getSymbolParser(): CC65SymbolParser | undefined {
    return this.symbolParser;
  }

  getMemoryLayout(): any | undefined {
    return this.memoryLayout;
  }

  /**
   * Set target clock speed
   */
  setClockSpeed(speed: number): void {
    this.targetClockSpeed = speed;
    this.speedController.setTargetSpeed(speed);
    this.calculateCyclesPerTick();
  }

  /**
   * Enable/disable performance profiling
   */
  enableProfiling(enabled: boolean): void {
    if (enabled) {
      this.profiler.enable();
    } else {
      this.profiler.disable();
    }
  }

  /**
   * Get performance profiler
   */
  getProfiler(): EmulatorProfiler {
    return this.profiler;
  }

  /**
   * Get performance optimizer
   */
  getOptimizer(): EmulatorOptimizer {
    return this.optimizer;
  }

  /**
   * Set adaptive speed control
   */
  setAdaptiveSpeed(enabled: boolean): void {
    this.speedController.setAdaptiveMode(enabled);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    return {
      emulator: this.getStats(),
      profiler: this.profiler.getMetrics(),
      optimizer: this.optimizer.getStats(),
      analysis: this.profiler.getAnalysis()
    };
  }

  /**
   * Load a new configuration and reinitialize
   */
  async loadConfig(config: SystemConfig): Promise<void> {
    this.stop();
    this.config = config;
    await this.initialize();
  }

  /**
   * Load configuration from file and reinitialize
   */
  async loadConfigFromFile(configPath: string): Promise<void> {
    const config = SystemConfigLoader.loadFromFile(configPath);
    await this.loadConfig(config);
  }
}