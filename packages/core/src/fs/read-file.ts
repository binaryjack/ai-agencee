import * as fs from 'fs';

export const readFile = async (filePath: string): Promise<string> =>
  fs.promises.readFile(filePath, 'utf8');
