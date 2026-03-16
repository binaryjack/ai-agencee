import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';

export async function clear(this: ISqliteVectorMemory, namespace?: string): Promise<void> {
  this._repo?.clear(namespace ?? this._namespace);
}
