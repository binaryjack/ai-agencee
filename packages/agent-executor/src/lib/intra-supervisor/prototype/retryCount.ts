import type { IIntraSupervisor } from '../intra-supervisor.js';

export function retryCount(this: IIntraSupervisor, checkpointId: string): number {
  return this._retryCounters.get(checkpointId) ?? 0;
}
