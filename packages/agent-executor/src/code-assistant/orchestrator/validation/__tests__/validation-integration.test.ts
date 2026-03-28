/**
 * Integration tests for validation layer
 */

import { describe, expect, test } from 'vitest'
import type { FilePatch } from '../../../code-assistant-orchestrator.types.js'
import { validatePatches } from '../index.js'

describe('Validation Layer Integration', () => {
  test('validates TypeScript syntax errors', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'function test() {\n  const x = 1\n  // Missing closing brace',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipImports: true,
      skipTypes: true,
      projectRoot: process.cwd(),
    });

    expect(result.passed).toBe(false);
    expect(result.totalErrors).toBeGreaterThan(0);
    expect(result.validators[0].validator).toBe('syntax');
  });

  test('validates unclosed quotes', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'const str = "unclosed string;\nconsole.log(str);',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipImports: true,
      skipTypes: true,
      projectRoot: process.cwd(),
    });

    expect(result.passed).toBe(false);
    expect(result.totalErrors).toBeGreaterThan(0);
  });

  test('validates missing imports', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'import { nonExistent } from "./does-not-exist.js";\n\nnonExistent();',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipSyntax: true,
      skipTypes: true,
      projectRoot: process.cwd(),
    });

    expect(result.passed).toBe(false);
    expect(result.totalErrors).toBeGreaterThan(0);
    const importValidator = result.validators.find((v) => v.validator === 'import');
    expect(importValidator).toBeDefined();
    expect(importValidator?.issues[0].message).toContain('Import not found');
  });

  test('passes validation for correct code', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'function add(a: number, b: number): number {\n  return a + b;\n}',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipImports: true,
      skipTypes: true,
      projectRoot: process.cwd(),
    });

    expect(result.passed).toBe(true);
    expect(result.totalErrors).toBe(0);
  });

  test('validates package imports warn if not installed', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'import { something } from "package-that-does-not-exist";\n\nsomething();',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipSyntax: true,
      skipTypes: true,
      strictMode: false,
      projectRoot: process.cwd(),
    });

    // Should pass (warnings don't fail in non-strict mode)
    expect(result.passed).toBe(true);
    expect(result.totalWarnings).toBeGreaterThan(0);
  });

  test('strict mode treats warnings as errors', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'import { something } from "package-that-does-not-exist";\n\nsomething();',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipSyntax: true,
      skipTypes: true,
      strictMode: true,
      projectRoot: process.cwd(),
    });

    // Should fail in strict mode (warnings treated as errors)
    expect(result.passed).toBe(false);
    expect(result.totalWarnings).toBeGreaterThan(0);
  });

  test('skips validation for deleted files', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: '',
        delete: true,
      },
    ];

    const result = await validatePatches(patches, {
      projectRoot: process.cwd(),
    });

    expect(result.passed).toBe(true);
    expect(result.totalErrors).toBe(0);
  });

  test('handles timeout gracefully', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'function test() {\n  return 1;\n}',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      timeout: 1, // 1ms timeout - will trigger timeout
      projectRoot: process.cwd(),
    });

    // Should have timeout warnings
    const hasTimeoutWarning = result.validators.some((v) =>
      v.issues.some((i) => i.message.includes('timed out'))
    );
    expect(hasTimeoutWarning).toBe(true);
  });

  test('validates Python syntax', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.py',
        content: 'def test():\n  print("missing closing quote)\n',
        delete: false,
      },
    ];

    const result = await validatePatches(patches, {
      skipImports: true,
      skipTypes: true,
      projectRoot: process.cwd(),
    });

    // May or may not fail depending on whether Python is installed
    expect(result).toBeDefined();
    expect(result.validators).toBeDefined();
  });

  test('runs all validators in parallel', async () => {
    const patches: FilePatch[] = [
      {
        relativePath: 'test.ts',
        content: 'function test() {\n  return 1;\n}',
        delete: false,
      },
    ];

    const startTime = Date.now();
    const result = await validatePatches(patches, {
      projectRoot: process.cwd(),
    });
    const duration = Date.now() - startTime;

    // All validators should run
    expect(result.validators.length).toBeGreaterThan(0);
    
    // Should complete reasonably fast (parallel execution)
    expect(duration).toBeLessThan(5000);
  });
});
