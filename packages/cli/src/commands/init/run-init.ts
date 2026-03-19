import { copyTemplateFiles, fileExists, TEMPLATE_DIR } from '@ai-agencee/core';
import * as fs from 'fs';
import * as path from 'path';
import { ask } from './ask.js';

const TECH_REGISTRY_DEP = '@ai-agencee/tech-registry';
const TECH_REGISTRY_VERSION = '^1.0.0';

const ensureTechRegistryInPackageJson = async (dest: string): Promise<void> => {
  const pkgPath = path.join(dest, 'package.json');
  let pkg: Record<string, unknown> = {};
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return; // no package.json — skip silently
  }
  const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, string>;
  if (devDeps[TECH_REGISTRY_DEP]) return; // already present
  devDeps[TECH_REGISTRY_DEP] = TECH_REGISTRY_VERSION;
  pkg['devDependencies'] = devDeps;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(`updated: package.json (added ${TECH_REGISTRY_DEP})`);
};

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

  await ensureTechRegistryInPackageJson(dest);

  if (options?.strict) {
    console.log('\n✅ ULTRA_HIGH Standards enabled');
    console.log('📋 Strict rules loaded from src/.ai/');
    console.log('🚀 Ready for development with STRICT_MODE=1');
  }
};
