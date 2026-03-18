
export { LaneExecutor } from './lane-executor.js';
export type { ILaneExecutor, LaneExecutorOptions } from './lane-executor.js';
export { createAndRunLane as runLane } from './prototype/methods.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
