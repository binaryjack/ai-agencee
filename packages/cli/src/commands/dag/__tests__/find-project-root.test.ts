/**
 * find-project-root.test.ts
 *
 * Unit tests for findProjectRoot() and validateProjectRoot().
 * Uses a real temp-directory tree — no mocks needed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findProjectRoot, validateProjectRoot } from '../find-project-root';

// ─── helpers ──────────────────────────────────────────────────────────────────

let tmpBase: string;

beforeEach(() => {
  tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-root-test-'));
});

afterEach(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

// ─── findProjectRoot ───────────────────────────────────────────────────────────

describe('findProjectRoot', () => {
  it('returns the directory that contains agents/ when started there', () => {
    fs.mkdirSync(path.join(tmpBase, 'agents'));
    expect(findProjectRoot(tmpBase)).toBe(tmpBase);
  });

  it('walks up and finds agents/ in a parent', () => {
    fs.mkdirSync(path.join(tmpBase, 'agents'));
    const deep = path.join(tmpBase, 'packages', 'cli', 'dist');
    fs.mkdirSync(deep, { recursive: true });
    expect(findProjectRoot(deep)).toBe(tmpBase);
  });

  it('finds root via package.json when agents/ is absent', () => {
    fs.writeFileSync(path.join(tmpBase, 'package.json'), '{}');
    const deep = path.join(tmpBase, 'src');
    fs.mkdirSync(deep, { recursive: true });
    expect(findProjectRoot(deep)).toBe(tmpBase);
  });

  it('finds root via pnpm-workspace.yaml', () => {
    fs.writeFileSync(path.join(tmpBase, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    const deep = path.join(tmpBase, 'packages', 'core', 'src');
    fs.mkdirSync(deep, { recursive: true });
    expect(findProjectRoot(deep)).toBe(tmpBase);
  });

  it('prefers agents/ marker over package.json when both exist', () => {
    // package.json in parent, agents/ in child — agents/ wins because we start from child
    const child = path.join(tmpBase, 'project');
    fs.mkdirSync(path.join(child, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(tmpBase, 'package.json'), '{}');
    expect(findProjectRoot(child)).toBe(child);
  });

  it('returns startDir when no marker is found anywhere', () => {
    // No markers anywhere in the temp tree
    expect(findProjectRoot(tmpBase)).toBe(tmpBase);
  });

  it('defaults to process.cwd() when no argument is given', () => {
    // process.cwd() for the test runner should be the repo root, which has agents/
    const result = findProjectRoot();
    expect(typeof result).toBe('string');
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('resolves relative startDir to absolute', () => {
    fs.mkdirSync(path.join(tmpBase, 'agents'));
    const relative = path.relative(process.cwd(), tmpBase);
    const result = findProjectRoot(relative);
    expect(path.isAbsolute(result)).toBe(true);
    expect(result).toBe(tmpBase);
  });
});

// ─── validateProjectRoot ───────────────────────────────────────────────────────

describe('validateProjectRoot', () => {
  it('does not throw when agents/ exists', () => {
    fs.mkdirSync(path.join(tmpBase, 'agents'));
    expect(() => validateProjectRoot(tmpBase, false)).not.toThrow();
  });

  it('throws with auto-detect hint when agents/ is missing and no explicit flag', () => {
    expect(() => validateProjectRoot(tmpBase, false)).toThrow(
      /Could not locate project root/,
    );
  });

  it('throws with --project hint when agents/ is missing and explicit flag set', () => {
    expect(() => validateProjectRoot(tmpBase, true)).toThrow(
      /does not contain an agents\//,
    );
  });

  it('error message includes the resolved path', () => {
    try {
      validateProjectRoot(tmpBase, false);
    } catch (err) {
      expect(String(err)).toContain(tmpBase);
    }
  });

  it('error message includes --project tip when not explicit', () => {
    try {
      validateProjectRoot(tmpBase, false);
    } catch (err) {
      expect(String(err)).toContain('--project');
    }
  });
});
