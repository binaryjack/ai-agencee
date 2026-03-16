import type { IChatRenderer } from '../chat-renderer.js';
import { c } from '../chat-renderer.js';

export function error(this: IChatRenderer, text: string): void {
  console.log(`  ${c('brightRed', '?')}  ${c('brightRed', text)}`);
}
