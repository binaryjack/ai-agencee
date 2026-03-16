import type { ActorId } from '../../plan-types.js';
import { ACTORS } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { ACTOR_COLOR } from '../chat-renderer.js';

export function say(this: IChatRenderer, actor: ActorId, text: string): void {
  const a = ACTORS[actor];
  const colorize = ACTOR_COLOR[actor];
  const prefix = colorize(`${a.emoji} [${a.label}]`);
  const lines = this._wrap(text, this._width - 14);
  console.log(`${prefix}  ${lines[0]}`);
  for (let i = 1; i < lines.length; i++) {
    console.log(`${''.padStart(14)}${lines[i]}`);
  }
}
