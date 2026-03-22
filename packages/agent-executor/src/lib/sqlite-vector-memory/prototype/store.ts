import type { Embedding, StoreOptions } from '../../vector-memory/index.js';
import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { _toFloat32 } from './_helpers.js';

export async function store(
  this: ISqliteVectorMemory,
  id: string,
  embedding: Embedding,
  options: StoreOptions = {},
): Promise<void> {
  await this._initPromise;
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
