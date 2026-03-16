import type { Embedding, MemoryEntry, SearchOptions, SearchResult } from '../../vector-memory/index.js';
import type { IVectorMemory } from '../vector-memory.js';
import { dotProduct, normalise, toFloat32 } from './_helpers.js';

export function search(
  this: IVectorMemory,
  query: Embedding,
  options: SearchOptions = {},
): SearchResult[] {
  const topK     = options.topK     ?? 5;
  const minScore = options.minScore ?? 0.0;
  const ns       = options.namespace ?? this._namespace;
  const qVec     = normalise(toFloat32(query));

  const scored: Array<{ entry: MemoryEntry; score: number }> = [];
  for (const entry of this._entries) {
    if (entry.namespace !== ns) continue;
    const score = dotProduct(qVec, entry.embedding);
    if (score >= minScore) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ entry, score }) => ({
    id:       entry.id,
    score,
    metadata: entry.metadata,
    text:     entry.text,
    storedAt: entry.storedAt,
  }));
}
