/**
 * Unit tests for dag-linter (LINT001–LINT007)
 *
 * No external I/O — lintDag is a pure function.
 */

import type { DagDefinition } from '../lib/dag-types.js'
import { lintDag } from '../lib/dag-linter.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLane(
  id: string,
  overrides: Record<string, unknown> = {},
): DagDefinition['lanes'][number] {
  return {
    id,
    agentFile:  `agents/${id}.agent.json`,
    dependsOn:  [],
    checkpoints: [],
    ...overrides,
  } as unknown as DagDefinition['lanes'][number]
}

function makeDag(overrides: Partial<DagDefinition> = {}): DagDefinition {
  return {
    name:        'test-dag',
    description: 'A test DAG',
    lanes:       [],
    ...overrides,
  }
}

// ─── LINT001: opus model tier warning ─────────────────────────────────────────

describe('LINT001 — opus model tier', () => {
  it('emits a warning when a lane uses an opus modelTier', () => {
    const dag = makeDag({
      lanes: [makeLane('lane-1', { modelTier: 'claude-opus-latest', checks: ['check-1'] })],
    })
    const results = lintDag(dag)
    const l001 = results.filter(r => r.code === 'LINT001')
    expect(l001).toHaveLength(1)
    expect(l001[0].severity).toBe('warning')
    expect(l001[0].laneId).toBe('lane-1')
  })

  it('does not emit LINT001 for a non-opus model tier', () => {
    const dag = makeDag({
      lanes: [makeLane('lane-1', { modelTier: 'gpt-4o', checks: ['check-1'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT001')).toBeUndefined()
  })
})

// ─── LINT002: parallel lanes without barrier ──────────────────────────────────

describe('LINT002 — parallel lanes share no barrier', () => {
  it('emits a warning when multiple root lanes share no barrier', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    const l002 = results.filter(r => r.code === 'LINT002')
    expect(l002).toHaveLength(1)
    expect(l002[0].severity).toBe('warning')
  })

  it('does not emit LINT002 when a barrier covers parallel lanes', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { checks: ['c'] }),
      ],
      globalBarriers: [{ name: 'sync', participants: ['lane-a', 'lane-b'] }],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT002')).toBeUndefined()
  })

  it('does not emit LINT002 when there is only one root lane', () => {
    const dag = makeDag({
      lanes: [makeLane('lane-a', { checks: ['c'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT002')).toBeUndefined()
  })
})

// ─── LINT003: lane has no checks ─────────────────────────────────────────────

describe('LINT003 — lane has no checks', () => {
  it('emits an info when a lane has no checks array', () => {
    const dag = makeDag({
      lanes: [makeLane('lane-1')],
    })
    const results = lintDag(dag)
    const l003 = results.filter(r => r.code === 'LINT003')
    expect(l003).toHaveLength(1)
    expect(l003[0].severity).toBe('info')
    expect(l003[0].laneId).toBe('lane-1')
  })

  it('does not emit LINT003 when a lane has at least one check', () => {
    const dag = makeDag({
      lanes: [makeLane('lane-1', { checks: ['some-check'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT003')).toBeUndefined()
  })
})

// ─── LINT004: barrier with only one participant ───────────────────────────────

describe('LINT004 — barrier with single participant', () => {
  it('emits a warning when a barrier has only 1 participant', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { checks: ['c'] }),
      ],
      globalBarriers: [
        { name: 'orphan-barrier', participants: ['lane-a'] },
        { name: 'real-barrier',   participants: ['lane-a', 'lane-b'] },
      ],
    })
    const results = lintDag(dag)
    const l004 = results.filter(r => r.code === 'LINT004')
    expect(l004).toHaveLength(1)
    expect(l004[0].severity).toBe('warning')
    expect(l004[0].message).toContain('orphan-barrier')
  })

  it('does not emit LINT004 when all barriers have 2+ participants', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { checks: ['c'] }),
      ],
      globalBarriers: [{ name: 'sync', participants: ['lane-a', 'lane-b'] }],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT004')).toBeUndefined()
  })
})

// ─── LINT005: dependsOn references non-existent lane ─────────────────────────

describe('LINT005 — dangling dependency', () => {
  it('emits an error when a lane depends on a missing lane', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { dependsOn: ['ghost-lane'], checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    const l005 = results.filter(r => r.code === 'LINT005')
    expect(l005).toHaveLength(1)
    expect(l005[0].severity).toBe('error')
    expect(l005[0].laneId).toBe('lane-b')
    expect(l005[0].message).toContain('ghost-lane')
  })

  it('does not emit LINT005 when all dependencies exist', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { dependsOn: ['lane-a'], checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT005')).toBeUndefined()
  })
})

// ─── LINT006: circular dependency ────────────────────────────────────────────

describe('LINT006 — circular dependency', () => {
  it('emits an error for a direct cycle (A → B → A)', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { dependsOn: ['lane-b'], checks: ['c'] }),
        makeLane('lane-b', { dependsOn: ['lane-a'], checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    const l006 = results.filter(r => r.code === 'LINT006')
    expect(l006.length).toBeGreaterThanOrEqual(1)
    expect(l006[0].severity).toBe('error')
  })

  it('emits an error for a three-node cycle (A → B → C → A)', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { dependsOn: ['lane-c'], checks: ['c'] }),
        makeLane('lane-b', { dependsOn: ['lane-a'], checks: ['c'] }),
        makeLane('lane-c', { dependsOn: ['lane-b'], checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    const l006 = results.filter(r => r.code === 'LINT006')
    expect(l006.length).toBeGreaterThanOrEqual(1)
  })

  it('does not emit LINT006 for a valid linear DAG', () => {
    const dag = makeDag({
      lanes: [
        makeLane('lane-a', { checks: ['c'] }),
        makeLane('lane-b', { dependsOn: ['lane-a'], checks: ['c'] }),
        makeLane('lane-c', { dependsOn: ['lane-b'], checks: ['c'] }),
      ],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT006')).toBeUndefined()
  })
})

// ─── LINT007: no business-analyst lane ────────────────────────────────────────

describe('LINT007 — no business-analyst lane', () => {
  it('emits an info when no BA lane is present', () => {
    const dag = makeDag({
      lanes: [makeLane('backend', { checks: ['c'] })],
    })
    const results = lintDag(dag)
    const l007 = results.filter(r => r.code === 'LINT007')
    expect(l007).toHaveLength(1)
    expect(l007[0].severity).toBe('info')
  })

  it('does not emit LINT007 when a lane id contains "business-analyst"', () => {
    const dag = makeDag({
      lanes: [makeLane('business-analyst', { checks: ['c'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT007')).toBeUndefined()
  })

  it('does not emit LINT007 when a lane has role = "business-analyst"', () => {
    const dag = makeDag({
      lanes: [makeLane('ba-lane', { role: 'business-analyst', checks: ['c'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT007')).toBeUndefined()
  })

  it('does not emit LINT007 when agentFile includes "business-analyst"', () => {
    const dag = makeDag({
      lanes: [makeLane('ba', { agentFile: 'agents/01-business-analyst.agent.json', checks: ['c'] })],
    })
    const results = lintDag(dag)
    expect(results.find(r => r.code === 'LINT007')).toBeUndefined()
  })
})

// ─── Combined: clean DAG should emit only low-severity lint ───────────────────

describe('clean DAG', () => {
  it('emits no errors for a well-formed DAG with BA lane', () => {
    const dag = makeDag({
      lanes: [
        makeLane('business-analyst', { checks: ['requirements'], role: 'business-analyst' }),
        makeLane('backend',  { dependsOn: ['business-analyst'], checks: ['unit-tests'] }),
        makeLane('frontend', { dependsOn: ['business-analyst'], checks: ['unit-tests'] }),
      ],
      globalBarriers: [{ name: 'qa-sync', participants: ['backend', 'frontend'] }],
    })
    const results = lintDag(dag)
    const errors = results.filter(r => r.severity === 'error')
    expect(errors).toHaveLength(0)
  })
})
