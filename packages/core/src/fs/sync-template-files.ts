import * as path from 'path';
import { fileExists } from './file-exists.js';
import { listFilesRecursive } from './list-files-recursive.js';
import { readFile } from './read-file.js';
import type { SyncResult } from './sync-result.types.js';
import { writeFile } from './write-file.js';

export const syncTemplateFiles = async (
  src: string,
  dest: string,
): Promise<SyncResult[]> => {
  const allFiles = await listFilesRecursive(src);
  const results: SyncResult[] = [];
  for (const srcFile of allFiles) {
    const rel = path.relative(src, srcFile);
    const destFile = path.join(dest, rel);
    const srcContent = await readFile(srcFile);
    if (await fileExists(destFile)) {
      const destContent = await readFile(destFile);
      if (destContent === srcContent) {
        results.push({ path: destFile, status: 'ok' });
      } else {
        await writeFile(destFile, srcContent);
        results.push({ path: destFile, status: 'diverged' });
      }
    } else {
      await writeFile(destFile, srcContent);
      results.push({ path: destFile, status: 'updated' });
    }
  }
  return results;
};
