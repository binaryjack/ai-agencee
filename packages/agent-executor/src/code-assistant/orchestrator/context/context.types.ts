/**
 * Phase 3: Context Intelligence Types
 * 
 * Smart context prioritization, dependency graphs, and incremental indexing
 * to optimize what goes into the LLM context window.
 */

/**
 * Symbol types that can appear in code
 */
export type SymbolType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'enum'
  | 'import'
  | 'export'
  | 'method'
  | 'property';

/**
 * Code symbol with location and metadata
 */
export interface CodeSymbol {
  name: string;
  type: SymbolType;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  
  // Metadata
  language?: string;
  isExported?: boolean;
  dependencies?: string[]; // Other symbols this depends on
  usedBy?: string[];       // Other symbols that use this
  
  // Relevance scoring
  relevanceScore?: number;
  matchedKeywords?: string[];
}

/**
 * File dependency information
 */
export interface FileDependency {
  filePath: string;
  imports: string[];      // Files this file imports
  importedBy: string[];   // Files that import this file
  symbols: CodeSymbol[];  // Symbols defined in this file
  lastModified: number;   // Timestamp
  language: string;
}

/**
 * Context prioritization configuration
 */
export interface ContextPrioritizationConfig {
  // Maximum context size in tokens
  maxTokens: number;
  
  // Prioritization weights (0-1)
  weights?: {
    keywordMatch?: number;      // Default: 0.4 - How much task keywords match
    recency?: number;           // Default: 0.2 - How recently modified
    dependency?: number;        // Default: 0.3 - How central in dependency graph
    usage?: number;             // Default: 0.1 - How often used by other files
  };
  
  // Keywords from the task
  keywords?: string[];
  
  // Files to always include
  alwaysInclude?: string[];
  
  // Files to exclude
  exclude?: string[];
}

/**
 * Ranked symbol with relevance score
 */
export interface RankedSymbol extends CodeSymbol {
  relevanceScore: number;
  reason: string; // Why this symbol was ranked highly
}

/**
 * Context optimization result
 */
export interface ContextOptimizationResult {
  // Symbols to include in context
  symbols: RankedSymbol[];
  
  // Estimated token count
  estimatedTokens: number;
  
  // Files included
  filesIncluded: string[];
  
  // Optimization stats
  stats: {
    totalSymbols: number;
    selectedSymbols: number;
    compressionRatio: number; // How much we compressed the context
  };
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  filePath: string;
  imports: string[];
  importedBy: string[];
  depth: number;         // Distance from task-related files
  centrality: number;    // PageRank-style importance score
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  
  // Find all dependencies of a file (recursive)
  getDependencies(filePath: string): string[];
  
  // Find all files that depend on this file (recursive)
  getDependents(filePath: string): string[];
  
  // Calculate centrality scores
  calculateCentrality(): void;
}

/**
 * Index entry for a file
 */
export interface IndexEntry {
  filePath: string;
  lastModified: number;
  lastIndexed: number;
  symbols: CodeSymbol[];
  dependencies: string[];
  hash: string; // Content hash for change detection
}

/**
 * Context index database interface
 */
export interface IContextIndex {
  // Add or update file index
  indexFile(entry: IndexEntry): Promise<void>;
  
  // Get file index
  getFile(filePath: string): Promise<IndexEntry | null>;
  
  // Get all indexed files
  getAllFiles(): Promise<IndexEntry[]>;
  
  // Check if file needs re-indexing
  needsReindex(filePath: string, currentHash: string): Promise<boolean>;
  
  // Remove file from index
  removeFile(filePath: string): Promise<void>;
  
  // Clear entire index
  clear(): Promise<void>;
  
  // Statistics
  getStats(): Promise<{
    totalFiles: number;
    totalSymbols: number;
    lastUpdated: number;
  }>;
}

/**
 * Context intelligence orchestrator configuration
 */
export interface ContextIntelligenceConfig {
  projectRoot: string;
  
  // Index configuration
  indexPath?: string; // Default: ~/.codernic/context-index.db
  
  // Auto-indexing
  autoIndex?: boolean; // Default: true
  
  // Prioritization config
  prioritization?: ContextPrioritizationConfig;
}

/**
 * Context intelligence orchestrator
 */
export interface IContextIntelligence {
  // Index management
  indexProject(projectRoot: string): Promise<void>;
  indexFile(filePath: string): Promise<void>;
  updateIndex(changedFiles: string[]): Promise<void>;
  
  // Dependency analysis
  buildDependencyGraph(projectRoot: string): Promise<DependencyGraph>;
  
  // Context optimization
  optimizeContext(config: ContextPrioritizationConfig): Promise<ContextOptimizationResult>;
  
  // Symbol search
  findSymbols(query: string): Promise<CodeSymbol[]>;
  
  // Statistics
  getStats(): Promise<{
    indexedFiles: number;
    totalSymbols: number;
    lastUpdate: number;
  }>;
}
