import * as path from 'path';
import { TEMPLATE_DIR } from '../constants/template-dir.js';
import { listFilesRecursive } from '../fs/list-files-recursive.js';
import { readFile } from '../fs/read-file.js';
import type { TemplateFile } from './template-file.types.js';

export const loadTemplateFiles = async (): Promise<TemplateFile[]> => {
  const files = await listFilesRecursive(TEMPLATE_DIR);
  const result: TemplateFile[] = [];
  for (const file of files) {
    const content = await readFile(file);
    result.push({ relativePath: path.relative(TEMPLATE_DIR, file), content });
  }
  return result;
};
