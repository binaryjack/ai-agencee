import type { PlanPhase } from '../../plan-types.js';
import type { IPlanOrchestrator } from '../plan-orchestrator.js';

export function _shouldRun(this: IPlanOrchestrator, phase: PlanPhase): boolean {
  const order: PlanPhase[] = ['discover', 'synthesize', 'decompose', 'wire', 'execute', 'complete'];
  return order.indexOf(phase) >= order.indexOf(this._options.startFrom);
}
