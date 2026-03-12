/**
 * CLI Command: ai-kit code:index
 * Indexes a codebase for intelligent search and assistance
 */

import { createCodebaseIndexer } from '@ai-agencee/engine/code-assistant'
import { createParserRegistry, createTypeScriptParser } from '@ai-agencee/engine/code-assistant/parsers'
import { createCodebaseIndexStore } from '@ai-agencee/engine/code-assistant/storage'
import * as path from 'path'

export const checkIndexStatus = async function(projectRoot: string) {
  try {
    const dbPath = path.join(projectRoot, '.agents', 'code-index.db');
    const store = await createCodebaseIndexStore({
      dbPath,
      projectId: path.basename(projectRoot)
    });
    
    const stats = await store.getStats();
    await store.close();
    
    return {
      indexed: stats.filesIndexed > 0,
      ...stats
    };
  } catch (error) {
    return { indexed: false, filesIndexed: 0, symbolsExtracted: 0, dependenciesTracked: 0 };
  }
};

type CodeIndexOptions = {
  project?: string;
  force?: boolean;
  incremental?: boolean;
  languages?: string;
  exclude?: string;
  verbose?: boolean;
};

export const runCodeIndex = async function(options: CodeIndexOptions = {}): Promise<void> {
  const {
    project = process.cwd(),
    force = false,
    incremental = true,
    languages = 'typescript,javascript',
    exclude = 'node_modules,dist,build,.git,coverage',
    verbose = false
  } = options;
  
  const projectRoot = path.resolve(project);
  const dbPath = path.join(projectRoot, '.agents', 'code-index.db');
  const projectId = path.basename(projectRoot);
  
  console.log(`📇 Indexing codebase: ${projectRoot}\n`);
  
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
    const result = await indexer.indexProject({
      incremental: incremental && !force,
      languages: languages.split(',').map((l: string) => l.trim()),
      excludePatterns: exclude.split(',').map((p: string) => p.trim())
    });
    
    // Close store
    await indexStore.close();
    
    // Display results
    console.log(`✅ Indexing complete\n`);
    console.log(`📄 Files indexed: ${result.filesIndexed}`);
    console.log(`🔍 Symbols extracted: ${result.symbolsExtracted}`);
    console.log(`🔗 Dependencies tracked: ${result.dependenciesTracked}`);
    console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
    console.log(`⏱️  Duration: ${result.duration.toFixed(2)}s`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`);
      if (verbose) {
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
    }
    
    console.log(`\n💾 Index stored at: ${dbPath}`);
  } catch (error: any) {
    console.error(`\n❌ Indexing failed: ${error?.message || 'Unknown error'}`);
    if (verbose) {
      console.error(error?.stack);
    }
    throw error;
  }
};
