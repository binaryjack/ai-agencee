/**
 * G-24/G-25: SQLite-backed persistent vector memory.
 *
 * Uses `better-sqlite3` (synchronous, no native build issues with Node18+).
 * Install: `pnpm add better-sqlite3 @types/better-sqlite3 --filter agent-executor`
 *
 * Design:
 *   - Same public API surface as VectorMemory (store / search / delete / clear)
 *   - Data lives in `.agents/memory.db` by default
 *   - Embeddings stored as BLOB (Float32Array → Buffer)
 *   - Cosine similarity done in-process (no pgvector needed)
 *   - Namespace-isolated; store key is `${namespace}:${id}`
 *
 * Usage:
 *   const mem = new SqliteVectorMemory({ namespace: 'backend-lane' });
 *   await mem.store('auth-spec', embedding, { text: 'User auth flow…', metadata: {} });
 *   const hits = await mem.search(queryEmb, { topK: 3 });
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Embedding, SearchOptions, SearchResult, StoreOptions } from './vector-memory.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SqliteVectorMemoryOptions {
  namespace?: string;
  dbPath?: string;
  maxEntries?: number;
}

// ─── SqliteVectorMemory ───────────────────────────────────────────────────────

/**
 * Persistent vector memory backed by SQLite.
 * Falls back gracefully when `better-sqlite3` is not installed.
 */
export class SqliteVectorMemory {
  private readonly namespace: string;
  private readonly dbPath: string;
  private readonly maxEntries: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any | null = null;

  constructor(options: SqliteVectorMemoryOptions = {}) {
    this.namespace = options.namespace ?? 'default';
    this.dbPath = options.dbPath ?? path.join(process.cwd(), '.agents', 'memory.db');
    this.maxEntries = options.maxEntries ?? 10_000;
    this._open();
  }

  private _open(): void {
    try {
      // Dynamic import — fail gracefully if package not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require('better-sqlite3');
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS vectors (
          store      TEXT    NOT NULL,
          id         TEXT    NOT NULL,
          content    TEXT,
          embedding  BLOB    NOT NULL,
          metadata   TEXT    NOT NULL DEFAULT '{}',
          created_at TEXT    NOT NULL,
          PRIMARY KEY (store, id)
        );
        CREATE INDEX IF NOT EXISTS idx_vectors_store ON vectors(store);
      `);
    } catch {
      // better-sqlite3 not installed — become a no-op memory store
      this.db = null;
    }
  }

  async store(id: string, embedding: Embedding, options: StoreOptions = {}): Promise<void> {
    const emb = this._toFloat32(embedding);
    const blob = Buffer.from(emb.buffer);
    const payload = {
      store: this.namespace,
      id,
      content: options.text ?? null,
      embedding: blob,
      metadata: JSON.stringify(options.metadata ?? {}),
      created_at: new Date().toISOString(),
    };

    if (this.db) {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO vectors (store, id, content, embedding, metadata, created_at)
           VALUES (@store, @id, @content, @embedding, @metadata, @created_at)`
        )
        .run(payload);

      // Evict oldest if over limit
      const count: number = (
        this.db.prepare('SELECT COUNT(*) as n FROM vectors WHERE store = ?').get(this.namespace) as { n: number }
      ).n;
      if (count > this.maxEntries) {
        this.db
          .prepare(
            `DELETE FROM vectors WHERE store = ? AND id IN (
               SELECT id FROM vectors WHERE store = ? ORDER BY created_at ASC LIMIT ?
             )`
          )
          .run(this.namespace, this.namespace, count - this.maxEntries);
      }
    }
  }

  async search(query: Embedding, options: SearchOptions = {}): Promise<SearchResult[]> {
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.0;
    const ns = options.namespace ?? this.namespace;

    if (!this.db) return [];

    const rows: Array<{ id: string; embedding: Buffer; metadata: string; content: string | null; created_at: string }> =
      this.db.prepare('SELECT id, embedding, metadata, content, created_at FROM vectors WHERE store = ?').all(ns);

    if (rows.length === 0) return [];

    const queryVec = this._toFloat32(query);
    const scored: Array<SearchResult & { _score: number }> = rows
      .map((row) => {
        const vec = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
        const score = this._cosineSim(queryVec, vec);
        return {
          id: row.id,
          score,
          metadata: JSON.parse(row.metadata) as Record<string, unknown>,
          text: row.content ?? undefined,
          storedAt: row.created_at,
          _score: score,
        };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b._score - a._score)
      .slice(0, topK);

    return scored.map(({ _score: _s, ...r }) => r);
  }

  async delete(id: string): Promise<void> {
    this.db?.prepare('DELETE FROM vectors WHERE store = ? AND id = ?').run(this.namespace, id);
  }

  async clear(namespace?: string): Promise<void> {
    const ns = namespace ?? this.namespace;
    this.db?.prepare('DELETE FROM vectors WHERE store = ?').run(ns);
  }

  async size(namespace?: string): Promise<number> {
    const ns = namespace ?? this.namespace;
    if (!this.db) return 0;
    const row = this.db.prepare('SELECT COUNT(*) as n FROM vectors WHERE store = ?').get(ns) as { n: number };
    return row.n;
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private _toFloat32(emb: Embedding): Float32Array {
    return emb instanceof Float32Array ? emb : new Float32Array(emb);
  }

  private _cosineSim(a: Float32Array, b: Float32Array): number {
    const len = Math.min(a.length, b.length);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
