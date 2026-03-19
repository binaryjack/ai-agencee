import * as path from 'path'
import {
    AGENCEE_DIR,
    AUDIT_DIR,
    CHECKPOINTS_DIR,
    EXAMPLES_DIR,
    MEMORY_DB_FILE,
    PLAN_STATE_DIR,
    RATE_LIMITS_FILE,
    RBAC_FILE,
    RESULTS_DIR,
    RUNS_DIR,
    TENANTS_DIR,
    agenceePaths,
} from '../path-constants.js'

const ROOT = '/my/project'

describe('path-constants', () => {
  // ─── exported string constants ────────────────────────────────────────────

  it('AGENCEE_DIR is .agencee', () => {
    expect(AGENCEE_DIR).toBe('.agencee')
  })

  it('no constant contains .agents', () => {
    const constants = [
      AGENCEE_DIR, AUDIT_DIR, RBAC_FILE, MEMORY_DB_FILE, PLAN_STATE_DIR,
      RESULTS_DIR, RUNS_DIR, RATE_LIMITS_FILE, TENANTS_DIR, EXAMPLES_DIR, CHECKPOINTS_DIR,
    ]
    for (const c of constants) {
      expect(c).not.toContain('.agents')
    }
  })

  it('all derived constants start with .agencee/', () => {
    const derived = [
      AUDIT_DIR, RBAC_FILE, MEMORY_DB_FILE, PLAN_STATE_DIR,
      RESULTS_DIR, RUNS_DIR, RATE_LIMITS_FILE, TENANTS_DIR, EXAMPLES_DIR, CHECKPOINTS_DIR,
    ]
    for (const c of derived) {
      expect(c.startsWith('.agencee/')).toBe(true)
    }
  })

  // ─── agenceePaths() ───────────────────────────────────────────────────────

  it('agenceePaths returns 11 keys', () => {
    const p = agenceePaths(ROOT)
    expect(Object.keys(p)).toHaveLength(11)
  })

  it('planStateDir contains .agencee', () => {
    const p = agenceePaths(ROOT)
    expect(p.planStateDir).toContain('.agencee')
  })

  it('no path in agenceePaths contains .agents', () => {
    const p = agenceePaths(ROOT)
    for (const v of Object.values(p)) {
      expect(v).not.toContain('.agents')
    }
  })

  it('agenceeDir is projectRoot + .agencee', () => {
    const p = agenceePaths(ROOT)
    expect(p.agenceeDir).toBe(path.join(ROOT, '.agencee'))
  })

  it('auditDir is projectRoot + .agencee/audit', () => {
    const p = agenceePaths(ROOT)
    expect(p.auditDir).toBe(path.join(ROOT, '.agencee', 'audit'))
  })

  it('rbacFile is projectRoot + .agencee/rbac.json', () => {
    const p = agenceePaths(ROOT)
    expect(p.rbacFile).toBe(path.join(ROOT, '.agencee', 'rbac.json'))
  })

  it('memoryDb is projectRoot + .agencee/memory.db', () => {
    const p = agenceePaths(ROOT)
    expect(p.memoryDb).toBe(path.join(ROOT, '.agencee', 'memory.db'))
  })

  it('planStateDir is projectRoot + .agencee/plan-state', () => {
    const p = agenceePaths(ROOT)
    expect(p.planStateDir).toBe(path.join(ROOT, '.agencee', 'plan-state'))
  })

  it('resultsDir is projectRoot + .agencee/results', () => {
    const p = agenceePaths(ROOT)
    expect(p.resultsDir).toBe(path.join(ROOT, '.agencee', 'results'))
  })

  it('runsDir is projectRoot + .agencee/runs', () => {
    const p = agenceePaths(ROOT)
    expect(p.runsDir).toBe(path.join(ROOT, '.agencee', 'runs'))
  })

  it('rateLimitsFile is projectRoot + .agencee/rate-limits.json', () => {
    const p = agenceePaths(ROOT)
    expect(p.rateLimitsFile).toBe(path.join(ROOT, '.agencee', 'rate-limits.json'))
  })

  it('tenantsDir is projectRoot + .agencee/tenants', () => {
    const p = agenceePaths(ROOT)
    expect(p.tenantsDir).toBe(path.join(ROOT, '.agencee', 'tenants'))
  })

  it('examplesDir is projectRoot + .agencee/examples', () => {
    const p = agenceePaths(ROOT)
    expect(p.examplesDir).toBe(path.join(ROOT, '.agencee', 'examples'))
  })

  it('checkpointsDir is projectRoot + .agencee/checkpoints', () => {
    const p = agenceePaths(ROOT)
    expect(p.checkpointsDir).toBe(path.join(ROOT, '.agencee', 'checkpoints'))
  })

  it('all 12 derived paths have correct structure under .agencee/', () => {
    const p = agenceePaths(ROOT)
    const values = Object.values(p)
    expect(values).toHaveLength(11)
    for (const v of values) {
      expect(v.includes('agencee')).toBe(true)
      expect(v.includes(path.basename(ROOT))).toBe(true)
    }
  })
})
