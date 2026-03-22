import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';

export async function deleteEntry(this: ISqliteVectorMemory, id: string): Promise<void> {
  await this._initPromise;
  this._repo?.delete(id, this._namespace);
}
