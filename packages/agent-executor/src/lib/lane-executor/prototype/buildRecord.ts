import type {
  BarrierResolution,
  CheckpointPayload,
  CheckpointRecord,
  SupervisorVerdict,
} from '../../dag-types.js';
import type { ILaneExecutor } from '../lane-executor.js';

export function buildRecord(
  this:       ILaneExecutor,
  payload:    CheckpointPayload,
  verdict:    SupervisorVerdict,
  retryCount: number,
  barrier:    BarrierResolution,
  startMs:    number,
): CheckpointRecord {
  return {
    checkpointId:      payload.checkpointId,
    stepIndex:         payload.stepIndex,
    mode:              payload.mode,
    payload,
    verdict,
    retryCount,
    timestamp:         new Date().toISOString(),
    contractsReceived: barrier.snapshots,
    durationMs:        Date.now() - startMs,
  };
}
