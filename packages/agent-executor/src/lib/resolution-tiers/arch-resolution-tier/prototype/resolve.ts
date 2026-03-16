import type { DecisionOption, PendingDecision } from '../../resolution-tiers.types.js';
import type { IArchResolutionTier } from '../arch-resolution-tier.js';

export async function resolve(this: IArchResolutionTier, pending: PendingDecision): Promise<DecisionOption | null> {
  const opts = pending.options;

  if (this._modelRouter) {
    try {
      const optList = opts.map((o, i) =>
        `${String.fromCharCode(65 + i)}) ${o.label}: ${o.description} \u2014 ${o.implications}`,
      ).join('\n');

      const resp = await this._modelRouter.route('hard-barrier-resolution', {
        messages: [
          {
            role: 'system',
            content:
              'You are a senior software architect. Analyse the technical trade-offs and pick '
              + 'the best option for a production system. Reply with ONLY the option letter (A/B/C/D). '
              + 'No explanation.',
          },
          {
            role: 'user',
            content:
              `Decision: ${pending.question}\n`
              + `Context: ${pending.context}\n\n`
              + `Options:\n${optList}`,
          },
        ],
        maxTokens: 10,
      });

      const ans = resp.content.trim().toUpperCase();
      const idx = ans.charCodeAt(0) - 65;
      if (idx >= 0 && idx < opts.length) return opts[idx];
    } catch {
      // fall through to heuristic
    }
  }

  const signals = ['standard', 'acid', 'scale', 'type-safe', 'relational', 'familiar', 'production'];
  const scored  = opts.map((opt) => {
    const text  = `${opt.label} ${opt.description} ${opt.implications}`.toLowerCase();
    const score = signals.filter((s) => text.includes(s)).length;
    return { opt, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].opt : null;
}
