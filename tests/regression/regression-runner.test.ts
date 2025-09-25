/**
 * Jest test wrapper for regression test suite
 */

import { RegressionTestRunner } from './regression-test-suite';

describe('Regression Test Suite', () => {
  let runner: RegressionTestRunner;

  beforeEach(() => {
    runner = new RegressionTestRunner();
  });

  test('Run complete regression suite', async () => {
    const suite = await runner.runRegressionSuite();
    
    expect(suite.version).toBeDefined();
    expect(suite.timestamp).toBeDefined();
    expect(suite.results).toBeInstanceOf(Array);
    expect(suite.results.length).toBeGreaterThan(0);
    
    // Check that all critical tests passed
    const criticalTests = [
      'CPU Basic Instructions',
      'Memory Management',
      'ACIA Functionality',
      'VIA Functionality'
    ];
    
    criticalTests.forEach(testName => {
      const result = suite.results.find(r => r.testName === testName);
      expect(result).toBeDefined();
      if (result && !result.passed) {
        console.error(`Critical test failed: ${testName} - ${result.error}`);
      }
      expect(result?.passed).toBe(true);
    });
    
    // Overall success rate should be high
    expect(suite.summary.successRate).toBeGreaterThan(80);
    
    console.log(`Regression suite completed: ${suite.summary.passed}/${suite.summary.totalTests} tests passed (${suite.summary.successRate.toFixed(1)}%)`);
  }, 60000); // 60 second timeout for full suite

  test('Export regression results', async () => {
    const suite = await runner.runRegressionSuite();
    const exported = runner.exportResults(suite);
    
    expect(exported).toContain('Regression Test Results');
    expect(exported).toContain('Summary');
    expect(exported).toContain('Test Results');
    expect(exported).toContain(suite.version);
  }, 60000);
});