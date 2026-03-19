import type { RoutedResponse } from '../model-router/model-router.types.js'

export interface ICostAccumulator {
  record(response: RoutedResponse): void
  total(): CostSummary
  reset(): void
}

export interface CostSummary {
  inputTokens:      number
  outputTokens:     number
  estimatedCostUSD: number
  naiveCostUSD:     number
  savingsUSD:       number
  callCount:        number
}
