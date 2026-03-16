import type { RoutedResponse } from '../../model-router/index.js';
import type { ICostTracker } from '../cost-tracker.js';

export function record(
  this: ICostTracker,
  laneId:       string,
  checkpointId: string,
  response:     RoutedResponse,
): void {
  this._calls.push({
    timestamp:        new Date().toISOString(),
    laneId,
    checkpointId,
    taskType:         response.taskType,
    provider:         response.provider,
    model:            response.model,
    inputTokens:      response.usage.inputTokens,
    outputTokens:     response.usage.outputTokens,
    estimatedCostUSD: response.estimatedCostUSD,
    naiveCostUSD:     response.naiveCostUSD,
  });

  if (
    !this._budgetTriggered &&
    this._budgetCapUSD !== undefined &&
    this.totalCost() >= this._budgetCapUSD
  ) {
    this._budgetTriggered = true;
    this._onBudgetExceeded?.();
  }
}
