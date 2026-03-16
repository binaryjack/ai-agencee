import type { StepDefinition } from '../../plan-types.js';
import type { IPlanOrchestrator } from '../plan-orchestrator.js';

export function _topoGroups(
  this:  IPlanOrchestrator,
  steps: StepDefinition[],
): StepDefinition[][] {
  const remaining = new Set(steps.map((s) => s.id));
  const groups: StepDefinition[][] = [];
  const maxIter = steps.length + 1;
  let i = 0;

  while (remaining.size > 0 && i++ < maxIter) {
    const ready = steps.filter(
      (s) => remaining.has(s.id) && s.dependsOn.every((d) => !remaining.has(d)),
    );
    if (ready.length === 0) break;
    groups.push(ready);
    for (const s of ready) remaining.delete(s.id);
  }
  return groups;
}
