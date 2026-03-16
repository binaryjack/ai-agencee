import type { IDagBuilder } from '../dag-builder.js';

export function dagBudget(this: IDagBuilder, usd: number): IDagBuilder {
  this._budgetUSD = usd;
  return this;
}
