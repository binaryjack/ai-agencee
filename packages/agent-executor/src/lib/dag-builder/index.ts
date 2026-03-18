
export { DagBuilder, LaneBuilder } from './dag-builder.js';
export type {
    BuiltDagDefinition,
    BuiltGlobalBarrier,
    BuiltLaneDefinition,
    IDagBuilder,
    ILaneBuilder
} from './dag-builder.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
