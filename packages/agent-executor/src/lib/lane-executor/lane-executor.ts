import type { IAuditLog } from '../audit-log/index.js'
import type { IBarrierCoordinator } from '../barrier-coordinator/index.js'
import type { IContractRegistry } from '../contract-registry/index.js'
import type { ICostTracker } from '../cost-tracker/index.js'
import type {
    CheckpointRecord,
    LaneDefinition,
    LaneResult,
    SupervisorVerdict,
} from '../dag-types.js'
import type { IHumanReviewGate } from '../human-review-gate/index.js'
import type { IModelRouter } from '../model-router/index.js'
import { CHECKPOINTS_DIR } from '../path-constants.js'

export interface LaneExecutorOptions {
  registry:            IContractRegistry;
  coordinator:         IBarrierCoordinator;
  projectRoot:         string;
  agentsBaseDir?:      string;
  capabilityRegistry?: Record<string, string[]>;
  checkpointBaseDir?:  string;
  modelRouter?:        IModelRouter;
  costTracker?:        ICostTracker;
  interactive?:        boolean;
  humanReviewGate?:    IHumanReviewGate;
  auditLog?:           IAuditLog;
  runId?:              string;
  /** Fire-and-forget callback invoked after each lane completes (e.g. for eval recording) */
  evalReporter?:       (laneId: string, result: LaneResult) => Promise<void>;
}

export interface ILaneExecutor {
  _registry:           IContractRegistry;
  _coordinator:        IBarrierCoordinator;
  _projectRoot:        string;
  _agentsBaseDir:      string;
  _capabilityRegistry: Record<string, string[]>;
  _checkpointBaseDir:  string;
  _modelRouter:        IModelRouter | undefined;
  _costTracker:        ICostTracker | undefined;
  _interactive:        boolean;
  _humanReviewGate:    IHumanReviewGate;
  _auditLog:           IAuditLog | undefined;
  _runId:              string;
  _evalReporter:       ((laneId: string, result: LaneResult) => Promise<void>) | undefined;

  runLane(lane: LaneDefinition):                                         Promise<LaneResult>;
  driveLane(
    lane:        LaneDefinition,
    checkpoints: CheckpointRecord[],
    counters:    { retries: { count: number }; handoffsRef: { count: number } },
  ):                                                                     Promise<import('../agent-types.js').AgentResult | null>;
  resolveHandoffTarget(verdict: SupervisorVerdict, sourceLaneId: string): SupervisorVerdict;
  findHandoffLane(targetLaneId: string, sourceLane: LaneDefinition):    Promise<LaneDefinition | null>;
  buildRecord(
    payload:    import('../dag-types.js').CheckpointPayload,
    verdict:    SupervisorVerdict,
    retryCount: number,
    barrier:    import('../dag-types.js').BarrierResolution,
    startMs:    number,
  ):                                                                     CheckpointRecord;
  saveCheckpoints(laneId: string, records: CheckpointRecord[]):         Promise<void>;
}

export const LaneExecutor = function LaneExecutor(
  this: ILaneExecutor,
  options: LaneExecutorOptions,
) {
  const { AutoApproveHumanReviewGate, InteractiveHumanReviewGate } =
    require('../human-review-gate/index.js') as typeof import('../human-review-gate/index.js');

  this._registry           = options.registry;
  this._coordinator        = options.coordinator;
  this._projectRoot        = options.projectRoot;
  this._agentsBaseDir      = options.agentsBaseDir ?? options.projectRoot;
  this._capabilityRegistry = options.capabilityRegistry ?? {};
  this._checkpointBaseDir  = options.checkpointBaseDir
    ?? require('path').join(options.projectRoot, CHECKPOINTS_DIR);
  this._modelRouter        = options.modelRouter;
  this._costTracker        = options.costTracker;
  this._interactive        = options.interactive ?? false;
  this._humanReviewGate    = options.humanReviewGate
    ?? (options.interactive ? new InteractiveHumanReviewGate() : new AutoApproveHumanReviewGate());
  this._auditLog           = options.auditLog;
  this._runId              = options.runId ?? 'unknown';
  this._evalReporter       = options.evalReporter;
} as unknown as new (options: LaneExecutorOptions) => ILaneExecutor;
