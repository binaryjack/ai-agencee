/**
 * CLI Command: ai-kit code:index
 * Indexes a codebase for intelligent search and assistance
 */

import { createCodebaseIndexer } from '@ai-agencee/engine/code-assistant';
import { createParserRegistry, createTypeScriptParser } from '@ai-agencee/engine/code-assistant/parsers';
import { createCodebaseIndexStore } from '@ai-agencee/engine/code-assistant/storage';
import * as path from 'node:path';
import { ProgressReporter } from './progress-reporter.js';

export const checkIndexStatus = async function(projectRoot: string) {
  try {
    const dbPath = path.join(projectRoot, '.agencee', 'code-index.db');
    const store = await createCodebaseIndexStore({
      dbPath,
      projectId: path.basename(projectRoot)
    });
    
    const stats = await store.getStats();
    await store.close();
    
    return {
      indexed: stats.totalFiles > 0,
      ...stats
    };
  } catch {
    return { indexed: false, totalFiles: 0, totalSymbols: 0, totalDependencies: 0 };
  }
};

type CodeIndexOptions = {
  project?: string;
  force?: boolean;
  incremental?: boolean;
  languages?: string;
  exclude?: string;
  include?: string;
  verbose?: boolean;
  json?: boolean;
};

export const runCodeIndex = async function(options: CodeIndexOptions = {}): Promise<void> {
  const {
    project = process.cwd(),
    force = false,
    incremental = true,
    languages = 'typescript,javascript',
    exclude = 'node_modules,dist,build,.git,coverage',
    include = '',
    verbose = false,
    json = false
  } = options;
  
  const projectRoot = path.resolve(project);
  const dbPath = path.join(projectRoot, '.agencee', 'code-index.db');
  const projectId = path.basename(projectRoot);
  
  // Create progress reporter
  const reporter = new ProgressReporter(json);
  
  // Only show header in non-JSON mode
  if (!json) {
    console.log(`📇 Indexing codebase: ${projectRoot}\n`);
  }
  
  try {
    // Create parser registry with TypeScript parser
    const parserRegistry = createParserRegistry({
      customParsers: {
        typescript: createTypeScriptParser(),
        javascript: createTypeScriptParser() // TS parser handles JS too
      }
    });
    
    // Create index store
    const indexStore = await createCodebaseIndexStore({
      dbPath,
      projectId
    });
    
    // Create indexer
    const indexer = createCodebaseIndexer({
      projectRoot,
      indexStore,
      parserRegistry
    });
    
    // Run indexing
    const indexOptions = {
      incremental: incremental && !force,
      languages: languages.split(',').map((l: string) => l.trim()),
      excludePatterns: exclude.split(',').map((p: string) => p.trim()),
      ...(include ? { includePatterns: include.split(',').map((p: string) => p.trim()) } : {})
    };
    
    const result = await indexer.indexProject(indexOptions);
    
    // Close store
    await indexStore.close();
    
    // Report completion with stats
    reporter.complete({
      files: result.filesIndexed,
      symbols: result.symbolsExtracted,
      deps: result.dependenciesTracked,
      cost: result.cost,
      duration: result.duration
    });
    
    // Report errors if any
    if (result.errors && result.errors.length > 0) {
      if (json) {
        // In JSON mode, emit each error as a separate event
        result.errors.forEach((err: string) => {
          reporter.error(err);
        });
      } else {
        console.log(`\n⚠️  Errors: ${result.errors.length}`);
        if (verbose) {
          result.errors.forEach(err => console.log(`  - ${err}`));
        }
      }
    }
    
    // Show storage location in non-JSON mode
    if (json) {
      // In JSON mode, no extra output
    } else {
      console.log(`\n💾 Index stored at: ${dbPath}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    reporter.error(msg);
    
    if (!json && verbose && error instanceof Error) {
      console.error(error.stack);
    }
    
    throw error;
  }
};
