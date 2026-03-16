import { LaneExecutor } from '../lane-executor.js';
import { buildRecord } from './buildRecord.js';
import { driveLane } from './driveLane.js';
import { findHandoffLane } from './findHandoffLane.js';
import { resolveHandoffTarget } from './resolveHandoffTarget.js';
import { runLane } from './runLane.js';
import { saveCheckpoints } from './saveCheckpoints.js';

Object.assign(
  (LaneExecutor as Function).prototype,
  {
    runLane,
    driveLane,
    resolveHandoffTarget,
    findHandoffLane,
    buildRecord,
    saveCheckpoints,
  },
);
