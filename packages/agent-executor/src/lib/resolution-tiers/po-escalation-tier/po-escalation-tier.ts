import type { IChatRenderer } from '../../chat-renderer/index.js'
import type { IModelRouter } from '../../model-router/index.js'
import type { DecisionOption, PendingDecision, ResolutionTier } from '../resolution-tiers.types.js'
import './prototype/index.js'

export interface IPOEscalationTier extends ResolutionTier {
  _renderer: IChatRenderer;
  _modelRouter?: IModelRouter;
  canHandle(pending: PendingDecision): boolean;
  resolve(pending: PendingDecision): Promise<DecisionOption | null>;
}

export const POEscalationTier = function(
  this: IPOEscalationTier,
  renderer: IChatRenderer,
  modelRouter?: IModelRouter,
) {
  this._renderer = renderer;
  this._modelRouter = modelRouter;
} as unknown as {
  new(renderer: IChatRenderer, modelRouter?: IModelRouter): IPOEscalationTier;
};
