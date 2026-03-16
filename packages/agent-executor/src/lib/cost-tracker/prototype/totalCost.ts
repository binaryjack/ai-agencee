import type { ICostTracker } from '../cost-tracker.js';

export function totalCost(this: ICostTracker): number {
  return this._calls.reduce((sum, c) => sum + c.estimatedCostUSD, 0);
}
