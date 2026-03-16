/**
 * copy-agents.test.js
 *
 * Verifies that the copy-agents.js script does NOT create a dist/agents/
 * shadow copy (Fix A, 2026-03-16).
 *
 * Jest cannot run .js CommonJS scripts directly, so we spawn them as a
 * child process and assert filesystem state afterwards.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const scriptPath = path.resolve(__dirname, '..', 'copy-agents.js');
const distPath   = path.resolve(__dirname, '..', '..', 'dist', 'agents');

describe('copy-agents.js (Fix A — shadow copy removed)', () => {
  it('script file exists and is executable by Node', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('running the script does NOT create dist/agents/', () => {
    // Remove dist/agents if it already exists from a previous (broken) build
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }

    execFileSync(process.execPath, [scriptPath], { stdio: 'pipe' });

    expect(fs.existsSync(distPath)).toBe(false);
  });

  it('script exits with code 0', () => {
    // execFileSync throws on non-zero exit — if this line doesn't throw, exit was 0
    expect(() =>
      execFileSync(process.execPath, [scriptPath], { stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('script emits a message confirming shadow copy is disabled', () => {
    const output = execFileSync(process.execPath, [scriptPath], { encoding: 'utf-8' });
    expect(output).toMatch(/shadow copy disabled/i);
  });
});
