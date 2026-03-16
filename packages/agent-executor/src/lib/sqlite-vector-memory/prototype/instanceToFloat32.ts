import type { Embedding } from '../../vector-memory/index.js';
import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { _toFloat32 } from './_helpers.js';

export function instanceToFloat32(this: ISqliteVectorMemory, emb: Embedding): Float32Array {
  return _toFloat32(emb);
}
