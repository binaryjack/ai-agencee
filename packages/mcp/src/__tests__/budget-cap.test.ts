import type { CostSummary } from '@ai-agencee/engine'
import { BudgetExceededError, CostAccumulator } from '@ai-agencee/engine'

type MakeResponseInput = {
  inputTokens: number
  outputTokens: number
  estimatedCostUSD: number
  naiveCostUSD: number
}

const makeResponse = ({ inputTokens, outputTokens, estimatedCostUSD, naiveCostUSD }: MakeResponseInput) =>
  ({
    content: '',
    usage: { inputTokens, outputTokens },
    estimatedCostUSD,
    naiveCostUSD,
    taskType: 'general',
  } as never)

const makeOnLlmResponse = (maxCostUsd: number, accumulator: ReturnType<typeof CostAccumulator>) =>
  (response: ReturnType<typeof makeResponse>): void => {
    accumulator.record(response)
    const running = accumulator.total().estimatedCostUSD
    if (maxCostUsd > 0 && running > maxCostUsd) {
      throw new BudgetExceededError(accumulator.total(), maxCostUsd)
    }
  }

describe('budget-cap onLlmResponse callback', () => {
  it('throws BudgetExceededError when running cost exceeds maxCostUsd', () => {
    const acc = CostAccumulator()
    const onLlmResponse = makeOnLlmResponse(0.005, acc)
    onLlmResponse(makeResponse({ inputTokens: 100, outputTokens: 50, estimatedCostUSD: 0.003, naiveCostUSD: 0.010 }))
    let caught: unknown
    try {
      onLlmResponse(makeResponse({ inputTokens: 100, outputTokens: 50, estimatedCostUSD: 0.004, naiveCostUSD: 0.010 }))
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
    expect((caught as Error).name).toBe('BudgetExceededError')
  })

  it('BudgetExceededError carries final CostSummary', () => {
    const acc = CostAccumulator()
    const onLlmResponse = makeOnLlmResponse(0.001, acc)
    let caught: unknown
    try {
      onLlmResponse(makeResponse({ inputTokens: 200, outputTokens: 100, estimatedCostUSD: 0.002, naiveCostUSD: 0.005 }))
    } catch (e) {
      caught = e
    }
    const err = caught as { name: string; summary: CostSummary; capUSD: number }
    expect(err.name).toBe('BudgetExceededError')
    expect(err.summary.estimatedCostUSD).toBeCloseTo(0.002)
    expect(err.capUSD).toBe(0.001)
  })

  it('no exception when maxCostUsd = 0 (no cap)', () => {
    const acc = CostAccumulator()
    const onLlmResponse = makeOnLlmResponse(0, acc)
    expect(() => {
      for (let i = 0; i < 10; i++) {
        onLlmResponse(makeResponse({ inputTokens: 1000, outputTokens: 500, estimatedCostUSD: 1.0, naiveCostUSD: 2.0 }))
      }
    }).not.toThrow()
  })
})
