/**
 * Context index database
 * 
 * SQLite database storing indexed symbols and file metadata
 * for fast lookup and incremental re-indexing.
 */

import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getDefaultDatabasePath } from '../config/index.js';
import type { FileIndexRow, SymbolRow } from '../database/types.js';
import type {
    CodeSymbol,
    IContextIndex,
    IndexEntry,
    SymbolType,
} from './context.types.js';

export class ContextIndexDatabase implements IContextIndex {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  
  constructor(dbPath?: string) {
    this.dbPath = dbPath || getDefaultDatabasePath('CONTEXT_INDEX');
  }
  
  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    // Create directory if it doesn't exist
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Open database
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Create schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        file_path TEXT PRIMARY KEY,
        last_modified INTEGER NOT NULL,
        last_indexed INTEGER NOT NULL,
        hash TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        code TEXT NOT NULL,
        language TEXT,
        is_exported INTEGER DEFAULT 0,
        FOREIGN KEY (file_path) REFERENCES files(file_path) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        dependency_path TEXT NOT NULL,
        FOREIGN KEY (file_path) REFERENCES files(file_path) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_type ON symbols(type);
      CREATE INDEX IF NOT EXISTS idx_dependencies_file ON dependencies(file_path);
    `);
  }
  
  /**
   * Add or update file index
   */
  async indexFile(entry: IndexEntry): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const insertFile = this.db.prepare(`
      INSERT OR REPLACE INTO files (file_path, last_modified, last_indexed, hash)
      VALUES (?, ?, ?, ?)
    `);
    
    const deleteSymbols = this.db.prepare(`
      DELETE FROM symbols WHERE file_path = ?
    `);
    
    const insertSymbol = this.db.prepare(`
      INSERT INTO symbols (id, file_path, name, type, start_line, end_line, code, language, is_exported)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const deleteDeps = this.db.prepare(`
      DELETE FROM dependencies WHERE file_path = ?
    `);
    
    const insertDep = this.db.prepare(`
      INSERT INTO dependencies (id, file_path, dependency_path)
      VALUES (?, ?, ?)
    `);
    
    // Transaction for atomicity
    const transaction = this.db.transaction(() => {
      // Insert/update file
      insertFile.run(entry.filePath, entry.lastModified, entry.lastIndexed, entry.hash);
      
      // Delete old symbols
      deleteSymbols.run(entry.filePath);
      
      // Insert new symbols
      for (const symbol of entry.symbols) {
        const id = randomBytes(8).toString('hex');
        insertSymbol.run(
          id,
          entry.filePath,
          symbol.name,
          symbol.type,
          symbol.startLine,
          symbol.endLine,
          symbol.code,
          symbol.language || null,
          symbol.isExported ? 1 : 0
        );
      }
      
      // Delete old dependencies
      deleteDeps.run(entry.filePath);
      
      // Insert new dependencies
      for (const dep of entry.dependencies) {
        const id = randomBytes(8).toString('hex');
        insertDep.run(id, entry.filePath, dep);
      }
    });
    
    transaction();
  }
  
  /**
   * Get file index
   */
  async getFile(filePath: string): Promise<IndexEntry | null> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const fileRow = this.db.prepare(`
      SELECT * FROM files WHERE file_path = ?
    `).get(filePath) as FileIndexRow | undefined;
    
    if (!fileRow) return null;
    
    const symbolRows = this.db.prepare(`
      SELECT * FROM symbols WHERE file_path = ?
    `).all(filePath) as SymbolRow[];
    
    const depRows = this.db.prepare(`
      SELECT dependency_path FROM dependencies WHERE file_path = ?
    `).all(filePath) as Array<{ dependency_path: string }>;
    
    const symbols: CodeSymbol[] = symbolRows.map(row => ({
      name: row.name,
      type: row.type as SymbolType,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      code: row.code,
      language: row.language ?? undefined,
      isExported: row.is_exported === 1,
    }));
    
    const dependencies = depRows.map(row => row.dependency_path);
    
    return {
      filePath: fileRow.file_path,
      lastModified: fileRow.last_modified,
      lastIndexed: fileRow.last_indexed,
      hash: fileRow.hash,
      symbols,
      dependencies,
    };
  }
  
  /**
   * Get all indexed files
   */
  async getAllFiles(): Promise<IndexEntry[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const fileRows = this.db.prepare(`
      SELECT file_path FROM files
    `).all() as Array<{ file_path: string }>;
    
    const entries: IndexEntry[] = [];
    for (const row of fileRows) {
      const entry = await this.getFile(row.file_path);
      if (entry) entries.push(entry);
    }
    
    return entries;
  }
  
  /**
   * Check if file needs re-indexing
   */
  async needsReindex(filePath: string, currentHash: string): Promise<boolean> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const entry = await this.getFile(filePath);
    if (!entry) return true; // Not indexed yet
    
    return entry.hash !== currentHash;
  }
  
  /**
   * Remove file from index
   */
  async removeFile(filePath: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.prepare(`
      DELETE FROM files WHERE file_path = ?
    `).run(filePath);
    
    // Cascade delete will remove symbols and dependencies
  }
  
  /**
   * Clear entire index
   */
  async clear(): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.exec(`
      DELETE FROM files;
      DELETE FROM symbols;
      DELETE FROM dependencies;
    `);
  }
  
  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSymbols: number;
    lastUpdated: number;
  }> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const fileCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM files
    `).get() as { count: number } | undefined;
    
    const symbolCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM symbols
    `).get() as { count: number } | undefined;
    
    const lastUpdated = this.db.prepare(`
      SELECT MAX(last_indexed) as max FROM files
    `).get() as { max: number | null } | undefined;
    
    return {
      totalFiles: fileCount?.count ?? 0,
      totalSymbols: symbolCount?.count ?? 0,
      lastUpdated: lastUpdated?.max ?? 0,
    };
  }
  
  /**
   * Find symbols by name (fuzzy match)
   */
  async findSymbolsByName(query: string): Promise<CodeSymbol[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = this.db.prepare(`
      SELECT * FROM symbols
      WHERE name LIKE ?
      LIMIT 50
    `).all(`%${query}%`) as SymbolRow[];
    
    return rows.map(row => ({
      name: row.name,
      type: row.type as SymbolType,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      code: row.code,
      language: row.language ?? undefined,
      isExported: row.is_exported === 1,
    }));
  }
  
  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create context index database
 */
export function createContextIndex(dbPath?: string): IContextIndex {
  return new ContextIndexDatabase(dbPath);
}

/**
 * Hash file content for change detection
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
