import * as fs from 'fs';
import * as path from 'path';

/**
 * Walk up the directory tree from `startDir` until a directory containing
 * a `.agencee/` sub-directory is found.  Returns the absolute path to that
 * directory.
 *
 * `.agencee/` is the reliable workspace root marker: it contains all AI Agencee
 * configuration and runtime data and is unique to the workspace root. It is
 * not present in intermediate packages or dist directories — so using generic
 * markers like `package.json` would cause the walk-up to stop prematurely at
 * the first nested package.
 *
 * Falls back to `startDir` itself if no marker is found, so callers always
 * receive a string — the missing-marker case is surfaced via
 * `validateProjectRoot`.
 *
 * @param startDir - Directory to start the walk from (default: process.cwd())
 */
export const findProjectRoot = (startDir?: string): string => {
  let current = path.resolve(startDir ?? process.cwd());

  // Walk up until we find the .agencee/ directory or hit the filesystem root
  while (true) {
    if (fs.existsSync(path.join(current, '.agencee'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding a marker
      break;
    }
    current = parent;
  }

  // Return the original start dir — validateProjectRoot will emit the error
  return path.resolve(startDir ?? process.cwd());
};

/**
 * Throw a descriptive error when `projectRoot` does not contain a `.agencee/`
 * directory and no marker was detected.  Only called when `--project` is not
 * supplied (i.e. we relied on auto-detection or process.cwd()).
 *
 * @param projectRoot    - Resolved project root to check
 * @param explicitFlag   - Whether the caller set --project explicitly
 */
export const validateProjectRoot = (projectRoot: string, explicitFlag: boolean): void => {
  const agenceeDir = path.join(projectRoot, '.agencee');
  if (fs.existsSync(agenceeDir)) return;

  const hint = explicitFlag
    ? `--project "${projectRoot}" does not contain a .agencee/ directory.`
    : `Could not locate project root from: ${projectRoot}\n` +
      `  Pass --project <repo-root> to set the correct root explicitly.`;

  throw new Error(`❌ Project root not found: ${hint}`);
};
