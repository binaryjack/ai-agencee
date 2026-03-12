/**
 * CLI Command: ai-kit code stats
 * Display statistics about the current codebase index
 */

import * as fsSync from 'fs';
import * as path from 'path';
import { checkIndexStatus } from './index-cmd.js';

type StatsOptions = {
  project?: string;
  json?: boolean;
};

export const runCodeStats = async function(options: StatsOptions = {}): Promise<void> {
  const { project = process.cwd(), json = false } = options;

  const projectRoot = path.resolve(project);
  const dbPath = path.join(projectRoot, '.agents', 'code-index.db');

  const status = await checkIndexStatus(projectRoot);

  if (!status.indexed) {
    if (json) {
      console.log(JSON.stringify({ indexed: false }, null, 2));
    } else {
      console.log('⚠️  No index found at this project root.');
      console.log(`   Run: ai-kit code index --project ${projectRoot}`);
    }
    return;
  }

  let dbSizeBytes = 0;
  try {
    const stat = fsSync.statSync(dbPath);
    dbSizeBytes = stat.size;
  } catch {
    // db file may not be accessible
  }

  const dbSizeKb = (dbSizeBytes / 1024).toFixed(1);

  if (json) {
    console.log(
      JSON.stringify(
        {
          indexed: true,
          totalFiles: status.totalFiles,
          totalSymbols: status.totalSymbols,
          totalDependencies: status.totalDependencies,
          dbPath,
          dbSizeBytes,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`📊 Codebase Index Stats\n`);
  console.log(`   Project:      ${projectRoot}`);
  console.log(`   DB path:      ${dbPath}`);
  console.log(`   DB size:      ${dbSizeKb} KB`);
  console.log(``);
  console.log(`   📄 Files indexed:      ${status.totalFiles}`);
  console.log(`   🔍 Symbols indexed:    ${status.totalSymbols}`);
  console.log(`   🔗 Dependencies:       ${status.totalDependencies}`);
};
