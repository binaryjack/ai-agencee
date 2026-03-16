import type { ICostTracker } from '../cost-tracker.js';
import type { LaneCostSummary, RunCostSummary } from '../cost-tracker.types.js';

export function summary(this: ICostTracker): RunCostSummary {
  const byLane:     Record<string, LaneCostSummary>              = {};
  const byTaskType: Record<string, { calls: number; costUSD: number }> = {};

  for (const call of this._calls) {
    if (!byLane[call.laneId]) {
      byLane[call.laneId] = {
        laneId:            call.laneId,
        totalInputTokens:  0,
        totalOutputTokens: 0,
        totalCostUSD:      0,
        callCount:         0,
        byModel:           {},
      };
    }
    const lane = byLane[call.laneId]!;
    lane.totalInputTokens  += call.inputTokens;
    lane.totalOutputTokens += call.outputTokens;
    lane.totalCostUSD      += call.estimatedCostUSD;
    lane.callCount++;

    if (!lane.byModel[call.model]) lane.byModel[call.model] = { calls: 0, costUSD: 0 };
    lane.byModel[call.model]!.calls++;
    lane.byModel[call.model]!.costUSD += call.estimatedCostUSD;

    if (!byTaskType[call.taskType]) byTaskType[call.taskType] = { calls: 0, costUSD: 0 };
    byTaskType[call.taskType]!.calls++;
    byTaskType[call.taskType]!.costUSD += call.estimatedCostUSD;
  }

  const totalC     = this.totalCost();
  const totalNaive = this._calls.reduce((s, c) => s + c.naiveCostUSD, 0);
  const savings    = totalNaive - totalC;

  return {
    runId:             this._runId,
    startedAt:         this._startedAt,
    completedAt:       new Date().toISOString(),
    totalCostUSD:      totalC,
    totalNaiveCostUSD: totalNaive,
    totalSavingsUSD:   savings,
    savingsRatePct:    totalNaive > 0 ? (savings / totalNaive) * 100 : 0,
    totalInputTokens:  this._calls.reduce((s, c) => s + c.inputTokens, 0),
    totalOutputTokens: this._calls.reduce((s, c) => s + c.outputTokens, 0),
    byLane,
    byTaskType,
    budgetCapUSD:   this._budgetCapUSD,
    budgetExceeded: this._budgetCapUSD !== undefined && totalC >= this._budgetCapUSD,
    calls:          this._calls,
  };
}
