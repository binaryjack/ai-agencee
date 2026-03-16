import type { IVectorMemory } from '../vector-memory.js';

export function size(this: IVectorMemory): number {
  return this._entries.filter((e) => e.namespace === this._namespace).length;
}
