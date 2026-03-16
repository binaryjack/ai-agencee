import type { AgentResult } from '../../agent-types.js';
import { getGlobalEventBus } from '../../dag-events/index.js';
import type { CheckpointRecord, LaneDefinition, LaneResult } from '../../dag-types.js';
import { VERDICT } from '../../dag-types.js';
import { getGlobalTracer } from '../../otel.js';
import { EscalationError } from '../../supervised-agent/index.js';
import type { ILaneExecutor } from '../lane-executor.js';

export async function runLane(this: ILaneExecutor, lane: LaneDefinition): Promise<LaneResult> {
  const startedAt = new Date().toISOString();
  const startMs   = Date.now();
  const checkpoints: CheckpointRecord[] = [];

  const laneSpan = getGlobalTracer().startLane('', lane.id);
  void this._auditLog?.laneStart(lane.id, lane.id);
  getGlobalEventBus().emitLaneStart({
    runId:            this._runId,
    laneId:           lane.id,
    providerOverride: lane.providerOverride,
    timestamp:        startedAt,
  });

  let agentResult: AgentResult | null = null;
  let laneStatus: LaneResult['status'] = 'success';
  let errorMsg: string | undefined;

  try {
    agentResult = await this.driveLane(lane, checkpoints, {
      retries:     { count: 0 },
      handoffsRef: { count: 0 },
    });
  } catch (err) {
    if (err instanceof EscalationError) {
      laneStatus = 'escalated';
      errorMsg   = (err as Error).message;
    } else {
      laneStatus = 'failed';
      errorMsg   = String(err);
    }
    laneSpan.recordException(err instanceof Error ? err : new Error(String(err)));
    laneSpan.setStatus('error', String(err));
  }

  const completedAt  = new Date().toISOString();
  const durationMs   = Date.now() - startMs;
  const totalRetries = checkpoints.reduce((sum, cp) => sum + cp.retryCount, 0);
  const handoffsRecv = checkpoints.filter((cp) => cp.verdict.type === VERDICT.HANDOFF).length;
  const finalStatus  = agentResult ? 'success' : laneStatus;

  laneSpan
    .setAttribute('lane.id',          lane.id)
    .setAttribute('lane.status',      finalStatus)
    .setAttribute('lane.retries',     totalRetries)
    .setAttribute('lane.checkpoints', checkpoints.length)
    .setStatus(finalStatus === 'failed' || finalStatus === 'escalated' ? 'error' : 'ok')
    .end();
  void this._auditLog?.laneEnd(lane.id, lane.id, durationMs, finalStatus);
  getGlobalEventBus().emitLaneEnd({
    runId:      this._runId,
    laneId:     lane.id,
    durationMs,
    status:     finalStatus as 'success' | 'failed' | 'escalated',
    retries:    totalRetries,
    timestamp:  new Date().toISOString(),
  });

  const laneResult: LaneResult = {
    laneId:           lane.id,
    status:           finalStatus,
    agentResult:      agentResult ?? undefined,
    checkpoints,
    totalRetries,
    handoffsReceived: handoffsRecv,
    startedAt,
    completedAt,
    durationMs,
    error:            errorMsg,
  };

  await this.saveCheckpoints(lane.id, checkpoints);
  void this._evalReporter?.(lane.id, laneResult).catch(() => {});
  return laneResult;
}
