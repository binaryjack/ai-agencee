import type { ChecklistDisplayItem } from '../../plan-types.js';
import { ACTORS } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { bold, c, dim } from '../chat-renderer.js';

export function checklist(
  this: IChatRenderer,
  title: string,
  items: ChecklistDisplayItem[],
): void {
  this.separator();
  console.log(`  ${bold(c('cyan', `?? ${title}`))}`);
  this.separator();
  for (const item of items) {
    const actor  = ACTORS[item.owner];
    const actorTag = dim(`[${actor.label}]`);
    const icon     = this._statusIcon(item.status);
    const text     = item.status === 'answered' ? dim(item.text) : item.text;
    console.log(`  ${icon}  ${actorTag}  ${text}`);
    if (item.answer && item.status === 'answered') {
      console.log(`       ${dim(`? ${item.answer}`)}`);
    }
  }
  this.separator();
  const done  = items.filter((i) => i.status === 'answered').length;
  const total = items.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar   = this._progressBar(pct, 30);
  console.log(`  ${bar}  ${c('gray', `${done}/${total} resolved`)}`);
  this.separator();
  console.log('');
}
