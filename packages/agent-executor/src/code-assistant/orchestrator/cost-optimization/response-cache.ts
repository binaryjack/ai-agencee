/**
 * Response cache using SQLite
 * 
 * Caches LLM responses to avoid redundant API calls for identical prompts.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getDefaultDatabasePath } from '../config/index.js';
import type { CacheRow } from '../database/types.js';
import type { CacheEntry, IResponseCache } from './cost-optimization.types.js';

export class ResponseCacheDatabase implements IResponseCache {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly ttl: number;
  
  constructor(dbPath?: string, ttl: number = 7 * 24 * 60 * 60 * 1000) {
    this.dbPath = dbPath || getDefaultDatabasePath('RESPONSE_CACHE');
    this.ttl = ttl;
  }
  
  async initialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        response TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 1,
        project_root TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_timestamp ON cache(timestamp);
      CREATE INDEX IF NOT EXISTS idx_project_root ON cache(project_root);
    `);
  }
  
  async get(key: string): Promise<CacheEntry | null> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const row = this.db.prepare(`
      SELECT * FROM cache WHERE key = ? AND timestamp > ?
    `).get(key, Date.now() - this.ttl) as CacheRow | undefined;
    
    if (!row) return null;
    
    // Increment hit count
    this.db.prepare(`
      UPDATE cache SET hit_count = hit_count + 1 WHERE key = ?
    `).run(key);
    
    return {
      key: row.key,
      response: row.response,
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cost: row.cost,
      timestamp: row.timestamp,
      hitCount: row.hit_count + 1,
      projectRoot: row.project_root,
    };
  }
  
  async set(entry: CacheEntry): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.prepare(`
      INSERT OR REPLACE INTO cache (key, response, model, input_tokens, output_tokens, cost, timestamp, hit_count, project_root)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.key,
      entry.response,
      entry.model,
      entry.inputTokens,
      entry.outputTokens,
      entry.cost,
      entry.timestamp,
      entry.hitCount,
      entry.projectRoot
    );
  }
  
  async clear(projectRoot?: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    if (projectRoot) {
      this.db.prepare(`DELETE FROM cache WHERE project_root = ?`).run(projectRoot);
    } else {
      this.db.exec(`DELETE FROM cache`);
    }
  }
  
  async getStats(projectRoot?: string): Promise<{
    totalEntries: number;
    totalHits: number;
    totalSaved: number;
    hitRate: number;
  }> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const query = projectRoot
      ? `SELECT COUNT(*) as count, SUM(hit_count - 1) as hits, SUM(cost * (hit_count - 1)) as saved FROM cache WHERE project_root = ? AND timestamp > ?`
      : `SELECT COUNT(*) as count, SUM(hit_count - 1) as hits, SUM(cost * (hit_count - 1)) as saved FROM cache WHERE timestamp > ?`;
    
    const params = projectRoot ? [projectRoot, Date.now() - this.ttl] : [Date.now() - this.ttl];
    const stats = this.db.prepare(query).get(...params) as {
      count: number | null;
      hits: number | null;
      saved: number | null;
    } | undefined;
    
    return {
      totalEntries: stats?.count ?? 0,
      totalHits: stats?.hits ?? 0,
      totalSaved: stats?.saved ?? 0,
      hitRate: (stats?.count ?? 0) > 0 ? ((stats?.hits ?? 0) / (stats?.count ?? 1)) : 0,
    };
  }
  
  close(): void {
    if (this.db) this.db.close();
  }
}

/**
 * Generate cache key from prompts and model
 */
export function generateCacheKey(systemPrompt: string, userPrompt: string, model: string): string {
  const content = `${systemPrompt}|||${userPrompt}|||${model}`;
  return createHash('sha256').update(content).digest('hex');
}

export function createResponseCache(dbPath?: string, ttl?: number): IResponseCache {
  return new ResponseCacheDatabase(dbPath, ttl);
}
