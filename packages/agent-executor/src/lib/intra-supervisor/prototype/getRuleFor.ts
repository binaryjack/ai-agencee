import type { SupervisorCheckpointRule } from '../../dag-types.js';
import type { IIntraSupervisor } from '../intra-supervisor.js';

export function getRuleFor(
  this:         IIntraSupervisor,
  checkpointId: string,
): SupervisorCheckpointRule | undefined {
  return this._config.checkpoints.find((c) => c.checkpointId === checkpointId);
}
