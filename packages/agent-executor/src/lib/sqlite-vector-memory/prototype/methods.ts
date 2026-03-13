import * as fs from 'fs';
import * as path from 'path';
import type { Embedding, SearchOptions, SearchResult, StoreOptions } from '../../vector-memory/index.js';
import { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { SqliteVectorRepository } from '../sqlite-vector-repository.js';

// ─── Module helpers ──────────────────────────────────────────────────────────

export function _toFloat32(emb: Embedding): Float32Array {
  return emb instanceof Float32Array ? emb : new Float32Array(emb);
}

export function _cosineSim(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot   += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── ISqliteVectorMemory methods ─────────────────────────────────────────────

export function _open(this: ISqliteVectorMemory): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    const dir = path.dirname(this._dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = new Database(this._dbPath);
    this._db = db;
    this._repo = new SqliteVectorRepository(db);
    this._repo.createSchema();
  } catch {
    this._db   = null;
    this._repo = null;
  }
}

export async function store(
  this: ISqliteVectorMemory,
  id: string,
  embedding: Embedding,
  options: StoreOptions = {},
): Promise<void> {
  if (!this._repo) return;
  const emb  = _toFloat32(embedding);
  const blob = Buffer.from(emb.buffer);
  this._repo.insert({
    store:     this._namespace,
    id,
    content:   options.text ?? null,
    embedding: blob,
    metadata:  JSON.stringify(options.metadata ?? {}),
    createdAt: new Date().toISOString(),
  });
  const n = this._repo.count(this._namespace);
  if (n > this._maxEntries) {
    this._repo.trimOldest(this._namespace, n - this._maxEntries);
  }
}

export async function search(
  this: ISqliteVectorMemory,
  query: Embedding,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const topK     = options.topK     ?? 5;
  const minScore = options.minScore ?? 0.0;
  const ns       = options.namespace ?? this._namespace;

  if (!this._repo) return [];

  const rows = this._repo.fetchAll(ns);
  if (rows.length === 0) return [];

  const queryVec = _toFloat32(query);
  return rows
    .map((row) => {
      const vec   = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      const score = _cosineSim(queryVec, vec);
      return {
        id:       row.id,
        score,
        metadata: JSON.parse(row.metadata) as Record<string, unknown>,
        text:     row.content ?? undefined,
        storedAt: row.createdAt,
      };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function deleteEntry(this: ISqliteVectorMemory, id: string): Promise<void> {
  this._repo?.delete(id, this._namespace);
}

export async function clear(this: ISqliteVectorMemory, namespace?: string): Promise<void> {
  this._repo?.clear(namespace ?? this._namespace);
}

export async function size(this: ISqliteVectorMemory, namespace?: string): Promise<number> {
  if (!this._repo) return 0;
  return this._repo.count(namespace ?? this._namespace);
}

export function close(this: ISqliteVectorMemory): void {
  this._repo?.close();
  this._db   = null;
  this._repo = null;
}

export function instanceToFloat32(this: ISqliteVectorMemory, emb: Embedding): Float32Array {
  return _toFloat32(emb);
}

export function instanceCosineSim(this: ISqliteVectorMemory, a: Float32Array, b: Float32Array): number {
  return _cosineSim(a, b);
}
