/**
 * Performance profiler for the 6502 emulator
 * Identifies bottlenecks and provides optimization insights
 */

export interface PerformanceMetrics {
  totalExecutionTime: number;
  cpuTime: number;
  memoryTime: number;
  peripheralTime: number;
  instructionCount: number;
  cycleCount: number;
  averageIPS: number; // Instructions per second
  averageCPS: number; // Cycles per second
  memoryAccesses: number;
  peripheralAccesses: number;
  breakpointChecks: number;
}

export interface ProfilerSample {
  timestamp: number;
  operation: 'cpu_step' | 'memory_read' | 'memory_write' | 'peripheral_access' | 'breakpoint_check';
  address?: number;
  duration: number;
}

export class EmulatorProfiler {
  private samples: ProfilerSample[] = [];
  private isEnabled: boolean = false;
  private maxSamples: number = 10000;
  private startTime: number = 0;
  
  // Performance counters
  private metrics: PerformanceMetrics = {
    totalExecutionTime: 0,
    cpuTime: 0,
    memoryTime: 0,
    peripheralTime: 0,
    instructionCount: 0,
    cycleCount: 0,
    averageIPS: 0,
    averageCPS: 0,
    memoryAccesses: 0,
    peripheralAccesses: 0,
    breakpointChecks: 0
  };

  /**
   * Enable profiling
   */
  enable(): void {
    this.isEnabled = true;
    this.startTime = performance.now();
    this.reset();
  }

  /**
   * Disable profiling
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Reset profiling data
   */
  reset(): void {
    this.samples = [];
    this.metrics = {
      totalExecutionTime: 0,
      cpuTime: 0,
      memoryTime: 0,
      peripheralTime: 0,
      instructionCount: 0,
      cycleCount: 0,
      averageIPS: 0,
      averageCPS: 0,
      memoryAccesses: 0,
      peripheralAccesses: 0,
      breakpointChecks: 0
    };
    this.startTime = performance.now();
  }

  /**
   * Record a performance sample
   */
  recordSample(operation: ProfilerSample['operation'], address?: number, duration?: number): void {
    if (!this.isEnabled) return;

    const sample: ProfilerSample = {
      timestamp: performance.now() - this.startTime,
      operation,
      address,
      duration: duration || 0
    };

    this.samples.push(sample);

    // Update metrics
    switch (operation) {
      case 'cpu_step':
        this.metrics.cpuTime += sample.duration;
        this.metrics.instructionCount++;
        break;
      case 'memory_read':
      case 'memory_write':
        this.metrics.memoryTime += sample.duration;
        this.metrics.memoryAccesses++;
        break;
      case 'peripheral_access':
        this.metrics.peripheralTime += sample.duration;
        this.metrics.peripheralAccesses++;
        break;
      case 'breakpoint_check':
        this.metrics.breakpointChecks++;
        break;
    }

    // Limit sample buffer size
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Start timing an operation
   */
  startTiming(): number {
    return performance.now();
  }

  /**
   * End timing and record sample
   */
  endTiming(startTime: number, operation: ProfilerSample['operation'], address?: number): void {
    if (!this.isEnabled) return;
    
    const duration = performance.now() - startTime;
    this.recordSample(operation, address, duration);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const currentTime = performance.now() - this.startTime;
    this.metrics.totalExecutionTime = currentTime;

    if (currentTime > 0) {
      this.metrics.averageIPS = (this.metrics.instructionCount * 1000) / currentTime;
      this.metrics.averageCPS = (this.metrics.cycleCount * 1000) / currentTime;
    }

    return { ...this.metrics };
  }

  /**
   * Get performance analysis
   */
  getAnalysis(): PerformanceAnalysis {
    const metrics = this.getMetrics();
    const analysis: PerformanceAnalysis = {
      bottlenecks: [],
      recommendations: [],
      hotspots: this.getHotspots(),
      efficiency: this.calculateEfficiency(metrics)
    };

    // Identify bottlenecks
    const totalTime = metrics.cpuTime + metrics.memoryTime + metrics.peripheralTime;
    if (totalTime > 0) {
      const cpuPercent = (metrics.cpuTime / totalTime) * 100;
      const memoryPercent = (metrics.memoryTime / totalTime) * 100;
      const peripheralPercent = (metrics.peripheralTime / totalTime) * 100;

      if (memoryPercent > 40) {
        analysis.bottlenecks.push({
          type: 'memory',
          severity: memoryPercent > 60 ? 'high' : 'medium',
          description: `Memory access takes ${memoryPercent.toFixed(1)}% of execution time`,
          impact: memoryPercent
        });
        analysis.recommendations.push('Consider implementing memory access caching');
        analysis.recommendations.push('Optimize memory region lookup algorithm');
      }

      if (peripheralPercent > 30) {
        analysis.bottlenecks.push({
          type: 'peripheral',
          severity: peripheralPercent > 50 ? 'high' : 'medium',
          description: `Peripheral access takes ${peripheralPercent.toFixed(1)}% of execution time`,
          impact: peripheralPercent
        });
        analysis.recommendations.push('Optimize peripheral polling frequency');
        analysis.recommendations.push('Implement peripheral access caching');
      }

      if (metrics.breakpointChecks > metrics.instructionCount * 0.5) {
        analysis.bottlenecks.push({
          type: 'breakpoint',
          severity: 'medium',
          description: 'Excessive breakpoint checking overhead',
          impact: (metrics.breakpointChecks / metrics.instructionCount) * 100
        });
        analysis.recommendations.push('Optimize breakpoint checking algorithm');
      }
    }

    return analysis;
  }

  /**
   * Get memory access hotspots
   */
  private getHotspots(): AddressHotspot[] {
    const addressCounts = new Map<number, number>();
    
    this.samples.forEach(sample => {
      if (sample.address !== undefined && 
          (sample.operation === 'memory_read' || sample.operation === 'memory_write')) {
        const count = addressCounts.get(sample.address) || 0;
        addressCounts.set(sample.address, count + 1);
      }
    });

    const hotspots: AddressHotspot[] = [];
    addressCounts.forEach((count, address) => {
      if (count > 10) { // Only include frequently accessed addresses
        hotspots.push({ address, accessCount: count });
      }
    });

    return hotspots.sort((a, b) => b.accessCount - a.accessCount).slice(0, 20);
  }

  /**
   * Calculate overall efficiency
   */
  private calculateEfficiency(metrics: PerformanceMetrics): number {
    if (metrics.totalExecutionTime === 0) return 0;
    
    // Efficiency based on how close we are to target performance
    const targetIPS = 1000000; // 1MHz target
    const efficiency = Math.min(100, (metrics.averageIPS / targetIPS) * 100);
    return efficiency;
  }

  /**
   * Export profiling data for analysis
   */
  exportData(): ProfilerExport {
    return {
      metrics: this.getMetrics(),
      samples: [...this.samples],
      analysis: this.getAnalysis(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set maximum number of samples to keep
   */
  setMaxSamples(max: number): void {
    this.maxSamples = max;
    if (this.samples.length > max) {
      this.samples = this.samples.slice(-max);
    }
  }
}

export interface PerformanceAnalysis {
  bottlenecks: Bottleneck[];
  recommendations: string[];
  hotspots: AddressHotspot[];
  efficiency: number;
}

export interface Bottleneck {
  type: 'memory' | 'peripheral' | 'cpu' | 'breakpoint';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // Percentage impact
}

export interface AddressHotspot {
  address: number;
  accessCount: number;
}

export interface ProfilerExport {
  metrics: PerformanceMetrics;
  samples: ProfilerSample[];
  analysis: PerformanceAnalysis;
  timestamp: string;
}