import type { IChatRenderer } from '../chat-renderer.js';
import { dim } from '../chat-renderer.js';

export function separator(this: IChatRenderer, char = '-'): void {
  console.log(dim(char.repeat(this._width)));
}
