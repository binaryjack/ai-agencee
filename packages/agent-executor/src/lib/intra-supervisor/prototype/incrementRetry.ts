import type { IIntraSupervisor } from '../intra-supervisor.js';

export function incrementRetry(this: IIntraSupervisor, checkpointId: string): void {
  const current = this._retryCounters.get(checkpointId) ?? 0;
  this._retryCounters.set(checkpointId, current + 1);
}
