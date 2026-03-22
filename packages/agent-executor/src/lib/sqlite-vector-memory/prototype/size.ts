import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';

export async function size(this: ISqliteVectorMemory, namespace?: string): Promise<number> {
  await this._initPromise;
  if (!this._repo) return 0;
  return this._repo.count(namespace ?? this._namespace);
}
