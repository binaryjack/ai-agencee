/**
 * Type definitions for Codebase Index Store
 */

import type Database from 'better-sqlite3';

export type CodebaseIndexStoreOptions = {
  dbPath: string;
  projectId: string;
};

export type CodebaseIndexStoreInstance = {
  _db: Database.Database | null;
  _projectId: string;
  _dbPath: string;
  initialize(): Promise<void>;
  _createTables(): Promise<void>;
  upsertFile(fileData: FileData): Promise<number>;
  upsertSymbols(fileId: number, symbols: SymbolData[]): Promise<void>;
  upsertDependencies(dependencies: DependencyData[]): Promise<void>;
  getFileByPath(filePath: string): Promise<FileRecord | undefined>;
  getFileByHash(hash: string): Promise<FileRecord | undefined>;
  getAllFiles(): Promise<FileRecord[]>;
  getSymbolsByFile(fileId: number): Promise<{ id: number; name: string; docstring: string | null; is_exported: number }[]>;
  storeEmbedding(symbolId: number, vector: Float32Array): Promise<void>;
  semanticSearch(queryVector: Float32Array, topK: number, ftsQuery?: string): Promise<import('../embeddings/embedding-provider.types').SemanticSearchResult[]>;
  rebuildFts(): void;
  query(sql: string, params?: unknown[]): Promise<unknown>;
  getStats(): Promise<{ totalFiles: number; totalSymbols: number; totalDependencies: number }>;
  close(): Promise<void>;
};

export type FileData = {
  filePath: string;
  hash: string;
  language: string;
  sizeBytes?: number;
};

export type SymbolData = {
  name: string;
  kind: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  docstring?: string;
  isExported: boolean;
};

export type DependencyData = {
  sourceFileId: number;
  targetFileId?: number | null;
  importSpecifier: string;
  type: string;
};

export type FileRecord = {
  id: number;
  project_id: string;
  file_path: string;
  file_hash: string;
  language: string;
  size_bytes: number;
  last_indexed_at: number;
};

export type SymbolRecord = {
  id: number;
  fileId: number;
  name: string;
  kind: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  docstring?: string;
  isExported: boolean;
};

export type DependencyRecord = {
  id: number;
  projectId: string;
  sourceFileId: number;
  targetFileId?: number;
  importSpecifier: string;
  dependencyType: 'local' | 'npm' | 'builtin';
};
