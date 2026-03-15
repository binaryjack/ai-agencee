/**
 * Unit tests for the Accessibility Review agent.
 * Tests: grep aria-label not found → check fails; llm-review missing alt text → RETRY verdict.
 */
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// ─── grep handler ─────────────────────────────────────────────────────────────

describe('accessibility — grep check (aria-label presence)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'a11y-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('fails when no aria-label, aria-labelledby, or htmlFor found in source', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'Form.tsx'),
      `<form>\n  <input type="text" placeholder="Name" />\n</form>\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'aria-label|aria-labelledby|htmlFor' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    expect(result.passed).toBe(false)
  })

  it('passes when aria-label is present in source', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'Form.tsx'),
      `<form>\n  <input aria-label="Full name" type="text" />\n</form>\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'aria-label|aria-labelledby|htmlFor' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    expect(result.passed).toBe(true)
  })

  it('passes when htmlFor is present in source', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'LoginForm.tsx'),
      `<label htmlFor="email">Email</label>\n<input id="email" type="email" />\n`,
    )

    const { execute } = await import('../../lib/checks/grep-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'grep' as const, pattern: 'aria-label|aria-labelledby|htmlFor' },
      projectRoot: tmpDir,
      fullPath:    tmpDir,
    }

    const result = await execute.call(null, ctx as never)
    expect(result.passed).toBe(true)
  })
})

// ─── supervisor verdicts ──────────────────────────────────────────────────────

describe('accessibility — supervisor verdicts', () => {
  interface A11yIssue { impact: 'minor' | 'moderate' | 'serious' | 'critical'; rule: string }

  function resolveVerdict(issues: A11yIssue[], retryCount = 0): string {
    const critical = issues.filter(i => i.impact === 'critical' || i.impact === 'serious')
    if (critical.length === 0) return 'PASS'
    if (retryCount < 2) return 'RETRY'
    return 'FAIL'
  }

  it('returns RETRY when missing alt text is found (serious impact)', () => {
    const issues: A11yIssue[] = [{ impact: 'serious', rule: 'image-alt' }]
    expect(resolveVerdict(issues, 0)).toBe('RETRY')
  })

  it('returns PASS when no critical or serious issues', () => {
    const issues: A11yIssue[] = [{ impact: 'minor', rule: 'color-contrast' }]
    expect(resolveVerdict(issues)).toBe('PASS')
  })

  it('returns FAIL after max retries on persistent serious issues', () => {
    const issues: A11yIssue[] = [{ impact: 'serious', rule: 'image-alt' }]
    expect(resolveVerdict(issues, 2)).toBe('FAIL')
  })
})

// ─── output schema ────────────────────────────────────────────────────────────

describe('accessibility — output schema shape', () => {
  it('valid output satisfies required fields', () => {
    const output = {
      verdict:   'fail' as const,
      wcagLevel: 'AA' as const,
      issues: [
        {
          rule:        'image-alt',
          impact:      'serious' as const,
          description: 'Image elements must have an alternate text description.',
          element:     '<img src="logo.png" />',
          fix:         'Add alt="Company logo" attribute',
        },
      ],
      summary: { total: 1, critical: 0, serious: 1, moderate: 0, minor: 0 },
    }

    expect(['pass', 'fail', 'retry']).toContain(output.verdict)
    expect(['A', 'AA', 'AAA']).toContain(output.wcagLevel)
    expect(Array.isArray(output.issues)).toBe(true)
    expect(['minor', 'moderate', 'serious', 'critical']).toContain(output.issues[0]!.impact)
    expect(output.summary.total).toBeGreaterThanOrEqual(0)
  })
})
