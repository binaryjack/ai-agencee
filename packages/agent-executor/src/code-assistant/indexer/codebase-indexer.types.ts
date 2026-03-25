/**
 * Type definitions for Codebase Indexer
 */

import type { IModelRouter } from '../../lib/model-router/model-router.js'
import type { EmbeddingProvider } from '../embeddings/embedding-provider.types'
import type { FileParseResult } from '../parsers/parser-protocol.types'
import type { ParserRegistryInstance } from '../parsers/parser-registry'
import type { CodebaseIndexStoreInstance } from '../storage/codebase-index-store.types'

export type { FileParseResult } from '../parsers/parser-protocol.types'

/** Minimal audit-log interface for codebase-indexer (different shape from IAuditLog) */
export type IIndexerAuditLog = {
  write(event: Record<string, unknown>): void;
};

/** Progress phase during indexing */
export type ProgressPhase = 
  | 'discovery' 
  | 'parsing' 
  | 'indexing' 
  | 'embedding' 
  | 'complete';

/** Progress callback signature */
export type ProgressCallback = (
  phase: ProgressPhase,
  current: number,
  total: number,
  file?: string
) => void;

export type CodebaseIndexerOptions = {
  projectRoot: string;
  indexStore: CodebaseIndexStoreInstance;
  parserRegistry: ParserRegistryInstance;
  embeddingProvider?: EmbeddingProvider;
  modelRouter?: IModelRouter;
  auditLog?: IIndexerAuditLog;
  onProgress?: ProgressCallback;
};

export type CodebaseIndexerInstance = {
  _projectRoot: string;
  _indexStore: CodebaseIndexStoreInstance;
  _parserRegistry: ParserRegistryInstance;
  _embeddingProvider?: EmbeddingProvider;
  _modelRouter?: IModelRouter;
  _auditLog?: IIndexerAuditLog;
  _onProgress?: ProgressCallback;
  _state: {
    indexedFiles: Set<string>;
    symbolCache: Map<string, Symbol[]>;
    depGraph: DependencyGraph | null;
  };
  indexProject(options?: IndexProjectOptions): Promise<IndexResult>;
  _discoverFiles(options: { extensions: string[]; exclude: string[]; include: string[] }): Promise<string[]>;
  _detectChanges(files: string[]): Promise<string[]>;
  _parseFile(filePath: string): Promise<FileParseResult | null>;
  _buildDepGraph(parseResults: FileParseResult[]): Promise<DependencyGraph>;
  _getExtensions(languages: string[]): string[];
  _detectLanguage(filePath: string): string;
  _hashContent(content: string): string;
  _resolveImport(fromFile: string, specifier: string, fileIdByPath: Map<string, number>): string | null;
  _extractEmbeddingTargets(parseResults: FileParseResult[]): Array<{ symbolId?: number; text: string }>;
  _computeHash(content: string): string;
};

export type IndexProjectOptions = {
  incremental?: boolean;
  languages?: string[];
  excludePatterns?: string[];
  includePatterns?: string[];
  budgetCap?: number;
};

export type IndexResult = {
  filesIndexed: number;
  symbolsExtracted: number;
  dependenciesTracked: number;
  embeddingsGenerated?: number;
  cost: number;
  duration: number;
  errors?: string[];
};

export type Symbol = {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method';
  lineStart: number;
  lineEnd: number;
  charStart: number;
  charEnd: number;
  signature?: string;
  docstring?: string;
  isExported: boolean;
  methods?: string[];
  calls?: string[]; // Array of function/method names called within this symbol
};

export type Import = {
  specifier: string;
  type: 'local' | 'npm' | 'builtin';
  names: string[];
};

export type Export = {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
};

export type DependencyGraph = {
  nodes: string[];
  edges: DependencyEdge[];
};

export type DependencyEdge = {  source: string;
  target: string;
  importSpecifier: string;
  type: 'local' | 'npm' | 'builtin';
};
