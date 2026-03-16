import type { IChatRenderer } from '../chat-renderer.js';

export function _wrap(this: IChatRenderer, text: string, max: number): string[] {
  if (!text) return [''];
  const words   = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
