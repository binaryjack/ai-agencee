import * as path from 'path'
import type { IBacklogBoard } from '../backlog/index.js'
import type { IChatRenderer } from '../chat-renderer/index.js'
import type { IModelRouter } from '../model-router/index.js'
import { PLAN_STATE_DIR } from '../path-constants.js'
import type { ActorId, DecisionOption, PlanDefinition } from '../plan-types.js'
import { ArchResolutionTier } from '../resolution-tiers/arch-resolution-tier/index.js'
import { BAResolutionTier } from '../resolution-tiers/ba-resolution-tier/index.js'
import { POEscalationTier } from '../resolution-tiers/po-escalation-tier/index.js'
import type { ResolutionTier } from '../resolution-tiers/resolution-tiers.types.js'
import './prototype/index.js'

export interface ArbiterDecision {
  id: string;
  question: string;
  raisedBy: ActorId;
  chosenOption: DecisionOption;
  resolvedBy: ActorId;
  rationale: string;
  affectedActors: ActorId[];
  unlockedItems: string[];
  resolvedAt: string;
}

export interface IArbiter {
  _renderer: IChatRenderer;
  _stateDir: string;
  _modelRouter?: IModelRouter;
  _decisions: ArbiterDecision[];
  _tiers: ResolutionTier[];
  raise(params: {
    question: string;
    context: string;
    options: DecisionOption[];
    raisedBy: ActorId;
    affectedActors: ActorId[];
    blockedItemIds: string[];
    preferSimple?: boolean;
  }): Promise<ArbiterDecision>;
  microAlign(actorA: ActorId, actorB: ActorId, topic: string, context: string): Promise<string>;
  getDecisions(): ArbiterDecision[];
  runStandardDecisions(plan: PlanDefinition, board: IBacklogBoard): Promise<void>;
  _save(): void;
}

export const Arbiter = function(
  this: IArbiter,
  renderer: IChatRenderer,
  projectRoot: string,
  modelRouter?: IModelRouter,
  tiers?: ResolutionTier[],
) {
  this._renderer    = renderer;
  this._stateDir    = path.join(projectRoot, PLAN_STATE_DIR);
  this._modelRouter = modelRouter;
  this._decisions   = [];
  this._tiers = tiers ?? [
    new BAResolutionTier(modelRouter),
    new ArchResolutionTier(modelRouter),
    new POEscalationTier(renderer, modelRouter),
  ];
} as unknown as {
  new(
    renderer: IChatRenderer,
    projectRoot: string,
    modelRouter?: IModelRouter,
    tiers?: ResolutionTier[],
  ): IArbiter;
};
