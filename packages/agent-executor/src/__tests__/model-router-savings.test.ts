/**
 * Unit tests for ModelRouter savings-proof additions (BYOK pivot).
 * Tests cover estimateCost with familyCosts, estimateNaiveCost, and that
 * naiveCostUSD is correctly set on every RoutedResponse.
 *
 * No real HTTP calls — providers are replaced with a MockProvider.
 */

import { ModelRouter } from '../lib/model-router/model-router'
import type { ModelRouterConfig } from '../lib/model-router/model-router.types'
import { MockProvider } from '../lib/providers/mock.provider'

// ─── shared config ────────────────────────────────────────────────────────────

/**
 * Provider config with per-family pricing so haiku/sonnet/opus have distinct costs.
 * Anthropic public pricing (per-million tokens) at the time of writing:
 *   haiku:  in $0.25  out $1.25
 *   sonnet: in $3.00  out $15.00
 *   opus:   in $15.00 out $75.00
 */
const CONFIG: ModelRouterConfig = {
  defaultProvider: 'mock',
  taskProfiles: {
    'file-analysis':          { family: 'haiku',  maxTokens: 1024 },
    'code-generation':        { family: 'sonnet', maxTokens: 4096 },
    'architecture-decision':  { family: 'opus',   maxTokens: 8192 },
  },
  providers: {
    mock: {
      models: { haiku: 'mock-haiku', sonnet: 'mock-sonnet', opus: 'mock-opus' },
      costs:  { inputPerMillion: 15.00, outputPerMillion: 75.00 }, // opus-level fallback
      familyCosts: {
        haiku:  { inputPerMillion: 0.25,  outputPerMillion: 1.25  },
        sonnet: { inputPerMillion: 3.00,  outputPerMillion: 15.00 },
        opus:   { inputPerMillion: 15.00, outputPerMillion: 75.00 },
      },
    },
  },
}

function makeRouter(responses: Record<string, string> = {}): IModelRouter {
  const router = ModelRouter.fromConfig(CONFIG)
  router.registerProvider(new MockProvider(responses))
  return router
}

// workaround: TypeScript resolves IModelRouter from the module but we just use
// the runtime value — cast via unknown is fine in tests.
type IModelRouter = ReturnType<typeof ModelRouter.fromConfig>

// ─── estimateCost ─────────────────────────────────────────────────────────────

describe('ModelRouter.estimateCost()', () => {
  it('uses familyCosts for haiku tier', () => {
    const router = makeRouter()
    // 1 M input + 1 M output at haiku pricing: $0.25 + $1.25 = $1.50
    expect(router.estimateCost(1_000_000, 1_000_000, 'mock', 'haiku')).toBeCloseTo(1.50)
  })

  it('uses familyCosts for sonnet tier', () => {
    const router = makeRouter()
    // 1 M input + 1 M output at sonnet pricing: $3.00 + $15.00 = $18.00
    expect(router.estimateCost(1_000_000, 1_000_000, 'mock', 'sonnet')).toBeCloseTo(18.00)
  })

  it('uses familyCosts for opus tier', () => {
    const router = makeRouter()
    // 1 M input + 1 M output at opus pricing: $15.00 + $75.00 = $90.00
    expect(router.estimateCost(1_000_000, 1_000_000, 'mock', 'opus')).toBeCloseTo(90.00)
  })

  it('falls back to top-level costs when no familyCosts entry for family', () => {
    const configNoFamily: ModelRouterConfig = {
      ...CONFIG,
      providers: {
        mock: {
          models:  CONFIG.providers['mock']!.models,
          costs:   { inputPerMillion: 15.00, outputPerMillion: 75.00 },
          // no familyCosts
        },
      },
    }
    const router = ModelRouter.fromConfig(configNoFamily)
    router.registerProvider(new MockProvider())
    // should use top-level costs regardless of family
    expect(router.estimateCost(1_000_000, 1_000_000, 'mock', 'haiku')).toBeCloseTo(90.00)
  })

  it('returns 0 for unknown provider', () => {
    const router = makeRouter()
    expect(router.estimateCost(1_000_000, 1_000_000, 'nonexistent', 'haiku')).toBe(0)
  })

  it('returns 0 when provider has no costs defined at all', () => {
    const configNoCosts: ModelRouterConfig = {
      ...CONFIG,
      providers: {
        mock: { models: CONFIG.providers['mock']!.models },
      },
    }
    const router = ModelRouter.fromConfig(configNoCosts)
    router.registerProvider(new MockProvider())
    expect(router.estimateCost(1_000_000, 1_000_000, 'mock', 'haiku')).toBe(0)
  })
})

// ─── estimateNaiveCost ────────────────────────────────────────────────────────

describe('ModelRouter.estimateNaiveCost()', () => {
  it('always uses opus tier pricing regardless of actual task type', () => {
    const router = makeRouter()
    // haiku task but naive should be opus price: $15 + $75 = $90
    const naive = router.estimateNaiveCost(1_000_000, 1_000_000, 'mock')
    expect(naive).toBeCloseTo(90.00)
  })

  it('naive === estimateCost(..., "opus")', () => {
    const router = makeRouter()
    const naive   = router.estimateNaiveCost(500_000, 200_000, 'mock')
    const opusCost = router.estimateCost(500_000, 200_000, 'mock', 'opus')
    expect(naive).toBeCloseTo(opusCost)
  })
})

// ─── naiveCostUSD on RoutedResponse ──────────────────────────────────────────

describe('route() — naiveCostUSD on RoutedResponse', () => {
  it('sets naiveCostUSD to opus-tier price of the token counts used', async () => {
    const router = makeRouter({ default: 'response content' })

    const response = await router.route('file-analysis', {
      messages: [{ role: 'user', content: 'list files' }],
    })

    // MockProvider returns 0 tokens, so both costs are 0 — what matters is
    // the field exists and equals the opus estimate for those tokens.
    const expectedNaive = router.estimateNaiveCost(
      response.usage.inputTokens,
      response.usage.outputTokens,
      'mock',
    )
    expect(response.naiveCostUSD).toBeCloseTo(expectedNaive)
    expect(typeof response.naiveCostUSD).toBe('number')
  })

  it('naiveCostUSD >= estimatedCostUSD for sub-opus task types', async () => {
    const router = makeRouter({ default: 'ok' })

    // haiku task — actual cost < naive (opus) cost
    const haiku = await router.route('file-analysis', {
      messages: [{ role: 'user', content: 'x' }],
    })
    expect(haiku.naiveCostUSD).toBeGreaterThanOrEqual(haiku.estimatedCostUSD)
  })

  it('naiveCostUSD === estimatedCostUSD for opus task types (no savings)', async () => {
    const router = makeRouter({ default: 'ok' })

    // opus task — actual cost == naive cost (routing chose top tier anyway)
    const opus = await router.route('architecture-decision', {
      messages: [{ role: 'user', content: 'y' }],
    })
    expect(opus.naiveCostUSD).toBeCloseTo(opus.estimatedCostUSD)
  })
})

// ─── naiveCostUSD via streamRoute / onDone ────────────────────────────────────

describe('streamRoute() — naiveCostUSD in onDone callback', () => {
  it('fires onDone with naiveCostUSD set', async () => {
    const router = makeRouter({ default: 'streamed' })

    let done: import('../lib/model-router/model-router.types').RoutedResponse | undefined
    for await (const _ of router.streamRoute(
      'file-analysis',
      { messages: [{ role: 'user', content: 'go' }] },
      undefined,
      (r) => { done = r },
    )) { /* consume */ }

    expect(done).toBeDefined()
    expect(typeof done!.naiveCostUSD).toBe('number')
    expect(done!.naiveCostUSD).toBeGreaterThanOrEqual(done!.estimatedCostUSD)
  })
})

// ─── routeWithTools — naiveCostUSD ───────────────────────────────────────────

describe('routeWithTools() — naiveCostUSD on RoutedResponse', () => {
  it('includes naiveCostUSD in the response', async () => {
    const router = makeRouter({ default: 'tool response' })
    const executor = jest.fn()

    const response = await router.routeWithTools(
      'code-generation',
      { messages: [{ role: 'user', content: 'build it' }] },
      executor,
    )

    expect(typeof response.naiveCostUSD).toBe('number')
    expect(response.naiveCostUSD).toBeGreaterThanOrEqual(response.estimatedCostUSD)
  })
})

// ─── savings delta ─────────────────────────────────────────────────────────────

describe('savings delta (naiveCostUSD - estimatedCostUSD)', () => {
  it('is positive for a haiku task where familyCosts differ across tiers', () => {
    const router = makeRouter()
    const haikuCost  = router.estimateCost(1_000_000, 1_000_000, 'mock', 'haiku')
    const naiveCost  = router.estimateNaiveCost(1_000_000, 1_000_000, 'mock')
    const savings    = naiveCost - haikuCost
    expect(savings).toBeGreaterThan(0)               // $90 - $1.50 = $88.50
    expect(savings).toBeCloseTo(88.50, 1)
  })

  it('is zero for an opus task (no routing benefit)', () => {
    const router = makeRouter()
    const opusCost  = router.estimateCost(1_000_000, 1_000_000, 'mock', 'opus')
    const naiveCost = router.estimateNaiveCost(1_000_000, 1_000_000, 'mock')
    expect(naiveCost - opusCost).toBeCloseTo(0)
  })
})
