import { randomUUID } from 'crypto'
import type { ActorId, DecisionOption, PendingDecision } from '../../plan-types.js'
import { ArchResolutionTier } from '../../resolution-tiers/arch-resolution-tier/index.js'
import { BAResolutionTier } from '../../resolution-tiers/ba-resolution-tier/index.js'
import type { ResolutionTier } from '../../resolution-tiers/resolution-tiers.types.js'
import type { ArbiterDecision, IArbiter } from '../arbiter.js'

export async function raise(
  this: IArbiter,
  params: {
    question: string;
    context: string;
    options: DecisionOption[];
    raisedBy: ActorId;
    affectedActors: ActorId[];
    blockedItemIds: string[];
    preferSimple?: boolean;
  },
): Promise<ArbiterDecision> {
  const r = this._renderer;
  const pending: PendingDecision = {
    id: randomUUID(),
    question: params.question,
    context: params.context,
    options: params.options,
    raisedBy: params.raisedBy,
    affectedActors: params.affectedActors,
    blockedItemIds: params.blockedItemIds,
    raisedAt: new Date().toISOString(),
  };

  for (const tier of this._tiers) {
    if (tier.canHandle(pending)) {
      const chosen = await tier.resolve(pending);
      if (chosen !== null) {
        const isBa   = tier instanceof (BAResolutionTier as unknown as new(...args: unknown[]) => ResolutionTier);
        const isArch = tier instanceof (ArchResolutionTier as unknown as new(...args: unknown[]) => ResolutionTier);
        const resolvedBy: ActorId = isBa ? 'ba' : isArch ? 'architecture' : 'user';
        const rationale = isBa
          ? `BA resolved: ${chosen.implications}`
          : isArch
            ? `Architecture decided: ${chosen.implications}`
            : `PO decided: ${chosen.label}`;

        if (isBa) {
          r.say('ba', `I can resolve this: "${params.question}" \u2192 ${chosen.label}`);
          r.system(`Rationale: ${chosen.description} \u2013 ${chosen.implications}`);
          r.newline();
        } else if (isArch) {
          r.say('architecture', `Architecture recommendation: ${chosen.label} \u2013 ${chosen.description}`);
          r.say('ba', `Architecture has resolved this. Proceeding with: ${chosen.label}`);
          r.newline();
        }

        return _record(this, pending, chosen, resolvedBy, rationale);
      }
    }
  }

  throw new Error(`Arbiter: no tier resolved "${params.question}"`);
}

function _record(
  self: IArbiter,
  pending: PendingDecision,
  chosen: DecisionOption,
  resolvedBy: ActorId,
  rationale: string,
): ArbiterDecision {
  const d: ArbiterDecision = {
    id: pending.id,
    question: pending.question,
    raisedBy: pending.raisedBy,
    chosenOption: chosen,
    resolvedBy,
    rationale,
    affectedActors: pending.affectedActors,
    unlockedItems: pending.blockedItemIds,
    resolvedAt: new Date().toISOString(),
  };
  self._decisions.push(d);
  return d;
}
