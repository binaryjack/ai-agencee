import type { Embedding, SearchOptions, SearchResult } from '../../vector-memory/index.js';
import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { _cosineSim, _toFloat32 } from './_helpers.js';

export async function search(
  this: ISqliteVectorMemory,
  query: Embedding,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  await this._initPromise;
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
