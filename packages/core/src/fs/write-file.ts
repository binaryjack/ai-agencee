import * as fs from 'fs';
import * as path from 'path';

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf8');
};
