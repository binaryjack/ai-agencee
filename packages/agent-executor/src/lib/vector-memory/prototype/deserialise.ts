import type { SerializedMemory } from '../../vector-memory/index.js';
import type { IVectorMemory } from '../vector-memory.js';
import { normalise } from './_helpers.js';

export function deserialise(this: IVectorMemory, snapshot: SerializedMemory): void {
  for (const raw of snapshot.entries) {
    const vec = normalise(new Float32Array(raw.embedding));
    this._entries.push({
      id:        raw.id,
      namespace: raw.namespace,
      embedding: vec,
      metadata:  raw.metadata,
      text:      raw.text,
      storedAt:  raw.storedAt,
    });
  }
}
