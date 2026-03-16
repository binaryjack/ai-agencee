import type { IVectorMemory } from '../vector-memory.js';

export function clear(this: IVectorMemory): void {
  this._entries = this._entries.filter((e) => e.namespace !== this._namespace);
}
