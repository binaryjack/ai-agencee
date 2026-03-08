import type { DecisionOption, PendingDecision, ResolutionTier } from '../resolution-tiers.types.js'
import './prototype/index.js'

export interface IBAResolutionTier extends ResolutionTier {
  _modelRouter?: ModelRouter;
  canHandle(pending: PendingDecision): boolean;
  resolve(pending: PendingDecision): Promise<DecisionOption | null>;
}

export const BAResolutionTier = function(
  this: IBAResolutionTier,
  modelRouter?: ModelRouter,
) {
  this._modelRouter = modelRouter;
} as unknown as {
  new(modelRouter?: ModelRouter): IBAResolutionTier;
};
