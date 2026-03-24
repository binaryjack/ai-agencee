/**
 * SQLite-based storage for codebase index
 * Manages files, symbols, dependencies, and embeddings
 * Uses @sqlite.org/sqlite-wasm (OO1 API) — ABI-safe in Electron/VS Code extension host.
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodebaseIndexStoreOptions, DependencyData, FileData, FileRecord, SymbolData } from './codebase-index-store.types';

// Module-level singleton so WASM is loaded only once.
let _sqlite3Cache: Promise<any> | null = null;
function getSqlite3(): Promise<any> {
  if (!_sqlite3Cache) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _sqlite3Cache = (sqlite3InitModule as any)();
  }
  return _sqlite3Cache!;
}

function cosineSimilarityBuffers(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length)
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < len; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export type CodebaseIndexStoreInstance = {
  _db: any | null;
  _dbPath: string;
  _projectId: string;
  initialize(): Promise<void>;
  upsertFile(fileData: FileData): Promise<number>;
  upsertSymbols(fileId: number, symbols: SymbolData[]): Promise<void>;
  upsertDependencies(dependencies: DependencyData[]): Promise<void>;
  upsertFunctionCalls(calls: Array<{ callerSymbolId: number; calleeName: string; lineNumber?: number; charOffset?: number }>): Promise<void>;
  findCallersOf(symbolName: string): Promise<Array<{ callerSymbolId: number; callerName: string; lineNumber: number | null; filePath: string }>>;
  getSymbolAtPosition(filePath: string, line: number, char: number): Promise<import('./codebase-index-store.types').SymbolRecord | null>;
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
  _createTables(): Promise<void>;
  _migrateEmbeddingColumn(): void;
  _migrateCharOffsetColumns(): void;
};

export const CodebaseIndexStore = function(this: CodebaseIndexStoreInstance, options: CodebaseIndexStoreOptions) {
  const { dbPath, projectId } = options;

  Object.defineProperty(this, '_db', {
    enumerable: false,
    writable: true,
    value: null
  });

  Object.defineProperty(this, '_dbPath', {
    enumerable: false,
    value: dbPath
  });

  Object.defineProperty(this, '_projectId', {
    enumerable: false,
    value: projectId
  });
};

CodebaseIndexStore.prototype.initialize = async function(this: CodebaseIndexStoreInstance): Promise<void> {
  const dir = path.dirname(this._dbPath);
  await fs.mkdir(dir, { recursive: true });

  const sqlite3 = await getSqlite3();
  this._db = new sqlite3.oo1.DB(this._dbPath, 'cw');
  this._db!.exec('PRAGMA journal_mode = WAL');
  this._db!.exec('PRAGMA foreign_keys = ON');

  await this._createTables();
  this._migrateEmbeddingColumn();
  this._migrateCharOffsetColumns();
};

CodebaseIndexStore.prototype._createTables = async function(this: CodebaseIndexStoreInstance): Promise<void> {
  this._db!.exec(`
    CREATE TABLE IF NOT EXISTS codebase_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      language TEXT NOT NULL,
      size_bytes INTEGER,
      last_indexed_at INTEGER,
      UNIQUE(project_id, file_path)
    );
    CREATE INDEX IF NOT EXISTS idx_files_project ON codebase_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_files_hash ON codebase_files(file_hash);
    CREATE TABLE IF NOT EXISTS codebase_symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      line_start INTEGER,
      line_end INTEGER,
      signature TEXT,
      docstring TEXT,
      is_exported BOOLEAN,
      FOREIGN KEY(file_id) REFERENCES codebase_files(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON codebase_symbols(name);
    CREATE INDEX IF NOT EXISTS idx_symbols_kind ON codebase_symbols(kind);
    CREATE INDEX IF NOT EXISTS idx_symbols_file ON codebase_symbols(file_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS codebase_symbols_fts USING fts5(
      name, signature, docstring,
      content='codebase_symbols',
      content_rowid='id'
    );
    CREATE TABLE IF NOT EXISTS codebase_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      source_file_id INTEGER NOT NULL,
      target_file_id INTEGER,
      import_specifier TEXT,
      dependency_type TEXT,
      FOREIGN KEY(source_file_id) REFERENCES codebase_files(id) ON DELETE CASCADE,
      FOREIGN KEY(target_file_id) REFERENCES codebase_files(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_deps_source ON codebase_dependencies(source_file_id);
    CREATE INDEX IF NOT EXISTS idx_deps_target ON codebase_dependencies(target_file_id);
    CREATE TABLE IF NOT EXISTS codebase_function_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_symbol_id INTEGER NOT NULL,
      callee_name TEXT NOT NULL,
      callee_symbol_id INTEGER,
      line_number INTEGER,
      char_offset INTEGER,
      FOREIGN KEY(caller_symbol_id) REFERENCES codebase_symbols(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_calls_caller ON codebase_function_calls(caller_symbol_id);
    CREATE INDEX IF NOT EXISTS idx_calls_callee ON codebase_function_calls(callee_name);
  `);
};

CodebaseIndexStore.prototype._migrateEmbeddingColumn = function(this: CodebaseIndexStoreInstance): void {
  const cols = this._db!.selectObjects("PRAGMA table_info('codebase_symbols')") as { name: string }[];
  if (!cols.some(c => c.name === 'embedding')) {
    this._db!.exec('ALTER TABLE codebase_symbols ADD COLUMN embedding BLOB');
  

CodebaseIndexStore.prototype._migrateCharOffsetColumns = function(this: CodebaseIndexStoreInstance): void {
  const cols = this._db!.selectObjects("PRAGMA table_info('codebase_symbols')") as { name: string }[];
  if (!cols.some(c => c.name === 'char_start')) {
    this._db!.exec('ALTER TABLE codebase_symbols ADD COLUMN char_start INTEGER');
  }
  if (!cols.some(c => c.name === 'char_end')) {
    this._db!.exec('ALTER TABLE codebase_symbols ADD COLUMN char_end INTEGER');
  }
};}
};

CodebaseIndexStore.prototype.getSymbolsByFile = async function(
  this: CodebaseIndexStoreInstance,
  fileId: number
): Promise<{ id: number; name: string; docstring: string | null; is_exported: number }[]> {
  return this._db!.selectObjects(
    'SELECT id, name, docstring, is_exported FROM codebase_symbols WHERE file_id = ?',
    [fileId]
  ) as { id: number; name: string; docstring: string | null; is_exported: number }[];
};

CodebaseIndexStore.prototype.storeEmbedding = async function(
  this: CodebaseIndexStoreInstance,
  symbolId: number,
  vector: Float32Array
): Promise<void> {
  this._db!.exec({
    sql: 'UPDATE codebase_symbols SET embedding = ? WHERE id = ?',
    bind: [Buffer.from(vector.buffer), symbolId],
  });
};

CodebaseIndexStore.prototype.semanticSearch = async function(
  this: CodebaseIndexStoreInstance,
  queryVector: Float32Array,
  topK: number,
  ftsQuery?: string
): Promise<import('../embeddings/embedding-provider.types').SemanticSearchResult[]> {
  type Row = {
    id: number; name: string; kind: string; signature: string | null;
    docstring: string | null; file_path: string; line_start: number; embedding: Uint8Array
  }

  const rows: Row[] = ftsQuery
    ? this._db!.selectObjects(`
        SELECT s.id, s.name, s.kind, s.signature, s.docstring, s.line_start, f.file_path, s.embedding
        FROM codebase_symbols_fts
        JOIN codebase_symbols s ON codebase_symbols_fts.rowid = s.id
        JOIN codebase_files f ON s.file_id = f.id
        WHERE f.project_id = ? AND codebase_symbols_fts MATCH ? AND s.embedding IS NOT NULL
        LIMIT 200
      `, [this._projectId, ftsQuery]) as Row[]
    : this._db!.selectObjects(`
        SELECT s.id, s.name, s.kind, s.signature, s.docstring, s.line_start, f.file_path, s.embedding
        FROM codebase_symbols s
        JOIN codebase_files f ON s.file_id = f.id
        WHERE f.project_id = ? AND s.embedding IS NOT NULL
      `, [this._projectId]) as Row[]

  const scored = rows.map(row => {
    const vec = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)
    const score = cosineSimilarityBuffers(queryVector, vec)
    return { id: row.id, name: row.name, kind: row.kind, signature: row.signature,
             docstring: row.docstring, file_path: row.file_path, line_start: row.line_start, score }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, topK)
};

CodebaseIndexStore.prototype.rebuildFts = function(this: CodebaseIndexStoreInstance): void {
  this._db!.exec("INSERT INTO codebase_symbols_fts(codebase_symbols_fts) VALUES('rebuild')");
};

CodebaseIndexStore.prototype.upsertFile = async function(this: CodebaseIndexStoreInstance, fileData: FileData): Promise<number> {
  const rows = this._db!.selectObjects(`
    INSERT INTO codebase_files (project_id, file_path, file_hash, language, size_bytes, last_indexed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, file_path) DO UPDATE SET
      file_hash = excluded.file_hash,
      language = excluded.language,
      size_bytes = excluded.size_bytes,
      last_indexed_at = excluded.last_indexed_at
    RETURNING id
  `, [
    this._projectId,
    fileData.filePath,
    fileData.hash,
    fileData.language,
    fileData.sizeBytes || 0,
    Date.now(),
  ]) as { id: number }[];
  return rows[0].id;char_start, char_end, signature, docstring, is_exported
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          fileId, symbol.name, symbol.kind, symbol.lineStart, symbol.lineEnd,
          symbol.charStart, symbol.chareIndexStoreInstance, fileId: number, symbols: SymbolData[]): Promise<void> {
  this._db!.exec({ sql: 'DELETE FROM codebase_symbols WHERE file_id = ?', bind: [fileId] });
  if (symbols.length === 0) return;
  this._db!.exec('BEGIN');
  try {
    for (const symbol of symbols) {
      this._db!.exec({
        sql: `INSERT INTO codebase_symbols (
          file_id, name, kind, line_start, line_end, signature, docstring, is_exported
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          fileId, symbol.name, symbol.kind, symbol.lineStart, symbol.lineEnd,
          symbol.signature || null, symbol.docstring || null, symbol.isExported ? 1 : 0,
        ],
      });
    }
    this._db!.exec('COMMIT');
  } catch (e) {
    try { this._db!.exec('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
};

CodebaseIndexStore.prototype.upsertDependencies = async function(this: CodebaseIndexStoreInstance, dependencies: DependencyData[]): Promise<void> {
  this._db!.exec({ sql: 'DELETE FROM codebase_dependencies WHERE project_id = ?', bind: [this._projectId] });
  if (dependencies.length === 0) return;
  this._db!.exec('BEGIN');
  try {
    for (const dep of dependencies) {
      this._db!.exec({
        sql: `INSERT INTO codebase_dependencies (
          project_id, source_file_id, target_file_id, import_specifier, dependency_type
        ) VALUES (?, ?, ?, ?, ?)`,
        bind: [this._projectId, dep.sourceFileId, dep.targetFileId || null, dep.importSpecifier, dep.type],
      });
    }
    this._db!.exec('COMMIT');
  } catch (e) {
    try { this._db!.exec('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
};

CodebaseIndexStore.prototype.upsertFunctionCalls = async function(
  this: CodebaseIndexStoreInstance,
  calls: Array<{ callerSymbolId: number; calleeName: string; lineNumber?: number; charOffset?: number }>
): Promise<void> {
  if (calls.length === 0) return;
  
  this._db!.exec('BEGIN');
  try {
    for (const call of calls) {
      this._db!.exec({
        sql: `INSERT INTO codebase_function_calls (
          caller_symbol_id, callee_name, line_number, char_offset
        ) VALUES (?, ?, ?, ?)`,
        bind: [call.callerSymbolId, call.calleeName, call.lineNumber || null, call.charOffset || null],
      });
    }
    this._db!.exec('COMMIT');
  } catch (e) {
    try { this._db!.exec('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
};

CodebaseIndexStore.prototype.findCallersOf = async function(
  this: CodebaseIndexStoreInstance,
  symbolName: string
): Promise<Array<{ callerSymbolId: number; callerName: string; lineNumber: number | null; filePath: string }>> {
  return this._db!.selectObjects(`
    SELECT SymbolAtPosition = async function(
  this: CodebaseIndexStoreInstance,
  filePath: string,
  line: number,
  char: number
): Promise<import('./codebase-index-store.types').SymbolRecord | null> {
  const normalizedPath = filePath.split('\\').join('/');
  const result = this._db!.selectObject(`
    SELECT s.id, s.file_id as fileId, s.name, s.kind, s.line_start as lineStart, 
           s.line_end as lineEnd, s.char_start as charStart, s.char_end as charEnd,
           s.signature, s.docstring, s.is_exported as isExported
    FROM codebase_symbols s
    JOIN codebase_files f ON s.file_id = f.id
    WHERE f.project_id = ? AND f.file_path = ?
      AND s.line_start <= ? AND s.line_end >= ?
      AND s.char_start <= ? AND s.char_end >= ?
    ORDER BY (s.char_end - s.char_start) ASC
    LIMIT 1
  `, [this._projectId, normalizedPath, line, line, char, char]) as import('./codebase-index-store.types').SymbolRecord | undefined;
  
  return result || null;
};

CodebaseIndexStore.prototype.get
      fc.caller_symbol_id as callerSymbolId,
      s.name as callerName,
      fc.line_number as lineNumber,
      f.file_path as filePath
    FROM codebase_function_calls fc
    JOIN codebase_symbols s ON fc.caller_symbol_id = s.id
    JOIN codebase_files f ON s.file_id = f.id
    WHERE fc.callee_name = ? AND f.project_id = ?
  `, [symbolName, this._projectId]) as Array<{ callerSymbolId: number; callerName: string; lineNumber: number | null; filePath: string }>;
};

CodebaseIndexStore.prototype.getFileByPath = async function(this: CodebaseIndexStoreInstance, filePath: string): Promise<FileRecord | undefined> {
  const normalizedPath = filePath.split('\\').join('/');
  return this._db!.selectObject(
    'SELECT * FROM codebase_files WHERE project_id = ? AND file_path = ?',
    [this._projectId, normalizedPath]
  ) as FileRecord | undefined;
};

CodebaseIndexStore.prototype.getFileByHash = async function(this: CodebaseIndexStoreInstance, hash: string): Promise<FileRecord | undefined> {
  return this._db!.selectObject(
    'SELECT * FROM codebase_files WHERE project_id = ? AND file_hash = ?',
    [this._projectId, hash]
  ) as FileRecord | undefined;
};

CodebaseIndexStore.prototype.getAllFiles = async function(this: CodebaseIndexStoreInstance): Promise<FileRecord[]> {
  return this._db!.selectObjects(
    'SELECT * FROM codebase_files WHERE project_id = ?',
    [this._projectId]
  ) as FileRecord[];
};

CodebaseIndexStore.prototype.query = async function(this: CodebaseIndexStoreInstance, sql: string, params: unknown[] = []): Promise<unknown> {
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return this._db!.selectObjects(sql, params);
  } else {
    return this._db!.exec({ sql, bind: params });
  }
};

CodebaseIndexStore.prototype.getStats = async function(this: CodebaseIndexStoreInstance): Promise<{ totalFiles: number; totalSymbols: number; totalDependencies: number }> {
  const filesRow = this._db!.selectObject(
    'SELECT COUNT(*) as count FROM codebase_files WHERE project_id = ?',
    [this._projectId]
  ) as { count: number };
  const symbolsRow = this._db!.selectObject(`
    SELECT COUNT(*) as count FROM codebase_symbols s
    JOIN codebase_files f ON s.file_id = f.id
    WHERE f.project_id = ?
  `, [this._projectId]) as { count: number };
  const depsRow = this._db!.selectObject(
    'SELECT COUNT(*) as count FROM codebase_dependencies WHERE project_id = ?',
    [this._projectId]
  ) as { count: number };
  return {
    totalFiles: filesRow.count,
    totalSymbols: symbolsRow.count,
    totalDependencies: depsRow.count,
  };
};

CodebaseIndexStore.prototype.close = async function(this: CodebaseIndexStoreInstance): Promise<void> {
  if (this._db) {
    this._db.close();
    this._db = null;
  }
};
