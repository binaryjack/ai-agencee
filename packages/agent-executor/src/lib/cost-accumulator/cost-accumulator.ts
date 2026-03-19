import type { RoutedResponse } from '../model-router/model-router.types.js'
import type { CostSummary, ICostAccumulator } from './cost-accumulator.types.js'

export const CostAccumulator = (): ICostAccumulator => {
  let inputTokens = 0
  let outputTokens = 0
  let cost = 0
  let naive = 0
  let calls = 0

  return {
    record: (r: RoutedResponse): void => {
      inputTokens  += r.usage.inputTokens
      outputTokens += r.usage.outputTokens
      cost         += r.estimatedCostUSD
      naive        += r.naiveCostUSD
      calls++
    },
    total: (): CostSummary => ({
      inputTokens,
      outputTokens,
      estimatedCostUSD: cost,
      naiveCostUSD:     naive,
      savingsUSD:       naive - cost,
      callCount:        calls,
    }),
    reset: (): void => {
      inputTokens = 0
      outputTokens = 0
      cost = 0
      naive = 0
      calls = 0
    },
  }
}

export class BudgetExceededError extends Error {
  declare readonly summary: CostSummary
  declare readonly capUSD: number
  constructor(summary: CostSummary, capUSD: number) {
    super(`Budget cap of $${capUSD} exceeded. Spent: $${summary.estimatedCostUSD.toFixed(4)}`)
    this.name = 'BudgetExceededError'
    Object.assign(this, { summary, capUSD })
  }
}
