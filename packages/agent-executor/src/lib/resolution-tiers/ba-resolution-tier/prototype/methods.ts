import type { DecisionOption, PendingDecision } from '../../resolution-tiers.types.js'
import type { IBAResolutionTier } from '../ba-resolution-tier.js'

export function canHandle(this: IBAResolutionTier, pending: PendingDecision): boolean {
  return pending.options.length >= 1;
}

export async function resolve(this: IBAResolutionTier, pending: PendingDecision): Promise<DecisionOption | null> {
  const opts = pending.options;
  if (opts.length === 0) return null;
  if (opts.length === 1) return opts[0];

  if (this._modelRouter) {
    try {
      const optList = opts.map((o, i) =>
        `${String.fromCharCode(65 + i)}) ${o.label}: ${o.description} — ${o.implications}`,
      ).join('\n');

      const resp = await this._modelRouter.route('validation', {
        messages: [
          {
            role: 'system',
            content:
              'You are a Business Analyst. Given a decision and its options, decide if there is '
              + 'a clearly simplest or most standard option that does NOT require architectural expertise '
              + 'or product input. If yes, reply with ONLY the letter (A/B/C/D). '
              + 'If it requires architectural expertise or product input, reply with exactly: DEFER',
          },
          {
            role: 'user',
            content: `Decision: ${pending.question}\n\nOptions:\n${optList}`,
          },
        ],
        maxTokens: 10,
      });

      const ans = resp.content.trim().toUpperCase();
      if (ans === 'DEFER') return null;
      const idx = ans.charCodeAt(0) - 65;
      if (idx >= 0 && idx < opts.length) return opts[idx];
    } catch {
      // fall through to heuristic
    }
  }

  return null;
}
