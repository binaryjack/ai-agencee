import type { ICostTracker } from '../cost-tracker.js';

export function formatReport(this: ICostTracker): string {
  const s = this.summary();
  const lines: string[] = [
    `💰 Cost Report — Run ${this._runId}`,
    `   Actual: $${s.totalCostUSD.toFixed(5)} USD  ` +
      `(${s.totalInputTokens.toLocaleString()} in / ${s.totalOutputTokens.toLocaleString()} out tokens)`,
    `   Naive:  $${s.totalNaiveCostUSD.toFixed(5)} USD  (opus-tier baseline)`,
    `   Saved:  $${s.totalSavingsUSD.toFixed(5)} USD  (${s.savingsRatePct.toFixed(1)}% via smart routing)`,
    '',
    '   By lane:',
    ...Object.values(s.byLane).map(
      (l) =>
        `     ${l.laneId.padEnd(20)} $${l.totalCostUSD.toFixed(5)}  (${l.callCount} call${l.callCount === 1 ? '' : 's'})`,
    ),
    '',
    '   By task type:',
    ...Object.entries(s.byTaskType).map(
      ([t, d]) =>
        `     ${t.padEnd(28)} $${d.costUSD.toFixed(5)}  (${d.calls} call${d.calls === 1 ? '' : 's'})`,
    ),
  ];

  if (s.budgetExceeded) {
    lines.push('', `   ⚠️  Budget cap of $${s.budgetCapUSD} USD EXCEEDED`);
  }

  return lines.join('\n');
}
