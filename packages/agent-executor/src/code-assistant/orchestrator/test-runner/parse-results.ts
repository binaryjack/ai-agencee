/**
 * @file parse-results.ts
 * @description Parse test output from different frameworks into unified format
 * 
 * Each framework has different output formats:
 * - Jest/Vitest: JSON reporters available
 * - Pytest: XML or text output
 * - Go test: Text output with PASS/FAIL markers
 * - RSpec: Text output with color codes
 */

import type { TestFramework, TestResult } from './test-runner.types.js';

export interface ParsedTestOutput {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  results: TestResult[];
  coverageDelta?: number;
}

/**
 * Parse test output based on framework
 */
export function parseTestOutput(
  framework: TestFramework,
  stdout: string,
  stderr: string,
): ParsedTestOutput {
  switch (framework) {
    case 'jest':
      return parseJestOutput(stdout, stderr);
    case 'vitest':
      return parseVitestOutput(stdout, stderr);
    case 'pytest':
      return parsePytestOutput(stdout, stderr);
    case 'go-test':
      return parseGoTestOutput(stdout, stderr);
    case 'rspec':
      return parseRSpecOutput(stdout, stderr);
    case 'mocha':
      return parseMochaOutput(stdout, stderr);
    default:
      return parseGenericOutput(stdout, stderr);
  }
}

/**
 * Parse Jest output
 * 
 * Jest output format:
 * PASS  src/utils.test.ts
 * FAIL  src/api.test.ts
 * Tests: 5 failed, 10 passed, 15 total
 */
function parseJestOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  // Extract test file results
  const passPattern = /PASS\s+(.+\.(?:test|spec)\.[jt]sx?)/g;
  const failPattern = /FAIL\s+(.+\.(?:test|spec)\.[jt]sx?)/g;

  let match;
  while ((match = passPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: true,
      failed: false,
      skipped: false,
      duration: 0,
    });
  }

  while ((match = failPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: false,
      failed: true,
      skipped: false,
      duration: 0,
      error: extractJestError(stdout, match[1]),
    });
  }

  // Extract summary statistics
  const summaryMatch = /Tests:\s+(?:(\d+) failed?,?\s*)?(?:(\d+) passed?,?\s*)?(?:(\d+) skipped?,?\s*)?(\d+) total/i.exec(stdout);
  if (summaryMatch) {
    failedTests = parseInt(summaryMatch[1] || '0', 10);
    passedTests = parseInt(summaryMatch[2] || '0', 10);
    skippedTests = parseInt(summaryMatch[3] || '0', 10);
    totalTests = parseInt(summaryMatch[4], 10);
  }

  // Extract coverage delta if available
  const coverageMatch = /All files[^\n]*\|\s*(\d+\.?\d*)/i.exec(stdout);
  const coverageDelta = coverageMatch ? parseFloat(coverageMatch[1]) : undefined;

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
    coverageDelta,
  };
}

/**
 * Parse Vitest output (similar to Jest)
 */
function parseVitestOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  // Vitest output is similar to Jest
  const testPattern = /✓|✗|○/g;
  const passPattern = /✓\s+(.+\.(?:test|spec)\.[jt]sx?)/g;
  const failPattern = /✗\s+(.+\.(?:test|spec)\.[jt]sx?)/g;

  let match;
  while ((match = passPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: true,
      failed: false,
      skipped: false,
      duration: 0,
    });
  }

  while ((match = failPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: false,
      failed: true,
      skipped: false,
      duration: 0,
    });
  }

  // Extract summary
  const summaryMatch = /Test Files\s+(\d+) passed.*\((\d+)\)/i.exec(stdout) ||
                       /Tests\s+(?:(\d+) failed?,?\s*)?(?:(\d+) passed?,?\s*)?(\d+) total/i.exec(stdout);
  
  if (summaryMatch) {
    if (summaryMatch[0].includes('Test Files')) {
      passedTests = parseInt(summaryMatch[1], 10);
      totalTests = parseInt(summaryMatch[2], 10);
      failedTests = totalTests - passedTests;
    } else {
      failedTests = parseInt(summaryMatch[1] || '0', 10);
      passedTests = parseInt(summaryMatch[2] || '0', 10);
      totalTests = parseInt(summaryMatch[3], 10);
    }
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
  };
}

/**
 * Parse Pytest output
 * 
 * Pytest output format:
 * test_utils.py::test_add PASSED
 * test_api.py::test_get FAILED
 * ====== 5 failed, 10 passed in 2.34s ======
 */
function parsePytestOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  // Extract test results
  const testPattern = /(.+\.py)::(test_\w+)\s+(PASSED|FAILED|SKIPPED)/g;
  let match;

  while ((match = testPattern.exec(stdout)) !== null) {
    const [, file, testName, status] = match;
    results.push({
      file: `${file}::${testName}`,
      passed: status === 'PASSED',
      failed: status === 'FAILED',
      skipped: status === 'SKIPPED',
      duration: 0,
    });
  }

  // Extract summary
  const summaryMatch = /(\d+) failed.*?(\d+) passed.*?(\d+) skipped/i.exec(stdout) ||
                       /(\d+) passed/i.exec(stdout);

  if (summaryMatch) {
    if (summaryMatch[0].includes('failed')) {
      failedTests = parseInt(summaryMatch[1], 10);
      passedTests = parseInt(summaryMatch[2] || '0', 10);
      skippedTests = parseInt(summaryMatch[3] || '0', 10);
    } else {
      passedTests = parseInt(summaryMatch[1], 10);
    }
    totalTests = passedTests + failedTests + skippedTests;
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
  };
}

/**
 * Parse Go test output
 * 
 * Go test output format:
 * ok      github.com/user/pkg/utils       0.123s
 * FAIL    github.com/user/pkg/api         0.456s
 */
function parseGoTestOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Extract package test results
  const okPattern = /^ok\s+(\S+)\s+([\d.]+)s/gm;
  const failPattern = /^FAIL\s+(\S+)\s+([\d.]+)s/gm;

  let match;
  while ((match = okPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: true,
      failed: false,
      skipped: false,
      duration: parseFloat(match[2]) * 1000,
    });
    passedTests++;
  }

  while ((match = failPattern.exec(stdout)) !== null) {
    results.push({
      file: match[1],
      passed: false,
      failed: true,
      skipped: false,
      duration: parseFloat(match[2]) * 1000,
    });
    failedTests++;
  }

  totalTests = passedTests + failedTests;

  // Extract coverage if present
  const coverageMatch = /coverage:\s+([\d.]+)%/i.exec(stdout);
  const coverageDelta = coverageMatch ? parseFloat(coverageMatch[1]) : undefined;

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests: 0,
    results,
    coverageDelta,
  };
}

/**
 * Parse RSpec output
 */
function parseRSpecOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  
  // RSpec summary format: "5 examples, 1 failure, 1 pending"
  const summaryMatch = /(\d+) examples?,\s*(?:(\d+) failures?)?,?\s*(?:(\d+) pending)?/i.exec(stdout);
  
  const totalTests = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
  const failedTests = summaryMatch ? parseInt(summaryMatch[2] || '0', 10) : 0;
  const skippedTests = summaryMatch ? parseInt(summaryMatch[3] || '0', 10) : 0;
  const passedTests = totalTests - failedTests - skippedTests;

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
  };
}

/**
 * Parse Mocha output
 */
function parseMochaOutput(stdout: string, stderr: string): ParsedTestOutput {
  const results: TestResult[] = [];
  
  // Mocha summary: "5 passing (123ms)"or "5 passing (123ms)\n1 failing"
  const passingMatch = /(\d+) passing/i.exec(stdout);
  const failingMatch = /(\d+) failing/i.exec(stdout);
  const pendingMatch = /(\d+) pending/i.exec(stdout);

  const passedTests = passingMatch ? parseInt(passingMatch[1], 10) : 0;
  const failedTests = failingMatch ? parseInt(failingMatch[1], 10) : 0;
  const skippedTests = pendingMatch ? parseInt(pendingMatch[1], 10) : 0;
  const totalTests = passedTests + failedTests + skippedTests;

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
  };
}

/**
 * Generic parser for unknown frameworks
 */
function parseGenericOutput(stdout: string, stderr: string): ParsedTestOutput {
  // Try to extract basic pass/fail info
  const output = stdout + stderr;
  const hasPass = /pass/i.test(output);
  const hasFail = /fail|error/i.test(output);

  return {
    totalTests: hasPass || hasFail ? 1 : 0,
    passedTests: hasPass ? 1 : 0,
    failedTests: hasFail ? 1 : 0,
    skippedTests: 0,
    results: [],
  };
}

/**
 * Extract error message for failed Jest test
 */
function extractJestError(stdout: string, testFile: string): string {
  const startIndex = stdout.indexOf(`FAIL  ${testFile}`);
  if (startIndex === -1) return 'Test failed';

  const nextTestIndex = stdout.indexOf('\n  ●', startIndex + 1);
  if (nextTestIndex === -1) return 'Test failed';

  const errorSection = stdout.substring(nextTestIndex, nextTestIndex + 500);
  const lines = errorSection.split('\n').slice(0, 5);
  return lines.join('\n').trim();
}
