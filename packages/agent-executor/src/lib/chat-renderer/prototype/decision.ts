import type { PendingDecision } from '../../plan-types.js';
import { ACTORS } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { BG_RED, bold, BOLD, c, dim, RESET, WHITE } from '../chat-renderer.js';

export function decision(this: IChatRenderer, d: PendingDecision): void {
  const bar = '?'.repeat(this._width);
  console.log('');
  console.log(`${BG_RED}${WHITE}${BOLD}  ?? DECISION REQUIRED [PO]  ${RESET}`);
  console.log(c('brightRed', bar));
  const lines = this._wrap(d.question, this._width - 4);
  for (const l of lines) {
    console.log(`  ${bold(l)}`);
  }
  console.log('');
  const ctxLines = this._wrap(d.context, this._width - 4);
  for (const l of ctxLines) {
    console.log(`  ${dim(l)}`);
  }
  console.log('');
  d.options.forEach((opt, i) => {
    console.log(`  ${bold(c('brightCyan', `${String.fromCharCode(65 + i)})`))}`
      + `  ${bold(opt.label)}`);
    console.log(`      ${opt.description}`);
    console.log(`      ${dim('? ' + opt.implications)}`);
    console.log('');
  });
  const affected = d.affectedActors.map((a) => `${ACTORS[a].emoji} ${ACTORS[a].label}`).join('  ');
  console.log(`  ${dim(`Affects: ${affected}`)}`);
  console.log(`  ${dim(`Blocking: ${d.blockedItemIds.length} backlog item(s)`)}`);
  console.log(c('brightRed', bar));
  console.log('');
}
