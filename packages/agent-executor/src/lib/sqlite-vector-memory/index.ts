
export { SqliteVectorMemory } from './sqlite-vector-memory.js';
export type { ISqliteVectorMemory, SqliteVectorMemoryOptions } from './sqlite-vector-memory.js';

export { SqliteVectorRepository } from './sqlite-vector-repository.js';
export type { ISqliteVectorRepository, VectorItem } from './sqlite-vector-repository.types.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
