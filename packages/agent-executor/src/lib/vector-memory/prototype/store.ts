import type { Embedding, MemoryEntry, StoreOptions } from '../../vector-memory/index.js';
import type { IVectorMemory } from '../vector-memory.js';
import { normalise, toFloat32 } from './_helpers.js';

export function store(
  this: IVectorMemory,
  id: string,
  embedding: Embedding,
  options: StoreOptions = {},
): void {
  const vec      = normalise(toFloat32(embedding));
  const existing = this._entries.findIndex(
    (e) => e.id === id && e.namespace === this._namespace,
  );
  const entry: MemoryEntry = {
    id,
    namespace: this._namespace,
    embedding: vec,
    metadata:  options.metadata ?? {},
    text:      options.text,
    storedAt:  new Date().toISOString(),
  };

  if (existing >= 0) {
    this._entries[existing] = entry;
  } else {
    this._entries.push(entry);
    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }
  }
}
