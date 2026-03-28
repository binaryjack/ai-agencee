/**
 * @file run-tests.ts
 * @description Execute tests and capture results
 * 
 * Strategy: Run tests only for affected files when possible, fall back to all tests
 * Performance optimization: Parallel execution for independent test suites
 */

import { spawn } from 'child_process'
import * as path from 'path'
import { parseTestOutput } from './parse-results.js'
import type { FrameworkDetection, TestRunnerConfig, TestRunResult } from './test-runner.types.js'

/**
 * Run tests using detected framework
 */
export async function runTests(
  detection: FrameworkDetection,
  config: TestRunnerConfig,
): Promise<TestRunResult> {
  const start = Date.now();

  // Build test command with arguments
  const args = buildTestArgs(detection, config);

  // Execute test command
  const { stdout, stderr, exitCode } = await executeCommand(
    detection.command,
    args,
    config.projectRoot,
    config.timeout ?? 60000,
    config.env,
  );

  const duration = Date.now() - start;

  // Parse test output based on framework
  const parsed = parseTestOutput(detection.framework, stdout, stderr);

  // Build final result
  const result: TestRunResult = {
    framework: detection.framework,
    success: exitCode === 0 && parsed.failedTests === 0,
    totalTests: parsed.totalTests,
    passedTests: parsed.passedTests,
    failedTests: parsed.failedTests,
    skippedTests: parsed.skippedTests,
    results: parsed.results,
    coverageDelta: parsed.coverageDelta,
    duration,
    stdout,
    stderr,
  };

  // Add error if tests failed
  if (!result.success) {
    result.error = exitCode !== 0
      ? `Test command exited with code ${exitCode}`
      : `${parsed.failedTests} test(s) failed`;
  }

  return result;
}

/**
 * Build test command arguments based on framework and config
 */
function buildTestArgs(detection: FrameworkDetection, config: TestRunnerConfig): string[] {
  const { framework } = detection;
  const args = [...detection.args];

  // Add affected files if specified and framework supports it
  if (config.modifiedFiles && config.modifiedFiles.length > 0 && !config.runAll) {
    switch (framework) {
      case 'jest':
        // Jest: Run tests related to changed files
        args.push('--findRelatedTests', ...config.modifiedFiles);
        break;

      case 'vitest':
        // Vitest: Filter by file patterns
        args.push(...config.modifiedFiles.map(f => `--dir=${path.dirname(f)}`));
        break;

      case 'pytest':
        // Pytest: Specify test files directly
        const testFiles = config.modifiedFiles
          .filter(f => f.includes('test_') || f.includes('_test.py'))
          .map(f => path.join(config.projectRoot, f));
        if (testFiles.length > 0) {
          args.push(...testFiles);
        }
        break;

      case 'go-test':
        // Go test: Test specific packages
        const packages = [...new Set(
          config.modifiedFiles
            .filter(f => f.endsWith('.go'))
            .map(f => './' + path.dirname(f))
        )];
        if (packages.length > 0) {
          args.length = 0; // Replace default './...'
          args.push('test', ...packages);
        }
        break;

      // Mocha, RSpec: Run all tests (no easy way to filter by affected files)
    }
  }

  // Add coverage flag if requested
  if (config.collectCoverage) {
    switch (framework) {
      case 'jest':
        args.push('--coverage');
        break;
      case 'vitest':
        args.push('--coverage');
        break;
      case 'pytest':
        args.push('--cov');
        break;
      case 'go-test':
        args.push('-cover');
        break;
    }
  }

  // Add CI-friendly flags
  switch (framework) {
    case 'jest':
    case 'vitest':
      args.push('--run'); // Force run mode (not watch)
      args.push('--reporter=verbose'); // Detailed output for parsing
      break;
    case 'pytest':
      args.push('-v'); // Verbose output
      break;
  }

  return args;
}

/**
 * Execute command and capture output
 */
function executeCommand(
  command: string,
  args: string[],
  cwd: string,
  timeout: number,
  env?: Record<string, string>,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      proc.kill();
      stderr += '\nTest execution timed out';
    }, timeout);

    proc.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr: stderr + '\n' + error.message,
        exitCode: 1,
      });
    });
  });
}
