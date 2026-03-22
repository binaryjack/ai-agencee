import { MEMORY_DB_FILE } from '../path-constants.js';
import type { Embedding, SearchOptions, SearchResult, StoreOptions } from '../vector-memory/index.js';
import type { ISqliteVectorRepository } from './sqlite-vector-repository.types.js';
export type { Embedding, SearchOptions, SearchResult, StoreOptions };

export interface SqliteVectorMemoryOptions {
  namespace?: string;
  dbPath?: string;
  maxEntries?: number;
}

export interface ISqliteVectorMemory {
  _namespace: string;
  _dbPath: string;
  _maxEntries: number;
  _db: any | null;
  _repo: ISqliteVectorRepository | null;
  _initPromise: Promise<void>;

  store(id: string, embedding: Embedding, options?: StoreOptions): Promise<void>;
  search(query: Embedding, options?: SearchOptions): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
  size(namespace?: string): Promise<number>;
  close(): void;
  _open(): Promise<void>;
  _toFloat32(emb: Embedding): Float32Array;
  _cosineSim(a: Float32Array, b: Float32Array): number;
}

export const SqliteVectorMemory = function SqliteVectorMemory(
  this: ISqliteVectorMemory,
  options: SqliteVectorMemoryOptions = {},
) {
  this._namespace  = options.namespace  ?? 'default';
  this._dbPath     = options.dbPath     ?? require('path').join(process.cwd(), MEMORY_DB_FILE);
  this._maxEntries = options.maxEntries ?? 10_000;
  this._db         = null;
  this._repo       = null;
  // _open() is now async — store the promise so methods can await it.
  this._initPromise = (this._open as () => Promise<void>)();
} as unknown as new (options?: SqliteVectorMemoryOptions) => ISqliteVectorMemory;
