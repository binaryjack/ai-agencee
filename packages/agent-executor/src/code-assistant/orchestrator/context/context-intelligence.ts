/**
 * Context intelligence orchestrator
 * 
 * Main entry point for context intelligence features:
 * - Project indexing
 * - Dependency graph building
 * - Context optimization
 * - Symbol search
 */

import { glob } from 'glob';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createContextIndex, hashContent } from './context-index.js';
import { prioritizeSymbols } from './context-prioritizer.js';
import type {
    CodeSymbol,
    ContextIntelligenceConfig,
    ContextOptimizationResult,
    ContextPrioritizationConfig,
    DependencyGraph,
    IContextIntelligence,
    IndexEntry,
} from './context.types.js';
import { buildDependencyGraph } from './dependency-graph.js';
import { extractSymbols } from './symbol-extractor.js';

export class ContextIntelligenceOrchestrator implements IContextIntelligence {
  private readonly config: ContextIntelligenceConfig;
  private readonly index;
  
  constructor(config: ContextIntelligenceConfig) {
    this.config = config;
    this.index = createContextIndex(config.indexPath);
  }
  
  /**
   * Index entire project
   */
  async indexProject(projectRoot: string): Promise<void> {
    // Find all source files
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
    ];
    
    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/__pycache__/**',
      '**/*.min.js',
    ];
    
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        ignore: ignorePatterns,
        absolute: true,
      });
      files.push(...matches);
    }
    
    // Index each file
    for (const filePath of files) {
      try {
        await this.indexFile(filePath);
      } catch (error: unknown) {
        console.warn(`Failed to index ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<void> {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');
    const hash = hashContent(content);
    
    // Check if already indexed
    const needsReindex = await this.index.needsReindex(filePath, hash);
    if (!needsReindex) {
      return; // Already up to date
    }
    
    // Extract symbols
    const symbols = extractSymbols(content, filePath);
    
    // Extract dependencies (import statements)
    const dependencies: string[] = [];
    for (const symbol of symbols) {
      if (symbol.type === 'import') {
        // Resolve relative imports to absolute paths
        const importPath = this.resolveImportPath(filePath, symbol.name);
        if (importPath) {
          dependencies.push(importPath);
        }
      }
    }
    
    // Get file modification time
    const stats = await fs.stat(filePath);
    const lastModified = stats.mtimeMs;
    
    // Create index entry
    const entry: IndexEntry = {
      filePath,
      lastModified,
      lastIndexed: Date.now(),
      symbols: symbols.filter(s => s.type !== 'import'), // Don't store import symbols
      dependencies,
      hash,
    };
    
    // Save to index
    await this.index.indexFile(entry);
  }
  
  /**
   * Update index for changed files
   */
  async updateIndex(changedFiles: string[]): Promise<void> {
    for (const filePath of changedFiles) {
      try {
        await this.indexFile(filePath);
      } catch (error: unknown) {
        console.warn(`Failed to update index for ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Build dependency graph
   */
  async buildDependencyGraph(projectRoot: string): Promise<DependencyGraph> {
    const entries = await this.index.getAllFiles();
    const graph = buildDependencyGraph(entries);
    
    return graph;
  }
  
  /**
   * Optimize context
   */
  async optimizeContext(config: ContextPrioritizationConfig): Promise<ContextOptimizationResult> {
    // Get all indexed files
    const entries = await this.index.getAllFiles();
    
    // Build dependency graph
    const graph = buildDependencyGraph(entries);
    
    // Extract keywords from task if not provided
    if (!config.keywords && config.alwaysInclude) {
      // If no keywords but files are specified, extract from those files
      config.keywords = [];
    }
    
    // Prioritize symbols
    const result = prioritizeSymbols(entries, graph, config);
    
    return result;
  }
  
  /**
   * Find symbols matching query
   */
  async findSymbols(query: string): Promise<CodeSymbol[]> {
    return await (this.index as any).findSymbolsByName(query);
  }
  
  /**
   * Get statistics
   */
  async getStats(): Promise<{
    indexedFiles: number;
    totalSymbols: number;
    lastUpdate: number;
  }> {
    const stats = await this.index.getStats();
    
    return {
      indexedFiles: stats.totalFiles,
      totalSymbols: stats.totalSymbols,
      lastUpdate: stats.lastUpdated,
    };
  }
  
  /**
   * Resolve import path to absolute path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Skip external packages (no leading ./ or ../)
    if (!importPath.startsWith('.')) {
      return null;
    }
    
    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, importPath);
    
    // Try adding common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
    for (const ext of extensions) {
      if (!resolved.endsWith(ext)) {
        // Try with extension
        const withExt = resolved + ext;
        // Check if file exists (we can't do async here, so just return the path)
        return withExt;
      }
    }
    
    return resolved;
  }
}

/**
 * Create context intelligence orchestrator
 */
export function createContextIntelligence(
  config: ContextIntelligenceConfig
): IContextIntelligence {
  return new ContextIntelligenceOrchestrator(config);
}

/**
 * Build context string from optimization result
 */
export function buildContextString(result: ContextOptimizationResult): string {
  if (result.symbols.length === 0) {
    return '';
  }
  
  // Group symbols by file
  const fileGroups = new Map<string, typeof result.symbols>();
  for (const symbol of result.symbols) {
    if (!fileGroups.has(symbol.filePath)) {
      fileGroups.set(symbol.filePath, []);
    }
    fileGroups.get(symbol.filePath)!.push(symbol);
  }
  
  let context = '## Relevant Code Context\n\n';
  context += `Selected ${result.symbols.length} symbols from ${result.filesIncluded.length} files `;
  context += `(${result.estimatedTokens} tokens, ${Math.round(result.stats.compressionRatio * 100)}% compression)\n\n`;
  
  for (const [filePath, symbols] of fileGroups.entries()) {
    context += `### ${path.basename(filePath)}\n`;
    context += `File: \`${filePath}\`\n\n`;
    
    for (const symbol of symbols) {
      context += `**${symbol.type}: ${symbol.name}** (relevance: ${symbol.relevanceScore.toFixed(2)})`;
      if (symbol.matchedKeywords && symbol.matchedKeywords.length > 0) {
        context += ` - Matches: ${symbol.matchedKeywords.join(', ')}`;
      }
      context += `\n\`\`\`${symbol.language || 'typescript'}\n${symbol.code}\n\`\`\`\n\n`;
    }
  }
  
  return context;
}
