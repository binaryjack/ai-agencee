import * as fs from 'fs';

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};
