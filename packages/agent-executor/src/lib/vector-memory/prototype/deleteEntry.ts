import type { IVectorMemory } from '../vector-memory.js';

export function deleteEntry(this: IVectorMemory, id: string): boolean {
  const before      = this._entries.length;
  this._entries = this._entries.filter(
    (e) => !(e.id === id && e.namespace === this._namespace),
  );
  return this._entries.length < before;
}
