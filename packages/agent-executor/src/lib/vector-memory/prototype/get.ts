import type { MemoryEntry } from '../../vector-memory/index.js';
import type { IVectorMemory } from '../vector-memory.js';

export function get(this: IVectorMemory, id: string): MemoryEntry | null {
  return this._entries.find((e) => e.id === id && e.namespace === this._namespace) ?? null;
}
