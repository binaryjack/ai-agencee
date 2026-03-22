import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';

export async function clear(this: ISqliteVectorMemory, namespace?: string): Promise<void> {
  await this._initPromise;
  this._repo?.clear(namespace ?? this._namespace);
}
