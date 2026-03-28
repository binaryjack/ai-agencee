/**
 * @file index.ts
 * @description Main test runner orchestrator
 * 
 * High-level API for test execution:
 * 1. Detect framework automatically
 * 2. Run tests (affected files only when possible)
 * 3. Parse results into unified format
 * 4. Return structured TestRunResult
 * 
 * Usage:
 * ```ts
 * const result = await executeTests({
 *   projectRoot: '/path/to/project',
 *   modifiedFiles: ['src/utils.ts', 'src/api.ts'],
 *   timeout: 60000,
 * });
 * 
 * if (result.success) {
 *   console.log(`All ${result.passedTests} tests passed!`);
 * } else {
 *   console.error(`${result.failedTests} tests failed`);
 * }
 * ```
 */

import { detectFramework } from './detect-framework.js'
import { runTests } from './run-tests.js'
import type { TestRunnerConfig, TestRunResult } from './test-runner.types.js'

/**
 * Execute tests for a project
 * 
 * @param config - Test runner configuration
 * @returns Test execution results
 */
export async function executeTests(config: TestRunnerConfig): Promise<TestRunResult> {
  const { projectRoot } = config;

  try {
    // Step 1: Detect test framework
    const detection = await detectFramework(projectRoot);

    if (detection.framework === 'unknown') {
      return {
        framework: 'unknown',
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        results: [],
        duration: 0,
        error: 'No test framework detected. Supported: Jest, Vitest, Pytest, Go test, RSpec, Mocha.',
      };
    }

    // Step 2: Run tests
    const result = await runTests(detection, config);

    return result;

  } catch (error: unknown) {
    return {
      framework: 'unknown',
      success: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      results: [],
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Re-export types and utilities
export { detectFramework } from './detect-framework.js'
export { parseTestOutput } from './parse-results.js'
export { runTests } from './run-tests.js'
export * from './test-runner.types.js'

