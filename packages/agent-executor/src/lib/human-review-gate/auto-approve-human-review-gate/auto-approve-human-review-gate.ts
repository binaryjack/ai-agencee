import type { CheckpointPayload, SupervisorVerdict } from '../../dag-types.js';
import type { IHumanReviewGate } from '../human-review-gate.types.js';
import { prompt } from './prototype/methods.js';

export interface IAutoApproveHumanReviewGate extends IHumanReviewGate {
  prompt(payload: CheckpointPayload, verdict: SupervisorVerdict): Promise<SupervisorVerdict>;
}

export const AutoApproveHumanReviewGate = function(
  this: IAutoApproveHumanReviewGate,
) {
  // no state
} as unknown as {
  new(): IAutoApproveHumanReviewGate;
};

// Attach prototype methods after AutoApproveHumanReviewGate is defined (avoids circular-import race)
Object.assign((AutoApproveHumanReviewGate as Function).prototype, { prompt });
