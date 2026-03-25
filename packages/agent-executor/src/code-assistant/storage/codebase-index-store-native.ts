/**
 * Node.js-native SQLite backend for CodebaseIndexStore.
 *
 * Uses the built-in `node:sqlite` module (Node.js ≥22.5, stable in 24).
 * This backend is used automatically when the process is NOT running inside
 * Electron (VS Code extension host). It writes real files on Windows without
 * the POSIX-path limitation of @sqlite.org/sqlite-wasm.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodebaseIndexStoreInstance } from './codebase-index-store';
import type { CodebaseIndexStoreOptions, DependencyData, FileData, FileRecord, SymbolData } from './codebase-index-store.types';

export const createNativeCodebaseIndexStore = async function (
  options: CodebaseIndexStoreOptions,
): Promise<CodebaseIndexStoreInstance> {
  const store = new NativeCodebaseIndexStore(options);
  await store.initialize();
  return store as unknown as CodebaseIndexStoreInstance;
};

class NativeCodebaseIndexStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _db: any | null = null;
  readonly _dbPath: string;
  readonly _projectId: string;

  constructor(options: CodebaseIndexStoreOptions) {
    this._dbPath = options.dbPath;
    this._projectId = options.projectId;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const dir = path.dirname(this._dbPath);
    await fs.mkdir(dir, { recursive: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { DatabaseSync } = await import('node:sqlite' as string) as { DatabaseSync: new (path: string) => any };
    this._db = new DatabaseSync(this._dbPath);
    this._db.exec('PRAGMA journal_mode = WAL');
    this._db.exec('PRAGMA foreign_keys = ON');
    await this._createTables();
    this._migrateEmbeddingColumn();
  }

  async _createTables(): Promise<void> {
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
      CREATE INDEX IF NOT EXISTS idx_fcalls_caller ON codebase_function_calls(caller_symbol_id);
      CREATE INDEX IF NOT EXISTS idx_fcalls_callee_name ON codebase_function_calls(callee_name);
    `);
  }

  _migrateEmbeddingColumn(): void {
    const cols = this._db!.prepare("PRAGMA table_info('codebase_symbols')").all() as { name: string }[];
    if (!cols.some(c => c.name === 'embedding')) {
      this._db!.exec('ALTER TABLE codebase_symbols ADD COLUMN embedding BLOB');
    }
  }

  async close(): Promise<void> {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  // ── Write operations ──────────────────────────────────────────────────────

  async upsertFile(fileData: FileData): Promise<number> {
    const now = Date.now();
    this._db!.prepare(`
      INSERT INTO codebase_files (project_id, file_path, file_hash, language, size_bytes, last_indexed_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, file_path) DO UPDATE SET
        file_hash = excluded.file_hash,
        language = excluded.language,
        size_bytes = excluded.size_bytes,
        last_indexed_at = excluded.last_indexed_at
    `).run(
      this._projectId,
      fileData.filePath,
      fileData.hash,
      fileData.language,
      fileData.sizeBytes ?? null,
      now,
    );
    const row = this._db!.prepare(
      'SELECT id FROM codebase_files WHERE project_id = ? AND file_path = ?'
    ).get(this._projectId, fileData.filePath) as { id: number } | undefined;
    return row!.id;
  }

  async upsertSymbols(fileId: number, symbols: SymbolData[]): Promise<void> {
    // Delete old symbols for this file (FTS content table will cascade via rebuild)
    this._db!.prepare('DELETE FROM codebase_symbols WHERE file_id = ?').run(fileId);

    const insert = this._db!.prepare(`
      INSERT INTO codebase_symbols
        (file_id, name, kind, line_start, line_end, signature, docstring, is_exported)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of symbols) {
      insert.run(
        fileId,
        s.name,
        s.kind,
        s.lineStart ?? null,
        s.lineEnd ?? null,
        s.signature ?? null,
        s.docstring ?? null,
        s.isExported ? 1 : 0,
      );
    }
    // Rebuild FTS after inserting symbols
    this.rebuildFts();
  }

  async upsertDependencies(dependencies: DependencyData[]): Promise<void> {
    const insert = this._db!.prepare(`
      INSERT OR IGNORE INTO codebase_dependencies
        (project_id, source_file_id, target_file_id, import_specifier, dependency_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const d of dependencies) {
      insert.run(
        this._projectId,
        d.sourceFileId,
        d.targetFileId ?? null,
        d.importSpecifier ?? null,
        d.type ?? null,
      );
    }
  }

  async upsertFunctionCalls(
    calls: Array<{ callerSymbolId: number; calleeName: string; lineNumber?: number; charOffset?: number }>
  ): Promise<void> {
    if (calls.length === 0) return;

    const insert = this._db!.prepare(`
      INSERT INTO codebase_function_calls
        (caller_symbol_id, callee_name, line_number, char_offset)
      VALUES (?, ?, ?, ?)
    `);
    for (const call of calls) {
      insert.run(
        call.callerSymbolId,
        call.calleeName,
        call.lineNumber ?? null,
        call.charOffset ?? null,
      );
    }
  }

  // ── Read operations ───────────────────────────────────────────────────────

  async getFileByPath(filePath: string): Promise<FileRecord | undefined> {
    return this._db!.prepare(
      'SELECT * FROM codebase_files WHERE project_id = ? AND file_path = ?'
    ).get(this._projectId, filePath) as FileRecord | undefined;
  }

  async getFileByHash(hash: string): Promise<FileRecord | undefined> {
    return this._db!.prepare(
      'SELECT * FROM codebase_files WHERE project_id = ? AND file_hash = ?'
    ).get(this._projectId, hash) as FileRecord | undefined;
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return this._db!.prepare(
      'SELECT * FROM codebase_files WHERE project_id = ?'
    ).all(this._projectId) as FileRecord[];
  }

  async getSymbolsByFile(
    fileId: number,
  ): Promise<{ id: number; name: string; docstring: string | null; is_exported: number }[]> {
    return this._db!.prepare(
      'SELECT id, name, docstring, is_exported FROM codebase_symbols WHERE file_id = ?'
    ).all(fileId) as { id: number; name: string; docstring: string | null; is_exported: number }[];
  }

  async getStats(): Promise<{ totalFiles: number; totalSymbols: number; totalDependencies: number }> {
    const files = (this._db!.prepare(
      'SELECT COUNT(*) as n FROM codebase_files WHERE project_id = ?'
    ).get(this._projectId) as { n: number }).n;
    const symbols = (this._db!.prepare(
      `SELECT COUNT(*) as n FROM codebase_symbols s
       JOIN codebase_files f ON s.file_id = f.id WHERE f.project_id = ?`
    ).get(this._projectId) as { n: number }).n;
    const deps = (this._db!.prepare(
      'SELECT COUNT(*) as n FROM codebase_dependencies WHERE project_id = ?'
    ).get(this._projectId) as { n: number }).n;
    return { totalFiles: files, totalSymbols: symbols, totalDependencies: deps };
  }

  // ── Generic query (used by MCP code-search-context) ───────────────────────

  async query(sql: string, params: unknown[] = []): Promise<unknown> {
    return this._db!.prepare(sql).all(...params);
  }

  // ── FTS ───────────────────────────────────────────────────────────────────

  rebuildFts(): void {
    this._db!.exec("INSERT INTO codebase_symbols_fts(codebase_symbols_fts) VALUES('rebuild')");
  }

  // ── Embeddings (stub — deferred until we replace transformers with a Node.js-safe lib) ──

  async storeEmbedding(_symbolId: number, _vector: Float32Array): Promise<void> {
    // Not implemented for native backend yet
  }

  async semanticSearch(
    _queryVector: Float32Array,
    _topK: number,
    _ftsQuery?: string,
  ): Promise<import('../embeddings/embedding-provider.types').SemanticSearchResult[]> {
    return [];
  }
}
