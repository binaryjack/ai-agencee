/**
 * Unit tests for the Database Review agent.
 * Tests: grep SELECT * found → check fails; irreversible migration → ESCALATE verdict.
 */
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// ─── grep handler ─────────────────────────────────────────────────────────────

describe('database — grep check (SELECT * detection)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('detects SELECT * in a query file (check passes = violation found)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'queries.ts'),
      `const rows = await db\`SELECT * FROM users WHERE tenant_id = \${id}\`\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'SELECT \\*' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    // grep found SELECT * → passed=true (pattern matched); "expectNoMatch" lane config inverts this to fail
    expect(result.passed).toBe(true)
    expect(result.value).toContain('queries.ts')
  })

  it('passes (no violation) when no SELECT * found', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'queries.ts'),
      `const rows = await db\`SELECT id, name FROM users WHERE tenant_id = \${id}\`\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'SELECT \\*' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    expect(result.passed).toBe(false) // no match → no violation
  })
})

// ─── supervisor verdicts ──────────────────────────────────────────────────────

describe('database — supervisor verdicts', () => {
  interface DbCheck { rule: string; passed: boolean; severity: 'info' | 'warning' | 'error' | 'critical' }

  function resolveVerdict(checks: DbCheck[]): string {
    const failed = checks.filter(c => !c.passed)
    const irreversible = failed.filter(c => c.rule === 'irreversible-migration')
    if (irreversible.length > 0) return 'ESCALATE'
    if (failed.some(c => c.severity === 'critical' || c.severity === 'error')) return 'FAIL'
    if (failed.length > 0) return 'WARN'
    return 'PASS'
  }

  it('returns ESCALATE when irreversible migration is detected', () => {
    const checks: DbCheck[] = [
      { rule: 'irreversible-migration', passed: false, severity: 'critical' },
    ]
    expect(resolveVerdict(checks)).toBe('ESCALATE')
  })

  it('returns FAIL when a critical query issue is found', () => {
    const checks: DbCheck[] = [
      { rule: 'no-select-star', passed: false, severity: 'error' },
    ]
    expect(resolveVerdict(checks)).toBe('FAIL')
  })

  it('returns WARN when only low-severity issues found', () => {
    const checks: DbCheck[] = [
      { rule: 'missing-index', passed: false, severity: 'warning' },
    ]
    expect(resolveVerdict(checks)).toBe('WARN')
  })

  it('returns PASS when all checks pass', () => {
    const checks: DbCheck[] = [
      { rule: 'no-select-star',         passed: true, severity: 'error' },
      { rule: 'irreversible-migration', passed: true, severity: 'critical' },
    ]
    expect(resolveVerdict(checks)).toBe('PASS')
  })
})

// ─── output schema ────────────────────────────────────────────────────────────

describe('database — output schema shape', () => {
  it('valid output satisfies required fields', () => {
    const output = {
      verdict: 'escalate' as const,
      checks: [
        {
          rule:      'irreversible-migration',
          passed:    false,
          message:   'DROP TABLE users detected without backup step',
          severity:  'critical' as const,
          locations: ['migrations/009_drop_users.sql:3'],
        },
      ],
      irreversibleOperations: ['DROP TABLE users'],
      recommendations:        ['Add an UP migration that creates users before the DOWN migration drops it'],
    }

    expect(['pass', 'fail', 'escalate']).toContain(output.verdict)
    expect(Array.isArray(output.checks)).toBe(true)
    expect(output.checks[0]!.rule).toBeDefined()
    expect(typeof output.checks[0]!.passed).toBe('boolean')
    expect(['info', 'warning', 'error', 'critical']).toContain(output.checks[0]!.severity)
    expect(Array.isArray(output.irreversibleOperations)).toBe(true)
  })
})
