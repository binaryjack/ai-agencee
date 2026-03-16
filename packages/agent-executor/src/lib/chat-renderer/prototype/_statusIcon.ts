import type { BacklogItem } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { c, dim } from '../chat-renderer.js';

export function _statusIcon(this: IChatRenderer, status: BacklogItem['status']): string {
  switch (status) {
    case 'answered': return c('green', '?');
    case 'blocked':  return c('yellow', '?');
    case 'skipped':  return dim('?');
    default:         return c('gray', '?');
  }
}
