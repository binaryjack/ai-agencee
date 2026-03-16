import type { PendingDecision } from '../../resolution-tiers.types.js'
import type { IArchResolutionTier } from '../arch-resolution-tier.js'

export function canHandle(this: IArchResolutionTier, pending: PendingDecision): boolean {
  return (
    pending.raisedBy === 'architecture' ||
    pending.affectedActors.includes('architecture')
  );
}
