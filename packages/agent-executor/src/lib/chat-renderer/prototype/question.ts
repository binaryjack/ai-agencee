import type { ActorId } from '../../plan-types.js';
import { ACTORS } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { ACTOR_COLOR, bold } from '../chat-renderer.js';

export function question(this: IChatRenderer, actor: ActorId, text: string): void {
  const a = ACTORS[actor];
  const colorize = ACTOR_COLOR[actor];
  const label = colorize(`${a.emoji} [${a.label}]`);
  console.log(`\n${label}  ${bold('?')} ${text}`);
}
