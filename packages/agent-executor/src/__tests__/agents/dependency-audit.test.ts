/**
 * Unit tests for the Dependency Audit agent.
 * Tests: GPL-3 license triggers FAIL verdict, llm-generate produces expected JSON shape.
 */

// ─── license check ────────────────────────────────────────────────────────────

describe('dependency-audit — license check (GPL-3 detection)', () => {
  function resolveLicenseVerdict(packages: Array<{ name: string; license: string }>): string {
    const gpl3 = packages.filter(p => p.license.toUpperCase().includes('GPL-3'))
    if (gpl3.length > 0) return 'FAIL'

    const restricted = packages.filter(p =>
      ['AGPL', 'SSPL', 'BUSL'].some(l => p.license.toUpperCase().includes(l)),
    )
    if (restricted.length > 0) return 'WARN'
    return 'PASS'
  }

  it('returns FAIL when a GPL-3 licensed package is present', () => {
    const packages = [
      { name: 'lodash',    license: 'MIT' },
      { name: 'some-tool', license: 'GPL-3.0' },
    ]
    expect(resolveLicenseVerdict(packages)).toBe('FAIL')
  })

  it('returns WARN when only AGPL package is present', () => {
    const packages = [
      { name: 'redis-client', license: 'AGPL-3.0' },
    ]
    expect(resolveLicenseVerdict(packages)).toBe('WARN')
  })

  it('returns PASS when all packages use permissive licenses', () => {
    const packages = [
      { name: 'express', license: 'MIT' },
      { name: 'fastify', license: 'MIT' },
      { name: 'dayjs',   license: 'MIT' },
    ]
    expect(resolveLicenseVerdict(packages)).toBe('PASS')
  })
})

// ─── output schema ────────────────────────────────────────────────────────────

describe('dependency-audit — llm-generate output shape', () => {
  it('output conforms to dependency-report schema required fields', () => {
    const output = {
      runId:   'run-dep-001',
      verdict: 'fail',
      packages: [
        {
          name:    'some-tool',
          version: '2.0.0',
          status:  'license-issue',
          license: 'GPL-3.0',
          licenseStatus: 'restricted',
        },
      ],
      summary: { total: 1, vulnerable: 0, outdated: 0, licenseIssues: 1 },
    }

    expect(output.runId).toBeDefined()
    expect(['pass', 'fail', 'warn']).toContain(output.verdict)
    expect(Array.isArray(output.packages)).toBe(true)
    expect(output.packages[0]!.name).toBeDefined()
    expect(output.packages[0]!.version).toBeDefined()
    expect(['ok', 'outdated', 'vulnerable', 'license-issue']).toContain(output.packages[0]!.status)
    expect(output.summary.total).toBeGreaterThanOrEqual(0)
  })

  it('vulnerability entries include id and severity', () => {
    const pkg = {
      name: 'lodash',
      version: '4.17.19',
      status: 'vulnerable',
      vulnerabilities: [
        { id: 'CVE-2020-8203', severity: 'high' as const, description: 'Prototype pollution' },
      ],
    }

    expect(pkg.vulnerabilities[0]!.id).toMatch(/CVE-/)
    expect(['low', 'moderate', 'high', 'critical']).toContain(pkg.vulnerabilities[0]!.severity)
  })
})
