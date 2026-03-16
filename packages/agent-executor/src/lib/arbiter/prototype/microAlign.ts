import type { ActorId } from '../../plan-types.js';
import type { IArbiter } from '../arbiter.js';

export async function microAlign(
  this: IArbiter,
  actorA: ActorId,
  actorB: ActorId,
  topic: string,
  context: string,
): Promise<string> {
  const r = this._renderer;
  r.say('ba', `Micro-alignment: ${topic} \u2014 engaging ${actorA} \u2194 ${actorB}`);

  if (this._modelRouter) {
    try {
      const resp = await this._modelRouter.route('api-design', {
        messages: [
          {
            role: 'system',
            content:
              'You are a Technical Architect facilitating alignment between two software agents. '
              + 'Write 2-3 brief bullet points describing what each agent needs to agree on at their '
              + 'shared boundary. Be concrete and specific to the topic. No markdown headers.',
          },
          {
            role: 'user',
            content: `Agents: ${actorA} and ${actorB}\nTopic: ${topic}\nContext: ${context}`,
          },
        ],
        maxTokens: 200,
      });
      const text = resp.content.trim();
      if (text.length > 10) {
        r.system(text);
        r.newline();
        return `${actorA} \u2194 ${actorB}: ${topic} \u2014 aligned`;
      }
    } catch { /* fall through to heuristic */ }
  }

  r.say(actorA, `Acknowledged. My concern on "${topic}": aligning on shared contract.`);
  r.say(actorB, `Confirmed. I'll consume the output from ${actorA} at this boundary.`);
  r.system(`\u2713 ${actorA} \u2194 ${actorB} aligned on: ${topic}`);
  r.newline();
  return `${actorA} \u2194 ${actorB}: ${topic} \u2013 aligned`;
}
