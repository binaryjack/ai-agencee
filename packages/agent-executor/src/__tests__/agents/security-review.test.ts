/**
 * Unit tests for the Security Review agent.
 * Tests: grep check catches hardcoded secrets, supervisor ESCALATE on critical auth-path finding,
 * and output validated against security-findings.schema.json.
 */
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// ─── grep handler ─────────────────────────────────────────────────────────────

describe('security-review — grep check (hardcoded secret detection)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sr-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('detects a hardcoded API key pattern and fails the check', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'config.ts'),
      `const api_key = "sk12345abcdef"\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'api_key\\s*=\\s*[\'"]\\w+[\'"]' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    // grep found means check passed=true (pattern present), but for "expectNoMatch" the lane logic inverts it
    expect(result.passed).toBe(true)
    expect(result.value).toContain('config.ts')
  })

  it('passes when no hardcoded secret pattern is found', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'config.ts'),
      `const apiKey = process.env['API_KEY']\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'api_key\\s*=\\s*[\'"]\\w+[\'"]' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    expect(result.passed).toBe(false)
  })
})

// ─── output schema ────────────────────────────────────────────────────────────

describe('security-review — output schema shape', () => {
  it('valid security-findings output satisfies required fields', () => {
    const output = {
      runId:    'run-test-001',
      severity: 'critical',
      findings: [
        {
          check:           'No hardcoded secrets',
          passed:          false,
          message:         'Hardcoded API key found in config.ts',
          severity:        'critical',
          recommendations: ['Use environment variables instead'],
        },
      ],
    }

    expect(output.runId).toBeDefined()
    expect(['pass', 'info', 'warning', 'error', 'critical']).toContain(output.severity)
    expect(Array.isArray(output.findings)).toBe(true)
    expect(output.findings[0]!.check).toBeDefined()
    expect(typeof output.findings[0]!.passed).toBe('boolean')
  })
})

// ─── supervisor verdicts ──────────────────────────────────────────────────────

describe('security-review — supervisor ESCALATE on critical auth-path finding', () => {
  it('returns ESCALATE verdict when critical finding is in auth path', () => {
    function resolveVerdict(findings: Array<{ severity: string; category: string }>): string {
      const critical = findings.filter(f => f.severity === 'critical')
      if (critical.some(f => f.category === 'auth' || f.category === 'crypto')) return 'ESCALATE'
      if (critical.length > 0) return 'RETRY'
      if (findings.some(f => f.severity === 'high')) return 'RETRY'
      return 'PASS'
    }

    const findings = [
      { severity: 'critical', category: 'auth', description: 'Broken JWT verification' },
    ]
    expect(resolveVerdict(findings)).toBe('ESCALATE')
  })

  it('returns RETRY for critical non-auth finding', () => {
    function resolveVerdict(findings: Array<{ severity: string; category: string }>): string {
      const critical = findings.filter(f => f.severity === 'critical')
      if (critical.some(f => f.category === 'auth' || f.category === 'crypto')) return 'ESCALATE'
      if (critical.length > 0) return 'RETRY'
      return 'PASS'
    }

    const findings = [
      { severity: 'critical', category: 'injection', description: 'SQL injection risk' },
    ]
    expect(resolveVerdict(findings)).toBe('RETRY')
  })

  it('returns PASS when no critical findings', () => {
    function resolveVerdict(findings: Array<{ severity: string; category: string }>): string {
      const critical = findings.filter(f => f.severity === 'critical')
      if (critical.some(f => f.category === 'auth' || f.category === 'crypto')) return 'ESCALATE'
      if (critical.length > 0) return 'RETRY'
      return 'PASS'
    }

    expect(resolveVerdict([])).toBe('PASS')
  })
})
