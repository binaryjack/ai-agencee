/**
 * CLI Command: ai-kit code watch
 * Watch a project directory and automatically re-index on changes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCodeIndex } from './index-cmd.js';

type WatchOptions = {
  project?: string;
  languages?: string;
  exclude?: string;
  verbose?: boolean;
};

/** Patterns that should never trigger a re-index */
const ALWAYS_IGNORE = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.agents', // the db itself
  '.DS_Store',
]);

function shouldIgnore(relativePath: string): boolean {
  const parts = relativePath.replaceAll('\\', '/').split('/');
  return parts.some(p => ALWAYS_IGNORE.has(p));
}

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
    verbose = false,
  } = options;

  const projectRoot = path.resolve(project);

  console.log(`👁️  Watching: ${projectRoot}`);
  console.log(`   Languages: ${languages}`);
  console.log(`   Press Ctrl+C to stop.\n`);

  // Initial full index
  await runCodeIndex({ project, languages, exclude, verbose, incremental: true });

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

      console.log(`\n🔄 ${files.length} file(s) changed, re-indexing...`);
      if (verbose) {
        files.forEach(f => console.log(`   · ${f}`));
      }

      reindexing = true;
      try {
        await runCodeIndex({ project, languages, exclude, verbose, incremental: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Re-index failed: ${msg}`);
      } finally {
        reindexing = false;
      }
    }, 400);
  };

  let watcher: fs.FSWatcher;
  try {
    watcher = fs.watch(projectRoot, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (shouldIgnore(filename)) return;
      if (!isSupportedExtension(filename, languages)) return;

      changedFiles.add(filename);
      scheduleReindex();
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Cannot watch directory: ${msg}`);
    console.error(`   Try running with --no-watch on systems where recursive watch is unsupported.`);
    process.exit(1);
  }

  // Keep process alive and handle graceful shutdown
  const shutdown = (): void => {
    console.log('\n\n👋 Stopping watcher...');
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Prevent Node from exiting while watcher is active (no-op keep-alive)
  await new Promise<void>(() => {
    // Intentionally never resolves — process exits via SIGINT/SIGTERM handlers
  });
};
