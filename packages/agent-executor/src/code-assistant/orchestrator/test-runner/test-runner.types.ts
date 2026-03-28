/**
 * @file test-runner.types.ts
 * @description Type definitions for test runner integration
 * 
 * Part of Phase 1.1: Test Runner Integration
 * Enables Codernic to validate code quality before committing changes.
 */

/**
 * Supported test frameworks
 */
export type TestFramework =
  | 'jest'
  | 'vitest'
  | 'pytest'
  | 'go-test'
  | 'rspec'
  | 'mocha'
  | 'unknown';

/**
 * Test execution result for a single test file or suite
 */
export interface TestResult {
  /** Test file path relative to project root */
  file: string;
  /** Test passed successfully */
  passed: boolean;
  /** Test failed */
  failed: boolean;
  /** Test skipped */
  skipped: boolean;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Aggregated test run results
 */
export interface TestRunResult {
  /** Framework used for testing */
  framework: TestFramework;
  /** All tests passed */
  success: boolean;
  /** Total number of tests run */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of skipped tests */
  skippedTests: number;
  /** Individual test results */
  results: TestResult[];
  /** Coverage delta (percentage change) if available */
  coverageDelta?: number;
  /** Total execution time in milliseconds */
  duration: number;
  /** Raw stdout from test runner */
  stdout?: string;
  /** Raw stderr from test runner */
  stderr?: string;
  /** Error message if test execution failed */
  error?: string;
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  /** Project root directory */
  projectRoot: string;
  /** Files that were modified (run tests for these) */
  modifiedFiles?: string[];
  /** Run all tests instead of affected tests only */
  runAll?: boolean;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Environment variables to pass to test runner */
  env?: Record<string, string>;
  /** Collect coverage information */
  collectCoverage?: boolean;
}

/**
 * Framework detection result
 */
export interface FrameworkDetection {
  /** Detected framework */
  framework: TestFramework;
  /** Confidence level (0-1) */
  confidence: number;
  /** Command to run tests */
  command: string;
  /** Arguments for test command */
  args: string[];
  /** Configuration file path if found */
  configFile?: string;
}
