import type { PlanPhase } from '../../plan-types.js';
import type { IChatRenderer } from '../chat-renderer.js';
import { dim, PHASE_META } from '../chat-renderer.js';

export function phaseSummary(
  this: IChatRenderer,
  phase: PlanPhase,
  lines: string[],
): void {
  const meta = PHASE_META[phase];
  console.log('');
  console.log(meta.color(`  ? ${meta.label} ? COMPLETE`));
  for (const l of lines) {
    console.log(`    ${dim(l)}`);
  }
  console.log('');
}
