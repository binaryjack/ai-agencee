import type { ActorId, DiscoveryResult } from '../../plan-types.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';

export async function _agentIntroduction(
  this:      IPlanSynthesizer,
  agent:     ActorId,
  discovery: DiscoveryResult,
): Promise<string> {
  if (this._modelRouter) {
    try {
      const reg      = await this._ensurePromptRegistry();
      const resolved = reg.resolve('plan-agent-intro', 'haiku');
      const systemPrompt = resolved?.systemPrompt
        ?? (
          'You are roleplaying as a software development agent. '
          + 'Write ONE sentence (20-40 words) introducing yourself and what you will contribute '
          + 'to this specific project. Be specific about the project, not generic. No markdown.'
        );

      const resp = await this._modelRouter.route('file-analysis', {
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role:    'user',
            content: `Agent role: ${agent}\nProject: ${discovery.projectName}\nProblem: ${discovery.problem}\nStack: ${discovery.stackConstraints || 'not specified'}\nLayers: ${discovery.layers.join(', ')}`,
          },
        ],
        maxTokens: resolved?.frontmatter.maxTokens ?? 80,
      });
      const text = resp.content.trim();
      if (text.length > 10) return text;
    } catch { /* fall through */ }
  }
  return 'Ready to contribute to this plan.';
}
