import type { PlanPhase } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { bold, dim, PHASE_META } from '../chat-renderer.js';

export function phaseHeader(this: IChatRenderer, phase: PlanPhase): void {
  const meta = PHASE_META[phase];
  const bar = '?'.repeat(this._width);
  console.log('');
  console.log(meta.color(bar));
  console.log(meta.color(`  ${bold(meta.label)}`));
  console.log(meta.color(`  ${dim(meta.desc)}`));
  console.log(meta.color(bar));
  console.log('');
}
