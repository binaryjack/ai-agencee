import type { SupervisorVerdict } from '../../dag-types.js';
import { VERDICT } from '../../dag-types.js';
import type { ILaneExecutor } from '../lane-executor.js';

export function resolveHandoffTarget(
  this:         ILaneExecutor,
  verdict:      SupervisorVerdict,
  sourceLaneId: string,
): SupervisorVerdict {
  if (verdict.type !== VERDICT.HANDOFF) return verdict;
  if (!verdict.targetLaneId) return verdict;

  const targetId = verdict.targetLaneId;
  if (!this._capabilityRegistry[targetId]) return verdict;

  const candidates = this._capabilityRegistry[targetId].filter((id) => id !== sourceLaneId);
  if (candidates.length === 0) {
    return {
      type:     VERDICT.ESCALATE,
      reason:   `No lane with capability "${targetId}" found (excluding self "${sourceLaneId}")`,
      evidence: { capabilityRegistry: this._capabilityRegistry },
    };
  }

  return { ...verdict, targetLaneId: candidates[0] };
}
