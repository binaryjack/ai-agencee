import type { ActorId, DiscoveryResult, StepDefinition } from '../../plan-types.js';
import { buildSteps } from '../plan-synthesizer.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';

export async function _buildStepsWithFallback(
  this:      IPlanSynthesizer,
  discovery: DiscoveryResult,
  agents:    ActorId[],
): Promise<StepDefinition[]> {
  const deterministic = buildSteps(discovery, agents);
  if (!this._modelRouter) return deterministic;

  try {
    const reg      = await this._ensurePromptRegistry();
    const resolved = reg.resolve('plan-architect', 'opus');
    const systemPrompt = resolved?.systemPrompt
      ?? (
        'You are a senior software architect building a project plan skeleton. '
        + 'Given a discovery document, return ONLY a JSON array of step objects. '
        + 'Each object must have these exact keys: id, name, goal, outputs (string[]), parallel (bool). '
        + 'Use these step ids: ' + deterministic.map((s) => s.id).join(', ') + '. '
        + 'Tailor name, goal, and outputs to the specific project. No markdown, no explanation.'
      );

    const resp = await this._modelRouter.route('architecture-decision', {
      messages: [
        {
          role:    'system',
          content: systemPrompt + '\nUse these step ids: ' + deterministic.map((s) => s.id).join(', ') + '.',
        },
        {
          role:    'user',
          content: `Discovery:\n${JSON.stringify(discovery, null, 2)}`,
        },
      ],
      maxTokens: resolved?.frontmatter.maxTokens ?? 800,
    });

    const raw      = resp.content.replace(/```(?:json)?/gi, '').trim();
    const llmSteps = JSON.parse(raw) as Array<{
      id: string; name: string; goal: string; outputs: string[]; parallel: boolean;
    }>;

    return deterministic.map((det) => {
      const llm = llmSteps.find((l) => l.id === det.id);
      if (!llm) return det;
      return {
        ...det,
        name:     llm.name     ?? det.name,
        goal:     llm.goal     ?? det.goal,
        outputs:  llm.outputs  ?? det.outputs,
        parallel: llm.parallel ?? det.parallel,
      };
    });
  } catch {
    return deterministic;
  }
}
