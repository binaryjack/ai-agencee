import type { PendingDecision } from '../../resolution-tiers.types.js';
import type { IPOEscalationTier } from '../po-escalation-tier.js';

export function canHandle(this: IPOEscalationTier, _pending: PendingDecision): boolean {
  return true;
}
