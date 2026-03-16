import type { IChatRenderer } from '../../chat-renderer/index.js';
import type { IModelRouter } from '../../model-router/index.js';
import type { DecisionOption, PendingDecision, ResolutionTier } from '../resolution-tiers.types.js';
import { canHandle, resolve } from './prototype/methods.js';

export interface IPOEscalationTier extends ResolutionTier {
  new(renderer: IChatRenderer, modelRouter?: IModelRouter): IPOEscalationTier;
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
} as unknown as IPOEscalationTier;

Object.assign((POEscalationTier as Function).prototype, {
  canHandle,
  resolve,
});
