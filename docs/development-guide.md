# Development Guide v1.0

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Debugging Features](#debugging-features)
3. [Performance Analysis](#performance-analysis)
4. [Testing](#testing)
5. [Contributing](#contributing)
6. [Architecture](#architecture)

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd 6502-emulator
   npm install
   npm run build
   ```

2. **Development Scripts**
   ```bash
   # Build native addon
   npm run build
   
   # Run tests
   npm test
   
   # Run specific test suite
   npm test -- --testNamePattern="CPU"
   
   # Run with coverage
   npm run test:coverage
   
   # Lint code
   npm run lint
   
   # Format code
   npm run format
   ```

3. **IDE Setup**
   - Install TypeScript extension
   - Configure debugger for Node.js
   - Set up Jest test runner

### Typical Development Cycle

1. **Write/Modify Code**
   - Follow TypeScript best practices
   - Add comprehensive JSDoc comments
   - Include error handling

2. **Test Changes**
   ```bash
   # Run unit tests
   npm test
   
   # Run integration tests
   npm run test:integration
   
   # Run performance tests
   npm run test:performance
   ```

3. **Debug Issues**
   ```bash
   # Enable debug logging
   DEBUG=emulator:* npm test
   
   # Run specific test with debugging
   node --inspect-brk node_modules/.bin/jest --runInBand specific.test.ts
   ```

4. **Performance Check**
   ```bash
   # Run benchmark suite
   npm run benchmark
   
   # Profile specific functionality
   npm run profile
   ```

## Debugging Features

### Built-in Debugging Tools

#### 1. Breakpoints and Single Stepping

```typescript
import { Emulator } from './src/emulator';

const emulator = new Emulator();
await emulator.initialize();

// Set breakpoints
const cpu = emulator.getSystemBus().getCPU();
cpu.setBreakpoint(0x0200);
cpu.setBreakpoint(0x0300);

// Load program
const program = new Uint8Array([/* your program */]);
emulator.getSystemBus().getMemory().loadROM(program, 0x0200);

// Single step execution
while (true) {
  const cycles = emulator.step();
  if (cycles === 0) {
    // Breakpoint hit
    const pc = cpu.getRegisters().PC;
    console.log(`Breakpoint at 0x${pc.toString(16)}`);
    
    // Inspect state
    const registers = cpu.getRegisters();
    console.log('Registers:', registers);
    
    // Continue or stop
    break;
  }
}
```

#### 2. Memory Inspection

```typescript
const memoryInspector = emulator.getMemoryInspector();

// Dump memory region
const hexDump = memoryInspector.dumpMemory(0x0200, 64, 'hex');
console.log(hexDump);

// Search for patterns
const pattern = new Uint8Array([0xA9, 0x00]); // LDA #$00
const matches = memoryInspector.searchMemory(pattern);
console.log('Pattern found at:', matches.map(addr => `0x${addr.toString(16)}`));

// Compare memory regions
const isEqual = memoryInspector.compareMemory(0x0200, 0x0300, 16);
console.log('Memory regions equal:', isEqual);
```

#### 3. Execution Tracing

```typescript
const debugInspector = emulator.getDebugInspector();

// Enable tracing
debugInspector.enableTracing(true);

// Run program
emulator.start();
setTimeout(() => {
  emulator.stop();
  
  // Get trace
  const trace = debugInspector.getExecutionTrace();
  trace.slice(-10).forEach(entry => {
    console.log(`0x${entry.address.toString(16)}: ${entry.instruction} (${entry.cycles} cycles)`);
  });
}, 1000);
```

#### 4. Peripheral State Inspection

```typescript
// Inspect ACIA state
const peripheralHub = emulator.getSystemBus().getPeripheralHub();
const peripherals = peripheralHub.getPeripherals();

peripherals.forEach(p => {
  if (p.name === 'ACIA') {
    // Read ACIA registers
    const status = p.peripheral.read(0);
    const data = p.peripheral.read(1);
    console.log(`ACIA Status: 0x${status.toString(16)}, Data: 0x${data.toString(16)}`);
  }
});
```

### Advanced Debugging Techniques

#### 1. Custom Debug Hooks

```typescript
class DebugHooks {
  private emulator: Emulator;
  
  constructor(emulator: Emulator) {
    this.emulator = emulator;
  }
  
  // Hook into memory writes
  onMemoryWrite(address: number, value: number): void {
    if (address >= 0x0200 && address < 0x0300) {
      console.log(`Memory write: 0x${address.toString(16)} = 0x${value.toString(16)}`);
    }
  }
  
  // Hook into peripheral access
  onPeripheralAccess(address: number, isWrite: boolean, value?: number): void {
    const operation = isWrite ? 'WRITE' : 'READ';
    const valueStr = value !== undefined ? ` = 0x${value.toString(16)}` : '';
    console.log(`Peripheral ${operation}: 0x${address.toString(16)}${valueStr}`);
  }
  
  // Hook into instruction execution
  onInstructionExecute(pc: number, opcode: number): void {
    // Custom instruction logging
    console.log(`Execute: 0x${pc.toString(16)} opcode 0x${opcode.toString(16)}`);
  }
}
```

#### 2. Conditional Breakpoints

```typescript
class ConditionalBreakpoint {
  constructor(
    private address: number,
    private condition: (emulator: Emulator) => boolean
  ) {}
  
  check(emulator: Emulator): boolean {
    const pc = emulator.getSystemBus().getCPU().getRegisters().PC;
    return pc === this.address && this.condition(emulator);
  }
}

// Example: Break when A register equals specific value
const breakpoint = new ConditionalBreakpoint(0x0200, (emulator) => {
  const registers = emulator.getSystemBus().getCPU().getRegisters();
  return registers.A === 0x42;
});
```

#### 3. State Snapshots

```typescript
class StateSnapshot {
  static capture(emulator: Emulator): any {
    return {
      cpu: emulator.getSystemBus().getCPU().getRegisters(),
      memory: emulator.getMemoryInspector().readRange(0x0000, 0x10000),
      peripherals: this.capturePeripheralState(emulator),
      timestamp: Date.now()
    };
  }
  
  static restore(emulator: Emulator, snapshot: any): void {
    // Restore CPU state
    emulator.getSystemBus().getCPU().setRegisters(snapshot.cpu);
    
    // Restore memory
    emulator.getMemoryInspector().writeRange(0x0000, snapshot.memory);
    
    // Restore peripheral state
    this.restorePeripheralState(emulator, snapshot.peripherals);
  }
  
  private static capturePeripheralState(emulator: Emulator): any {
    // Implementation depends on peripheral types
    return {};
  }
  
  private static restorePeripheralState(emulator: Emulator, state: any): void {
    // Implementation depends on peripheral types
  }
}
```

## Performance Analysis

### Profiling Tools

#### 1. Built-in Profiler

```typescript
// Enable profiling
emulator.enableProfiling(true);

// Run your program
emulator.start();
await new Promise(resolve => setTimeout(resolve, 5000));
emulator.stop();

// Get detailed metrics
const profiler = emulator.getProfiler();
const metrics = profiler.getMetrics();
const analysis = profiler.getAnalysis();

console.log('Performance Metrics:');
console.log(`- Instructions per second: ${metrics.averageIPS.toLocaleString()}`);
console.log(`- Cycles per second: ${metrics.averageCPS.toLocaleString()}`);
console.log(`- Memory accesses: ${metrics.memoryAccesses.toLocaleString()}`);
console.log(`- Peripheral accesses: ${metrics.peripheralAccesses.toLocaleString()}`);

console.log('\nBottlenecks:');
analysis.bottlenecks.forEach(bottleneck => {
  console.log(`- ${bottleneck.type}: ${bottleneck.description} (${bottleneck.impact.toFixed(1)}% impact)`);
});

console.log('\nRecommendations:');
analysis.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});
```

#### 2. Memory Access Hotspots

```typescript
const hotspots = analysis.hotspots;
console.log('\nMemory Hotspots:');
hotspots.slice(0, 10).forEach((hotspot, index) => {
  console.log(`${index + 1}. 0x${hotspot.address.toString(16)}: ${hotspot.accessCount} accesses`);
});
```

#### 3. Benchmark Suite

```typescript
import { EmulatorBenchmark } from './src/performance/benchmark';

const benchmark = new EmulatorBenchmark(emulator);
const suite = await benchmark.runBenchmarkSuite();

console.log('Benchmark Results:');
suite.results.forEach(result => {
  console.log(`${result.name}: ${result.averageIPS.toLocaleString()} IPS (${result.efficiency.toFixed(1)}% efficiency)`);
});

// Export detailed report
const report = benchmark.exportResults(suite);
fs.writeFileSync('benchmark-report.md', report);
```

### Performance Optimization

#### 1. Enable Optimizations

```typescript
const optimizer = emulator.getOptimizer();

// Enable memory caching
const memoryManager = optimizer.getMemoryManager();
memoryManager.enableCache(true);

// Configure speed control
const speedController = optimizer.getSpeedController();
speedController.setTargetSpeed(2000000); // 2MHz
speedController.setAdaptiveMode(true);

// Optimize breakpoint checking
const breakpointManager = optimizer.getBreakpointManager();
breakpointManager.setOptimization(true);
```

#### 2. Custom Optimization Strategies

```typescript
class CustomOptimizer {
  static optimizeForSpeed(emulator: Emulator): void {
    // Disable tracing
    emulator.getDebugInspector().enableTracing(false);
    
    // Enable all optimizations
    const optimizer = emulator.getOptimizer();
    optimizer.getMemoryManager().enableCache(true);
    optimizer.getSpeedController().setAdaptiveMode(true);
    
    // Reduce peripheral polling frequency
    const peripheralOptimizer = optimizer.getPeripheralOptimizer();
    peripheralOptimizer.setAdaptivePolling(true);
  }
  
  static optimizeForDebugging(emulator: Emulator): void {
    // Enable detailed tracing
    emulator.getDebugInspector().enableTracing(true);
    
    // Disable optimizations that might interfere with debugging
    const optimizer = emulator.getOptimizer();
    optimizer.getMemoryManager().enableCache(false);
    
    // Use fixed timing for predictable behavior
    optimizer.getSpeedController().setAdaptiveMode(false);
  }
}
```

## Testing

### Test Structure

```
tests/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests for system functionality
├── performance/          # Performance and timing tests
├── regression/           # Regression test suite
└── fixtures/            # Test data and programs
```

### Writing Unit Tests

```typescript
// tests/unit/cpu.test.ts
import { CPU6502Emulator } from '../../src/core/cpu';

describe('CPU6502Emulator', () => {
  let cpu: CPU6502Emulator;
  
  beforeEach(() => {
    cpu = new CPU6502Emulator();
    cpu.setMemoryCallbacks(
      (addr) => 0x00, // Default read
      (addr, val) => {} // Default write
    );
  });
  
  test('should reset to initial state', () => {
    cpu.reset();
    const state = cpu.getRegisters();
    
    expect(state.A).toBe(0);
    expect(state.X).toBe(0);
    expect(state.Y).toBe(0);
    expect(state.SP).toBe(0xFF);
    expect(state.P & 0x04).toBe(0x04); // Interrupt disable flag
  });
  
  test('should execute LDA immediate', () => {
    // Set up memory with LDA #$42
    cpu.setMemoryCallbacks(
      (addr) => addr === 0x0000 ? 0xA9 : addr === 0x0001 ? 0x42 : 0x00,
      (addr, val) => {}
    );
    
    cpu.setRegisters({ PC: 0x0000 });
    const cycles = cpu.step();
    
    expect(cycles).toBe(2);
    expect(cpu.getRegisters().A).toBe(0x42);
    expect(cpu.getRegisters().PC).toBe(0x0002);
  });
});
```

### Writing Integration Tests

```typescript
// tests/integration/system.test.ts
import { Emulator } from '../../src/emulator';
import { SystemConfigLoader } from '../../src/config/system';

describe('System Integration', () => {
  let emulator: Emulator;
  
  beforeEach(async () => {
    const config = SystemConfigLoader.getDefaultConfig();
    emulator = new Emulator(config);
    await emulator.initialize();
  });
  
  afterEach(() => {
    emulator.stop();
  });
  
  test('should execute complete program', async () => {
    const program = new Uint8Array([
      0xA9, 0x01,        // LDA #$01
      0x8D, 0x00, 0x02,  // STA $0200
      0xAD, 0x00, 0x02,  // LDA $0200
      0x69, 0x01,        // ADC #$01
      0x8D, 0x01, 0x02,  // STA $0201
      0x00               // BRK
    ]);
    
    emulator.getSystemBus().getMemory().loadROM(program, 0x0200);
    emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });
    
    // Execute until BRK
    let cycles = 0;
    while (cycles < 100) {
      const stepCycles = emulator.step();
      if (stepCycles === 0) break; // BRK or breakpoint
      cycles += stepCycles;
    }
    
    // Verify results
    const memory = emulator.getSystemBus().getMemory();
    expect(memory.read(0x0200)).toBe(0x01);
    expect(memory.read(0x0201)).toBe(0x02);
  });
});
```

### Performance Testing

```typescript
// tests/performance/timing.test.ts
describe('Performance Tests', () => {
  test('should meet minimum performance requirements', async () => {
    const emulator = new Emulator();
    await emulator.initialize();
    
    // Simple loop program
    const program = new Uint8Array([
      0xA2, 0x00,  // LDX #$00
      0xE8,        // INX
      0xD0, 0xFD,  // BNE -3
      0x4C, 0x00, 0x02  // JMP $0200
    ]);
    
    emulator.getSystemBus().getMemory().loadROM(program, 0x0200);
    emulator.getSystemBus().getCPU().setRegisters({ PC: 0x0200 });
    
    const startTime = performance.now();
    emulator.start();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    emulator.stop();
    const endTime = performance.now();
    
    const stats = emulator.getStats();
    const actualTime = endTime - startTime;
    
    // Should execute at least 100K instructions per second
    const ips = (stats.instructionsExecuted / actualTime) * 1000;
    expect(ips).toBeGreaterThan(100000);
  });
});
```

### Regression Testing

```typescript
// Run complete regression suite
import { RegressionTestRunner } from '../tests/regression/regression-test-suite';

const runner = new RegressionTestRunner();
const suite = await runner.runRegressionSuite();

console.log(`Regression tests: ${suite.summary.passed}/${suite.summary.totalTests} passed`);

if (suite.summary.successRate < 95) {
  console.error('Regression test failure rate too high!');
  process.exit(1);
}
```

## Contributing

### Code Style

1. **TypeScript Guidelines**
   - Use strict TypeScript configuration
   - Prefer interfaces over types for object shapes
   - Use enums for constants
   - Add comprehensive JSDoc comments

2. **Naming Conventions**
   - Classes: PascalCase
   - Methods/Variables: camelCase
   - Constants: UPPER_SNAKE_CASE
   - Files: kebab-case

3. **Error Handling**
   - Use custom error classes
   - Provide meaningful error messages
   - Include context information

### Pull Request Process

1. **Before Submitting**
   ```bash
   # Run all tests
   npm test
   
   # Check code style
   npm run lint
   
   # Run regression tests
   npm run test:regression
   
   # Update documentation if needed
   npm run docs:generate
   ```

2. **PR Requirements**
   - Clear description of changes
   - Tests for new functionality
   - Documentation updates
   - No breaking changes without major version bump

3. **Review Process**
   - Code review by maintainers
   - All tests must pass
   - Performance impact assessment
   - Documentation review

## Architecture

### Component Overview

```
┌─────────────────┐
│    Emulator     │ ← Main coordinator
└─────────────────┘
         │
┌─────────────────┐
│   SystemBus     │ ← Component integration
└─────────────────┘
    │    │    │
    ▼    ▼    ▼
┌─────┐ ┌────┐ ┌──────────┐
│ CPU │ │Mem │ │Peripheral│
└─────┘ └────┘ └──────────┘
```

### Design Principles

1. **Modularity**: Each component has clear responsibilities
2. **Testability**: Components can be tested in isolation
3. **Performance**: Optimizations don't compromise accuracy
4. **Extensibility**: Easy to add new peripherals and features
5. **Compatibility**: Maintains compatibility with real hardware

### Adding New Features

1. **New Peripheral**
   ```typescript
   class MyPeripheral implements Peripheral {
     read(offset: number): number { /* implementation */ }
     write(offset: number, value: number): void { /* implementation */ }
     reset(): void { /* implementation */ }
     tick(cycles: number): void { /* implementation */ }
     getInterruptStatus(): boolean { /* implementation */ }
   }
   ```

2. **New Debug Feature**
   ```typescript
   class MyDebugTool {
     constructor(private emulator: Emulator) {}
     
     analyze(): AnalysisResult {
       // Custom analysis logic
     }
   }
   ```

3. **New Optimization**
   ```typescript
   class MyOptimizer {
     optimize(emulator: Emulator, analysis: PerformanceAnalysis): void {
       // Custom optimization logic
     }
   }
   ```

### Best Practices

1. **Performance Considerations**
   - Profile before optimizing
   - Measure impact of changes
   - Don't sacrifice accuracy for speed

2. **Testing Strategy**
   - Unit tests for individual components
   - Integration tests for system behavior
   - Performance tests for regression detection
   - Real-world program testing

3. **Documentation**
   - Keep API documentation current
   - Include usage examples
   - Document performance characteristics
   - Explain design decisions