/**
 * CLI Command: ai-kit code watch
 * Watch a project directory and automatically re-index on changes
 */

import chokidar from 'chokidar';
import chalk from 'chalk';
import * as path from 'node:path';
import { runCodeIndex } from './index-cmd.js';

type WatchOptions = {
  project?: string;
  languages?: string;
  exclude?: string;
  include?: string;
  verbose?: boolean;
};

function isSupportedExtension(filename: string, languages: string): boolean {
  const ext = path.extname(filename).slice(1).toLowerCase();
  const langs = languages.split(',').map(l => l.trim());

  const langExtMap: Record<string, string[]> = {
    typescript: ['ts', 'tsx'],
    javascript: ['js', 'jsx', 'mjs', 'cjs'],
  };

  return langs.some(lang => langExtMap[lang]?.includes(ext));
}

export const runCodeWatch = async function(options: WatchOptions = {}): Promise<void> {
  const {
    project = process.cwd(),
    languages = 'typescript,javascript',
    exclude = 'node_modules,dist,build,.git,coverage',
    include = '',
    verbose = false,
  } = options;

  const projectRoot = path.resolve(project);

  console.log(chalk.bold(`👁️  Watching: ${projectRoot}`));
  console.log(chalk.dim(`   Languages: ${languages}`));
  console.log(chalk.dim(`   Press Ctrl+C to stop.\n`));

  // Initial full index
  await runCodeIndex({ project, languages, exclude, include, verbose, incremental: true });

  console.log(chalk.green('\n📁 File watcher active'));
  console.log(chalk.dim('   Your codebase index is always up-to-date.\n'));

  const changedFiles = new Set<string>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let reindexing = false;

  const scheduleReindex = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (reindexing) {
        // Still busy — reschedule for after current run
        scheduleReindex();
        return;
      }

      const files = [...changedFiles];
      changedFiles.clear();

      if (files.length === 0) return;

      // Re-index with timing per file
      for (const file of files) {
        const startTime = performance.now();
        try {
          reindexing = true;
          await runCodeIndex({ project, languages, exclude, include, verbose: false, incremental: true });
          const duration = Math.round(performance.now() - startTime);
          console.log(chalk.cyan(`  ${file} changed → Re-indexed (${duration}ms)`));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`  ${file} → Re-index failed: ${msg}`));
        } finally {
          reindexing = false;
        }
      }
    }, 400);
  };

  // Build ignore patterns from exclude option
  const ignorePatterns = exclude.split(',').map(p => `**/${p.trim()}/**`);
  ignorePatterns.push('**/.agencee/**'); // Always ignore the database itself

  // Setup chokidar watcher
  const watcher = chokidar.watch(projectRoot, {
    ignored: ignorePatterns,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', (filePath: string) => {
    const relativePath = path.relative(projectRoot, filePath);
    if (!isSupportedExtension(relativePath, languages)) return;

    changedFiles.add(relativePath);
    scheduleReindex();
  });

  watcher.on('add', (filePath: string) => {
    const relativePath = path.relative(projectRoot, filePath);
    if (!isSupportedExtension(relativePath, languages)) return;

    changedFiles.add(relativePath);
    scheduleReindex();
  });

  watcher.on('error', (err: Error) => {
    console.error(chalk.red(`❌ Watcher error: ${err.message}`));
  });

  // Keep process alive and handle graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log(chalk.yellow('\n\n👋 Stopping watcher...'));
    if (debounceTimer) clearTimeout(debounceTimer);
    await watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Prevent Node from exiting while watcher is active (no-op keep-alive)
  await new Promise<void>(() => {
    // Intentionally never resolves — process exits via SIGINT/SIGTERM handlers
  });
};

  await new Promise<void>(() => {
    // Intentionally never resolves — process exits via SIGINT/SIGTERM handlers
  });
};
