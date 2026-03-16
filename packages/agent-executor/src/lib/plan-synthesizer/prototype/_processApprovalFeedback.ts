import type { DiscoveryResult, StepDefinition } from '../../plan-types.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';

export async function _processApprovalFeedback(
  this:      IPlanSynthesizer,
  feedback:  string,
  steps:     StepDefinition[],
  discovery: DiscoveryResult,
): Promise<string> {
  if (this._modelRouter) {
    try {
      const reg      = await this._ensurePromptRegistry();
      const resolved = reg.resolve('plan-ba-feedback', 'sonnet');
      const systemPrompt = resolved?.systemPrompt
        ?? (
          'You are a Business Analyst. The user has requested changes to a plan skeleton. '
          + 'Acknowledge the change request, explain what would need to change in the plan, '
          + 'and recommend whether the change requires re-running discovery or can be applied inline. '
          + 'Be concise (2-3 sentences). No markdown.'
        );

      const stepList = steps.map((s) => `${s.id}: ${s.name} — ${s.goal}`).join('\n');
      const resp = await this._modelRouter.route('api-design', {
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role:    'user',
            content: `User change request: "${feedback}"\n\nCurrent plan steps:\n${stepList}\n\nProject context: ${discovery.problem.slice(0, 200)}`,
          },
        ],
        maxTokens: resolved?.frontmatter.maxTokens ?? 200,
      });
      const text = resp.content.trim();
      if (text.length > 10) return text;
    } catch { /* fall through */ }
  }
  return 'Plan modification noted — proceeding with current skeleton. Type "ok" to approve.';
}
