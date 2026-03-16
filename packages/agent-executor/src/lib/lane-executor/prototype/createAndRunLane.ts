import type { IAuditLog } from '../../audit-log/index.js';
import type { IBarrierCoordinator } from '../../barrier-coordinator/index.js';
import type { IContractRegistry } from '../../contract-registry/index.js';
import type { ICostTracker } from '../../cost-tracker/index.js';
import type { LaneDefinition, LaneResult } from '../../dag-types.js';
import type { IModelRouter } from '../../model-router/index.js';
import { LaneExecutor } from '../lane-executor.js';

export async function createAndRunLane(
  lane:                LaneDefinition,
  projectRoot:         string,
  registry:            IContractRegistry,
  coordinator:         IBarrierCoordinator,
  capabilityRegistry?: Record<string, string[]>,
  modelRouter?:        IModelRouter,
  costTracker?:        ICostTracker,
  interactive?:        boolean,
  agentsBaseDir?:      string,
  auditLog?:           IAuditLog,
  checkpointBaseDir?:  string,
  runId?:              string,
): Promise<LaneResult> {
  const executor = new LaneExecutor({
    registry,
    coordinator,
    projectRoot,
    agentsBaseDir,
    capabilityRegistry,
    checkpointBaseDir,
    modelRouter,
    costTracker,
    interactive,
    auditLog,
    runId,
  });
  return executor.runLane(lane);
}
