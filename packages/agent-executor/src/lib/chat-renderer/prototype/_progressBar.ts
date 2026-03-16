import type { IChatRenderer } from '../chat-renderer.js';
import { colors, RESET } from '../chat-renderer.js';

export function _progressBar(this: IChatRenderer, pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const bar    = '?'.repeat(filled) + '?'.repeat(width - filled);
  const color  = pct >= 100 ? 'green' : pct >= 50 ? 'cyan' : 'yellow';
  return `${colors[color]}[${bar}]${RESET} ${pct}%`;
}
