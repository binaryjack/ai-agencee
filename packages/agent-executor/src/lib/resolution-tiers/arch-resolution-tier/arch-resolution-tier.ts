import type { ModelRouter } from '../../model-router/index.js';
import type { ResolutionTier, DecisionOption, PendingDecision } from '../resolution-tiers.types.js';
import './prototype/index.js';

export interface IArchResolutionTier extends ResolutionTier {
  _modelRouter?: ModelRouter;
  canHandle(pending: PendingDecision): boolean;
  resolve(pending: PendingDecision): Promise<DecisionOption | null>;
}

export const ArchResolutionTier = function(
  this: IArchResolutionTier,
  modelRouter?: ModelRouter,
) {
  this._modelRouter = modelRouter;
} as unknown as {
  new(modelRouter?: ModelRouter): IArchResolutionTier;
};
