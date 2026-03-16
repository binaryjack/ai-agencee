import type { IChatRenderer } from '../chat-renderer.js';
import { bold, c } from '../chat-renderer.js';

export function approvalPrompt(this: IChatRenderer, what: string): void {
  console.log('');
  console.log(`  ${c('cyan', '+')}${'-'.repeat(this._width - 2)}${c('cyan', '+')}`);
  console.log(`  ${c('cyan', '?')}  ${bold('? APPROVAL NEEDED')}${''.padEnd(this._width - 20)}${c('cyan', '?')}`);
  console.log(`  ${c('cyan', '?')}  ${what}${''.padEnd(Math.max(0, this._width - 4 - what.length))}${c('cyan', '?')}`);
  console.log(`  ${c('cyan', '+')}${'-'.repeat(this._width - 2)}${c('cyan', '+')}`);
  console.log('');
}
