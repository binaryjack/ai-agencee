import type { IChatRenderer } from '../chat-renderer.js';
import { dim } from '../chat-renderer.js';

export function system(this: IChatRenderer, text: string): void {
  console.log(dim(`  ? ${text}`));
}
