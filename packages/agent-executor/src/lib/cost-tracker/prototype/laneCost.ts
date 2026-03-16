import type { ICostTracker } from '../cost-tracker.js';

export function laneCost(this: ICostTracker, laneId: string): number {
  return this._calls
    .filter((c) => c.laneId === laneId)
    .reduce((sum, c) => sum + c.estimatedCostUSD, 0);
}
