import * as fs from 'fs';
import * as path from 'path';

export const listFilesRecursive = async (dir: string): Promise<string[]> => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(full);
      files.push(...nested);
    } else {
      files.push(full);
    }
  }
  return files;
};
