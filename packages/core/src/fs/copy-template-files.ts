import * as path from 'path';
import { listFilesRecursive } from './list-files-recursive.js';
import { readFile } from './read-file.js';
import { writeFile } from './write-file.js';

export const copyTemplateFiles = async (
  src: string,
  dest: string,
  confirm: (filePath: string) => Promise<boolean>,
): Promise<string[]> => {
  const allFiles = await listFilesRecursive(src);
  const copied: string[] = [];
  for (const srcFile of allFiles) {
    const rel = path.relative(src, srcFile);
    const destFile = path.join(dest, rel);
    const shouldWrite = await confirm(destFile);
    if (shouldWrite) {
      const content = await readFile(srcFile);
      await writeFile(destFile, content);
      copied.push(destFile);
    }
  }
  return copied;
};
