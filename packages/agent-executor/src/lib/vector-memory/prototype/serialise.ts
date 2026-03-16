import type { SerializedMemory } from '../../vector-memory/index.js';
import type { IVectorMemory } from '../vector-memory.js';

export function serialise(this: IVectorMemory): SerializedMemory {
  return {
    version: 1,
    entries: this._entries.map((e) => ({
      id:        e.id,
      namespace: e.namespace,
      embedding: Array.from(e.embedding),
      metadata:  e.metadata,
      text:      e.text,
      storedAt:  e.storedAt,
    })),
  };
}
