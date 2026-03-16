import type { IPlanOrchestrator } from '../plan-orchestrator.js';

export function _waitForAnyInput(this: IPlanOrchestrator): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });
}
