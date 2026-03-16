import type { PendingDecision } from '../../resolution-tiers.types.js'
import type { IBAResolutionTier } from '../ba-resolution-tier.js'

export function canHandle(this: IBAResolutionTier, pending: PendingDecision): boolean {
  return pending.options.length >= 1;
}
