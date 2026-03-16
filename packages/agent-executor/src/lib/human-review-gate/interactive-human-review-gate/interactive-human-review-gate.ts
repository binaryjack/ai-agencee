import type { CheckpointPayload, SupervisorVerdict } from '../../dag-types.js';
import type { IHumanReviewGate } from '../human-review-gate.types.js';
import { prompt } from './prototype/methods.js';

export interface IInteractiveHumanReviewGate extends IHumanReviewGate {
  prompt(payload: CheckpointPayload, verdict: SupervisorVerdict): Promise<SupervisorVerdict>;
}

export const InteractiveHumanReviewGate = function(
  this: IInteractiveHumanReviewGate,
) {
  // no state
} as unknown as {
  new(): IInteractiveHumanReviewGate;
};

// Attach prototype methods after InteractiveHumanReviewGate is defined (avoids circular-import race)
Object.assign((InteractiveHumanReviewGate as Function).prototype, { prompt });
