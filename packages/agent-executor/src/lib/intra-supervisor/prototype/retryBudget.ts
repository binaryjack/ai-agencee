import type { IIntraSupervisor } from '../intra-supervisor.js';

export function retryBudget(this: IIntraSupervisor): number {
  return this._config.retryBudget ?? 3;
}
