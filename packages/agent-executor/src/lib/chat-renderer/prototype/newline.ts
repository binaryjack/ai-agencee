import type { IChatRenderer } from '../chat-renderer.js';

export function newline(this: IChatRenderer): void {
  console.log('');
}
