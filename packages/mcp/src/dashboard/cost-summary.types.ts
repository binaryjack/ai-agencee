export interface CostSummary {
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byTaskType?: Record<string, { calls: number; costUSD: number }>;
}
