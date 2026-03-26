/**
 * Codebase Indexer - Main orchestrator for indexing projects
 * Discovers files, parses them, extracts symbols and dependencies
 */

import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import { glob } from 'glob'
import ignore from 'ignore'
import * as os from 'os'
import * as path from 'path'
import type { CodebaseIndexerInstance, CodebaseIndexerOptions, DependencyGraph, FileParseResult, IndexProjectOptions, IndexResult } from './codebase-indexer.types'

export const CodebaseIndexer = function(this: CodebaseIndexerInstance, options: CodebaseIndexerOptions) {
  const {
    projectRoot,
    indexStore,
    parserRegistry,
    embeddingProvider,
    modelRouter,
    auditLog,
    onProgress
  } = options;
  
  Object.defineProperty(this, '_projectRoot', {
    enumerable: false,
    value: projectRoot
  });
  
  Object.defineProperty(this, '_indexStore', {
    enumerable: false,
    value: indexStore
  });
  
  Object.defineProperty(this, '_parserRegistry', {
    enumerable: false,
    value: parserRegistry
  });
  
  Object.defineProperty(this, '_embeddingProvider', {
    enumerable: false,
    value: embeddingProvider
  });
  
  Object.defineProperty(this, '_modelRouter', {
    enumerable: false,
    value: modelRouter
  });
  
  Object.defineProperty(this, '_auditLog', {
    enumerable: false,
    value: auditLog
  });
  
  Object.defineProperty(this, '_onProgress', {
    enumerable: false,
    value: onProgress
  });
  
  Object.defineProperty(this, '_state', {
    enumerable: false,
    value: {
      indexedFiles: new Set(),
      symbolCache: new Map(),
      depGraph: null
    }
  });
};

CodebaseIndexer.prototype.indexProject = async function(this: CodebaseIndexerInstance, options: IndexProjectOptions = {}): Promise<IndexResult> {
  const startTime = Date.now();
  
  const {
    incremental = true,
    languages = ['typescript', 'javascript', 'python'],
    excludePatterns = ['node_modules', 'dist', 'build', '.git', 'coverage'],
    includePatterns = [],
    respectGitignore = true,
    forceIncludePatterns = [],
    budgetCap = Infinity
  } = options;
  
  let totalCost = 0;
  
  // Phase 1: File discovery
  const files = await this._discoverFiles({
    extensions: this._getExtensions(languages),
    exclude: excludePatterns,
    include: includePatterns,
    respectGitignore,
    forceIncludePatterns
  });
  
  // Report discovery progress
  if (this._onProgress) {
    this._onProgress('discovery', files.length, files.length);
  }
  
  // Phase 2: Incremental check
  const filesToIndex = incremental
    ? await this._detectChanges(files)
    : files;
  
  if (filesToIndex.length === 0) {
    return {
      filesIndexed: 0,
      symbolsExtracted: 0,
      dependenciesTracked: 0,
      cost: 0,
      duration: (Date.now() - startTime) / 1000
    };
  }
  
  // Phase 3: Parse files concurrently (capped at CPU count)
  const parseResults: FileParseResult[] = [];
  const errors: string[] = [];

  const concurrency = os.cpus().length;
  for (let i = 0; i < filesToIndex.length; i += concurrency) {
    const chunk = filesToIndex.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map(fp => this._parseFile(fp)));
    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      if (outcome.status === 'fulfilled') {
        if (outcome.value) parseResults.push(outcome.value);
      } else {
        errors.push(`${chunk[j]}: ${(outcome.reason as any)?.message || 'Unknown error'}`);
      }
    }
    
    // Report parsing progress after each chunk
    if (this._onProgress) {
      const currentFile = chunk[chunk.length - 1];
      const fileName = currentFile ? path.basename(currentFile) : undefined;
      this._onProgress('parsing', i + chunk.length, filesToIndex.length, fileName);
    }
  }
  
  // Phase 4: Store symbols and collect fileId map for Phase 6
  let totalSymbols = 0;
  const fileIdMap = new Map<string, number>(); // filePath → fileId
  let processedFiles = 0;

  for (const result of parseResults) {
    const fileId = await this._indexStore.upsertFile({
      filePath: result.filePath,
      hash: result.hash,
      language: result.language,
      sizeBytes: result.sizeBytes
    });

    await this._indexStore.upsertSymbols(fileId, result.symbols);
    totalSymbols += result.symbols.length;
    fileIdMap.set(result.filePath, fileId);
    
    // Extract and store function calls
    const dbSymbols = await this._indexStore.getSymbolsByFile(fileId);
    const symbolIdMap = new Map<string, number>();
    for (const dbSym of dbSymbols) {
      symbolIdMap.set(dbSym.name, dbSym.id);
    }
    
    const callRecords: Array<{ callerSymbolId: number; calleeName: string }> = [];
    for (const symbol of result.symbols) {
      if ((symbol.kind === 'function' || symbol.kind === 'method') && symbol.calls && symbol.calls.length > 0) {
        const callerSymbolId = symbolIdMap.get(symbol.name);
        if (callerSymbolId) {
          for (const calleeName of symbol.calls) {
            callRecords.push({ callerSymbolId, calleeName });
          }
        }
      }
    }
    
    if (callRecords.length > 0) {
      await this._indexStore.upsertFunctionCalls(callRecords);
    }
    
    // Report indexing progress
    processedFiles++;
    if (this._onProgress) {
      this._onProgress('indexing', processedFiles, parseResults.length);
    }
  }

  // Rebuild FTS once after all symbols are committed (not per-file)
  if (parseResults.length > 0) {
    this._indexStore.rebuildFts();
  }

  // Phase 5: Build dependency graph
  const depGraph = await this._buildDepGraph(parseResults);
  
  // Transform edges for database storage
  const dbEdges = depGraph.edges.map(e => ({
    sourceFileId: parseInt(e.source),
    targetFileId: e.target ? parseInt(e.target) : null,
    importSpecifier: e.importSpecifier,
    type: e.type
  }));
  
  await this._indexStore.upsertDependencies(dbEdges);
  
  // Phase 6: Generate embeddings (if provider available and under budget)
  let embeddingsGenerated = 0;
  
  // Count total embedding targets first for accurate progress
  let totalEmbeddingTargets = 0;
  if (this._embeddingProvider && totalCost < budgetCap) {
    for (const result of parseResults) {
      const fileId = fileIdMap.get(result.filePath);
      if (fileId == null) continue;
      const dbSymbols = await this._indexStore.getSymbolsByFile(fileId);
      const targets = dbSymbols.filter((s: { is_exported: number; docstring: string | null }) => s.is_exported && s.docstring);
      totalEmbeddingTargets += targets.length;
    }
  }

  if (this._embeddingProvider && totalCost < budgetCap && totalEmbeddingTargets > 0) {
    for (const result of parseResults) {
      const fileId = fileIdMap.get(result.filePath);
      if (fileId == null) continue;

      // Get DB symbol rows (includes IDs) for this file
      const dbSymbols = await this._indexStore.getSymbolsByFile(fileId);

      // Filter to exported symbols with a docstring
      const targets = dbSymbols
        .filter((s: { is_exported: number; docstring: string | null }) => s.is_exported && s.docstring)
        .map((s: { id: number; name: string; docstring: string | null }) => ({
          symbolId: s.id,
          text: `${s.name}: ${s.docstring}`,
        }));

      if (targets.length === 0) continue;

      const texts = targets.map((t: { text: string }) => t.text);
      const vectors = await this._embeddingProvider.embed(texts);

      for (let idx = 0; idx < targets.length; idx++) {
        await this._indexStore.storeEmbedding(targets[idx].symbolId, vectors[idx]);
        embeddingsGenerated++;
        
        // Report embedding progress
        if (this._onProgress) {
          this._onProgress('embedding', embeddingsGenerated, totalEmbeddingTargets);
        }
      }
    }
  }
  
  // Phase 7: Audit log
  if (this._auditLog) {
    this._auditLog.write({
      event: 'codebase-indexed',
      filesProcessed: filesToIndex.length,
      symbolsExtracted: totalSymbols,
      cost: totalCost,
      errors: errors.length
    });
  }
  
  // Report completion
  if (this._onProgress) {
    this._onProgress('complete', 1, 1);
  }
  
  return {
    filesIndexed: filesToIndex.length,
    symbolsExtracted: totalSymbols,
    dependenciesTracked: depGraph.edges.length,
    embeddingsGenerated,
    cost: totalCost,
    duration: (Date.now() - startTime) / 1000,
    errors: errors.length > 0 ? errors : undefined
  };
};

CodebaseIndexer.prototype._discoverFiles = async function(this: CodebaseIndexerInstance, options: { extensions: string[]; exclude: string[]; include: string[]; respectGitignore?: boolean; forceIncludePatterns?: string[] }): Promise<string[]> {
  const { extensions, exclude, include, respectGitignore = true, forceIncludePatterns = [] } = options;
  
  const patterns = extensions.map(ext => `**/*.${ext}`);
  
  // Build ignore patterns - both explicit patterns and directory patterns
  const ignorePatterns = [
    ...exclude.map(pattern => `**/${pattern}/**`), // Files within excluded dirs
    ...exclude.map(pattern => `${pattern}/**`),    // Top-level excluded dirs
    ...exclude.map(pattern => `**/${pattern}`),     // Exclude the dirs themselves
  ];
  
  // Discover all files matching extension patterns
  const allFiles = await glob(patterns, {
    cwd: this._projectRoot,
    ignore: ignorePatterns,
    absolute: false,
    nodir: true,
    dot: false  // Don't include hidden files by default
  });
  
  // Also discover files matching includePatterns
  let includedFiles: string[] = [];
  if (include.length > 0) {
    const includeGlobs = include.flatMap(pattern => 
      extensions.map(ext => `${pattern}/**/*.${ext}`)
    );
    includedFiles = await glob(includeGlobs, {
      cwd: this._projectRoot,
      absolute: false,
      nodir: true,
      dot: true  // Include dotfiles in explicit include patterns
    });
  }
  
  // Merge discovered files
  let discoveredFiles = [...new Set([...allFiles, ...includedFiles])];
  
  // Apply .gitignore filtering if enabled
  if (respectGitignore) {
    const ig = ignore();
    
    // Try to load .gitignore file
    const gitignorePath = path.join(this._projectRoot, '.gitignore');
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
      
      // Filter out gitignored files
      discoveredFiles = discoveredFiles.filter(file => !ig.ignores(file));
    } catch {
      // No .gitignore or couldn't read it - skip filtering
    }
  }
  
  // Force-include files matching forceIncludePatterns (even if gitignored)
  let forceIncludedFiles: string[] = [];
  if (forceIncludePatterns.length > 0) {
    const forceGlobs = forceIncludePatterns.flatMap(pattern => 
      extensions.map(ext => `${pattern}/**/*.${ext}`)
    );
    forceIncludedFiles = await glob(forceGlobs, {
      cwd: this._projectRoot,
      absolute: false,
      nodir: true,
      dot: true  // Include dotfiles in force-include patterns
    });
  }
  
  // Final merge: discovered files + force-included files
  const finalFiles = [...new Set([...discoveredFiles, ...forceIncludedFiles])];
  
  // Normalize paths to use forward slashes for cross-platform consistency
  return finalFiles.map(file => file.replace(/\\/g, '/'));
};

CodebaseIndexer.prototype._detectChanges = async function(this: CodebaseIndexerInstance, files: string[]): Promise<string[]> {
  const changed = [];
  
  for (const filePath of files) {
    const fullPath = path.join(this._projectRoot, filePath);
    
    // Skip directories to avoid EISDIR error
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        console.warn(`[indexer] Skipping non-file path: ${filePath}`);
        continue;
      }
    } catch (err) {
      console.warn(`[indexer] Cannot access path: ${filePath}`, err instanceof Error ? err.message : '');
      continue; // File doesn't exist or can't be accessed
    }
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const hash = this._hashContent(content);
      
      // Check if file exists in index with same hash
      const existing = await this._indexStore.getFileByPath(filePath);
      
      if (!existing || existing.file_hash !== hash) {
        changed.push(filePath);
      }
    } catch (err) {
      console.error(`[indexer] Error reading file: ${filePath}`, err instanceof Error ? err.message : '');
      // Continue to next file
    }
  }
  
  return changed;
};

CodebaseIndexer.prototype._parseFile = async function(this: CodebaseIndexerInstance, filePath: string): Promise<FileParseResult | null> {
  const fullPath = path.join(this._projectRoot, filePath);
  
  // Check if it's a file before attempting to read
  const stats = await fs.stat(fullPath);
  if (!stats.isFile()) {
    return null; // Skip directories
  }
  
  const content = await fs.readFile(fullPath, 'utf-8');
  const hash = this._hashContent(content);
  
  // Get parser for this file
  const parser = this._parserRegistry.getParser(filePath);
  if (!parser) {
    return null;
  }
  
  // Parse
  const ast = await parser.parse(content, { filePath });
  
  // Extract symbols
  const symbols = await parser.extractSymbols(ast);
  const imports = await parser.extractImports(ast);
  const exports = await parser.extractExports(ast);
  
  // Detect language
  const language = this._detectLanguage(filePath);
  
  return {
    filePath,
    hash,
    symbols,
    imports,
    exports,
    language,
    sizeBytes: stats.size
  };
};

CodebaseIndexer.prototype._buildDepGraph = async function(this: CodebaseIndexerInstance, parseResults: FileParseResult[]): Promise<DependencyGraph> {
  const edges = [];
  const fileIdByPath = new Map();
  
  // Get file IDs
  for (const result of parseResults) {
    const file = await this._indexStore.getFileByPath(result.filePath);
    if (file) {
      fileIdByPath.set(result.filePath, file.id);
    }
  }
  
  // Build edges from imports
  for (const result of parseResults) {
    const sourceFileId = fileIdByPath.get(result.filePath);
    if (!sourceFileId) continue;
    
    for (const imp of result.imports) {
      let targetFileId = null;
      
      // Resolve local imports
      if (imp.type === 'local') {
        const resolvedPath = this._resolveImport(result.filePath, imp.specifier, fileIdByPath);
        targetFileId = fileIdByPath.get(resolvedPath || '');
      }
      
      edges.push({
        source: String(sourceFileId),
        target: targetFileId ? String(targetFileId) : '',
        importSpecifier: imp.specifier,
        type: imp.type
      });
    }
  }
  
  return {
    nodes: Array.from(fileIdByPath.keys()),
    edges
  };
};

CodebaseIndexer.prototype._resolveImport = function(this: CodebaseIndexerInstance, fromFile: string, specifier: string, fileIdByPath: Map<string, number>): string | null {
  // Simple resolution (can be enhanced)
  if (!specifier.startsWith('.')) {
    return null; // External package
  }
  
  const fromDir = path.dirname(fromFile);
  let resolved = path.normalize(path.join(fromDir, specifier));
  
  // Try adding extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fileIdByPath.has(withExt)) {
      return withExt;
    }
  }
  
  // Try index files
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fileIdByPath.has(indexFile)) {
      return indexFile;
    }
  }
  
  return null;
};

CodebaseIndexer.prototype._extractEmbeddingTargets = function(this: CodebaseIndexerInstance, parseResults: FileParseResult[]): Array<{ symbolId?: number; text: string }> {
  const targets = [];
  
  for (const result of parseResults) {
    for (const symbol of result.symbols) {
      // Only embed exported symbols with docstrings
      if (symbol.isExported && symbol.docstring) {
        targets.push({
          text: `${symbol.name}: ${symbol.docstring}`
        });
      }
    }
  }
  
  return targets;
};

CodebaseIndexer.prototype._hashContent = function(this: CodebaseIndexerInstance, content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
};

CodebaseIndexer.prototype._getExtensions = function(this: CodebaseIndexerInstance, languages: string[]): string[] {
  const extensionMap: Record<string, string[]> = {
    typescript: ['ts', 'tsx'],
    javascript: ['js', 'jsx', 'mjs'],
    python: ['py'],
    java: ['java'],
    go: ['go'],
    rust: ['rs']
  };
  
  return languages.flatMap(lang => extensionMap[lang] || []);
};

CodebaseIndexer.prototype._detectLanguage = function(this: CodebaseIndexerInstance, filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust'
  };
  
  return languageMap[ext] || 'unknown';
};
