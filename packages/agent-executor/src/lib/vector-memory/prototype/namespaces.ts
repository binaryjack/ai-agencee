import type { IVectorMemory } from '../vector-memory.js';

export function namespaces(this: IVectorMemory): string[] {
  return [...new Set(this._entries.map((e) => e.namespace))];
}
