import type { DiscoveryResult } from '../../plan-types.js';
import { IDiscoverySession } from '../discovery-session.js';

export async function _synthesizeInsights(
  this: IDiscoverySession,
  result: DiscoveryResult,
): Promise<string | null> {
  if (!this._modelRouter) return null;
  try {
    const resp = await this._modelRouter.route('api-design', {
      messages: [
        {
          role:    'system',
          content: 'You are a senior Business Analyst reviewing a completed project discovery. '
            + 'Based on the discovery document, identify 2-3 key risks or open questions '
            + 'that the team should address early. Be specific and actionable. '
            + 'Format as a short numbered list. No markdown headers.',
        },
        {
          role:    'user',
          content: `Discovery document:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
      maxTokens: 300,
    });
    const text = resp.content.trim();
    return text.length > 10 ? `Key insights from discovery:\n${text}` : null;
  } catch {
    return null;
  }
}
