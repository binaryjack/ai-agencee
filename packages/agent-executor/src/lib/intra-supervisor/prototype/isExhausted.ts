import type { IIntraSupervisor } from '../intra-supervisor.js';

export function isExhausted(this: IIntraSupervisor, checkpointId: string): boolean {
  const count  = this._retryCounters.get(checkpointId) ?? 0;
  const budget = this._config.retryBudget ?? 3;
  return count >= budget;
}
