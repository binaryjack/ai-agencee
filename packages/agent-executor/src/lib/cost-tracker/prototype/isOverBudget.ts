import type { ICostTracker } from '../cost-tracker.js';

export function isOverBudget(this: ICostTracker): boolean {
  return this._budgetTriggered;
}
