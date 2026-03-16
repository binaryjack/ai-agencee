import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';

export function close(this: ISqliteVectorMemory): void {
  this._repo?.close();
  this._db   = null;
  this._repo = null;
}
