/**
 * @file test-runner-integration.test.ts
 * @description Integration tests for test runner module
 */

import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeTests } from '../index.js'

describe('Test Runner Integration', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-runner-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should detect Jest from package.json', async () => {
    // Create package.json with Jest
    const packageJson = {
      name: 'test-project',
      scripts: {
        test: 'jest',
      },
      devDependencies: {
        jest: '^29.0.0',
      },
    };

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    const result = await executeTests({
      projectRoot: tmpDir,
      timeout: 5000,
    });

    expect(result.framework).toBe('jest');
  });

  it('should detect Vitest from config file', async () => {
    // Create vitest.config.ts
    await fs.writeFile(
      path.join(tmpDir, 'vitest.config.ts'),
      'export default {}',
    );

    const result = await executeTests({
      projectRoot: tmpDir,
      timeout: 5000,
    });

    expect(result.framework).toBe('vitest');
  });

  it('should detect Go test from go.mod', async () => {
    // Create go.mod
    await fs.writeFile(
      path.join(tmpDir, 'go.mod'),
      'module example.com/test\n\ngo 1.21',
    );

    const result = await executeTests({
      projectRoot: tmpDir,
      timeout: 5000,
    });

    expect(result.framework).toBe('go-test');
  });

  it('should return unknown for project without tests', async () => {
    const result = await executeTests({
      projectRoot: tmpDir,
      timeout: 5000,
    });

    expect(result.framework).toBe('unknown');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No test framework detected');
  });

  it('should handle timeout gracefully', async () => {
    // Create package.json with Jest
    const packageJson = {
      scripts: { test: 'jest' },
      devDependencies: { jest: '^29.0.0' },
    };

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(packageJson),
    );

    const result = await executeTests({
      projectRoot: tmpDir,
      timeout: 100, // Very short timeout
    });

    // Should complete even if timeout occurs
    expect(result).toBeDefined();
    expect(result.framework).toBe('jest');
  });
});
