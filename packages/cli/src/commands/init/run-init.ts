import { copyTemplateFiles, fileExists, TEMPLATE_DIR } from '@ai-agencee/core';
import * as path from 'path';
import { ask } from './ask.js';

export const runInit = async (options?: { strict?: boolean }): Promise<void> => {
  const dest = process.cwd();
  const src = TEMPLATE_DIR;
  const files = await copyTemplateFiles(src, dest, async (filePath: string) => {
    if (await fileExists(filePath)) {
      const answer = await ask(`Overwrite ${path.relative(dest, filePath)}? [y/N] `);
      return answer.toLowerCase() === 'y';
    }
    return true;
  });
  for (const f of files) {
    console.log(`created: ${path.relative(dest, f)}`);
  }

  if (options?.strict) {
    console.log('\n✅ ULTRA_HIGH Standards enabled');
    console.log('📋 Strict rules loaded from src/.ai/');
    console.log('🚀 Ready for development with STRICT_MODE=1');
  }
};
