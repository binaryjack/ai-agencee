import type { IChatRenderer } from '../chat-renderer.js';
import { c } from '../chat-renderer.js';

export function warn(this: IChatRenderer, text: string): void {
  console.log(`  ${c('yellow', '?')}  ${c('yellow', text)}`);
}
