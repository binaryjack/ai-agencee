import type { TaskType } from '../llm-provider.js';

export interface CallRecord {
  timestamp:        string;
  laneId:           string;
  checkpointId:     string;
  taskType:         TaskType;
  provider:         string;
  model:            string;
  inputTokens:      number;
  outputTokens:     number;
  estimatedCostUSD: number;
  /** Opus-tier baseline cost for this call — used to compute savings */
  naiveCostUSD:     number;
}

export interface LaneCostSummary {
  laneId:            string;
  totalInputTokens:  number;
  totalOutputTokens: number;
  totalCostUSD:      number;
  callCount:         number;
  byModel:           Record<string, { calls: number; costUSD: number }>;
}

export interface RunCostSummary {
  runId:             string;
  startedAt:         string;
  completedAt?:      string;
  totalCostUSD:      number;
  totalInputTokens:  number;
  totalOutputTokens: number;
  /** Sum of opus-tier baseline costs — what you would have paid without smart routing */
  totalNaiveCostUSD: number;
  /** totalNaiveCostUSD − totalCostUSD */
  totalSavingsUSD:   number;
  /** (totalSavingsUSD / totalNaiveCostUSD) × 100, or 0 when naive is 0 */
  savingsRatePct:    number;
  byLane:            Record<string, LaneCostSummary>;
  byTaskType:        Record<string, { calls: number; costUSD: number }>;
  budgetCapUSD?:     number;
  budgetExceeded:    boolean;
  calls:             CallRecord[];
}
