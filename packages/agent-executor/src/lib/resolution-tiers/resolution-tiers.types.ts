import type { DecisionOption, PendingDecision } from '../plan-types.js'

export interface ResolutionTier {
  canHandle(pending: PendingDecision): boolean;
  resolve(pending: PendingDecision): Promise<DecisionOption | null>;
}

export type { DecisionOption, PendingDecision }

