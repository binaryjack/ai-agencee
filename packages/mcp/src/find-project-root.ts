import * as fsSync from 'fs';
import * as path from 'path';

/**
 * Walk up the directory tree from `startDir` until a directory containing
 * an `agents/` sub-directory is found.  Returns the absolute path to that
 * directory.
 *
 * `agents/` is the only reliable repo-root marker: it is unique to the
 * workspace root and is not present in intermediate packages, dist
 * directories, or private sub-workspaces — so using generic markers like
 * `package.json` would cause the walk-up to stop prematurely at the first
 * nested package.
 *
 * Callers in the MCP server should pass this result as `projectRoot` rather
 * than relying on `process.cwd()`.  On Windows the MCP server process CWD
 * resolves through pnpm NTFS junctions to an inner dist directory, not the
 * repo root.
 *
 * @param startDir - Directory to start the walk from (default: process.cwd())
 */
export const findProjectRoot = (startDir?: string): string => {
  let current = path.resolve(startDir ?? process.cwd());

  while (true) {
    if (fsSync.existsSync(path.join(current, 'agents'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Hit the filesystem root without finding the agents/ directory.
      // Return the original startDir — callers can validate and emit a clear error.
      break;
    }
    current = parent;
  }

  return path.resolve(startDir ?? process.cwd());
};
