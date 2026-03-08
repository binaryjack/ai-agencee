import * as fs from 'fs/promises';
import * as path from 'path';

export async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    try {
      await fs.stat(path.join(dir, 'package.json'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return startDir;
}
