import { BudgetExceededError, CostAccumulator } from '../cost-accumulator/cost-accumulator.js'
import type { RoutedResponse } from '../model-router/model-router.types.js'

const makeResponse = (
  inputTokens: number,
  outputTokens: number,
  estimatedCostUSD: number,
  naiveCostUSD: number,
): RoutedResponse =>
  ({
    content: '',
    usage: { inputTokens, outputTokens },
    estimatedCostUSD,
    naiveCostUSD,
    taskType: 'general' as const,
  } as unknown as RoutedResponse)

describe('CostAccumulator', () => {
  it('starts with all-zero totals', () => {
    const acc = CostAccumulator()
    const summary = acc.total()
    expect(summary.inputTokens).toBe(0)
    expect(summary.outputTokens).toBe(0)
    expect(summary.estimatedCostUSD).toBe(0)
    expect(summary.naiveCostUSD).toBe(0)
    expect(summary.savingsUSD).toBe(0)
    expect(summary.callCount).toBe(0)
  })

  it('record() increments all fields correctly', () => {
    const acc = CostAccumulator()
    acc.record(makeResponse(100, 50, 0.001, 0.005))
    const summary = acc.total()
    expect(summary.inputTokens).toBe(100)
    expect(summary.outputTokens).toBe(50)
    expect(summary.estimatedCostUSD).toBe(0.001)
    expect(summary.naiveCostUSD).toBe(0.005)
  })

  it('total() savingsUSD = naiveCostUSD - estimatedCostUSD', () => {
    const acc = CostAccumulator()
    acc.record(makeResponse(100, 50, 0.002, 0.010))
    const summary = acc.total()
    expect(summary.savingsUSD).toBeCloseTo(0.008)
  })

  it('multiple record() calls accumulate correctly', () => {
    const acc = CostAccumulator()
    acc.record(makeResponse(100, 50, 0.001, 0.005))
    acc.record(makeResponse(200, 80, 0.002, 0.010))
    const summary = acc.total()
    expect(summary.inputTokens).toBe(300)
    expect(summary.outputTokens).toBe(130)
    expect(summary.estimatedCostUSD).toBeCloseTo(0.003)
    expect(summary.naiveCostUSD).toBeCloseTo(0.015)
  })

  it('total() callCount matches number of record() calls', () => {
    const acc = CostAccumulator()
    acc.record(makeResponse(10, 5, 0.001, 0.002))
    acc.record(makeResponse(10, 5, 0.001, 0.002))
    acc.record(makeResponse(10, 5, 0.001, 0.002))
    expect(acc.total().callCount).toBe(3)
  })

  it('reset() returns all fields to zero', () => {
    const acc = CostAccumulator()
    acc.record(makeResponse(100, 50, 0.001, 0.005))
    acc.reset()
    const summary = acc.total()
    expect(summary.inputTokens).toBe(0)
    expect(summary.outputTokens).toBe(0)
    expect(summary.estimatedCostUSD).toBe(0)
    expect(summary.naiveCostUSD).toBe(0)
    expect(summary.savingsUSD).toBe(0)
    expect(summary.callCount).toBe(0)
  })
})

describe('BudgetExceededError', () => {
  it('carries CostSummary and capUSD', () => {
    const summary = { inputTokens: 100, outputTokens: 50, estimatedCostUSD: 0.05, naiveCostUSD: 0.10, savingsUSD: 0.05, callCount: 1 }
    const err = new BudgetExceededError(summary, 0.03)
    expect(err.name).toBe('BudgetExceededError')
    expect(err['summary']).toEqual(summary)
    expect(err['capUSD']).toBe(0.03)
    expect(err.message).toContain('0.03')
  })

  it('is an instance of Error', () => {
    const summary = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 1, naiveCostUSD: 1, savingsUSD: 0, callCount: 1 }
    const err = new BudgetExceededError(summary, 0.5)
    expect(err instanceof Error).toBe(true)
  })
})
