import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { _cosineSim } from './_helpers.js';

export function instanceCosineSim(this: ISqliteVectorMemory, a: Float32Array, b: Float32Array): number {
  return _cosineSim(a, b);
}
