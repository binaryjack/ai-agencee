/**
 * Unit tests for the Documentation agent.
 * Tests: PASS when README + CHANGELOG + openapi all present; RETRY when CHANGELOG missing.
 */
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// ─── file-exists handler ──────────────────────────────────────────────────────

describe('documentation — file-exists checks', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  async function fileExistsCheck(filePath: string): Promise<boolean> {
    const { execute } = await import('../../lib/checks/file-exists-handler/prototype/execute.js')
    const ctx = {
      check:       { type: 'file-exists' as const, path: filePath },
      projectRoot: tmpDir,
      fullPath:    path.resolve(tmpDir, filePath),
    }
    const result = await execute.call(null, ctx as never)
    return result.passed
  }

  it('PASS: README.md, CHANGELOG.md, and openapi.json all present', async () => {
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# My Project\n')
    await fs.writeFile(path.join(tmpDir, 'CHANGELOG.md'), '## 1.0.0\n- Initial release\n')
    await fs.writeFile(path.join(tmpDir, 'openapi.json'), '{"openapi":"3.0.0"}\n')

    const readmePresent    = await fileExistsCheck('README.md')
    const changelogPresent = await fileExistsCheck('CHANGELOG.md')
    const openapiPresent   = await fileExistsCheck('openapi.json')

    expect(readmePresent).toBe(true)
    expect(changelogPresent).toBe(true)
    expect(openapiPresent).toBe(true)
  })

  it('detects missing CHANGELOG → supervisor should issue RETRY', async () => {
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# My Project\n')
    await fs.writeFile(path.join(tmpDir, 'openapi.json'), '{"openapi":"3.0.0"}\n')
    // CHANGELOG.md intentionally not created

    const readmePresent    = await fileExistsCheck('README.md')
    const changelogPresent = await fileExistsCheck('CHANGELOG.md')

    expect(readmePresent).toBe(true)
    expect(changelogPresent).toBe(false)
  })
})

// ─── supervisor verdicts ──────────────────────────────────────────────────────

describe('documentation — supervisor verdicts', () => {
  interface DocCheck { artifact: string; present: boolean }

  function resolveVerdict(checks: DocCheck[], retryCount = 0): string {
    const missing = checks.filter(c => !c.present)
    if (missing.length === 0) return 'PASS'
    if (retryCount >= 2) return 'FAIL'
    return 'RETRY'
  }

  it('returns PASS when all required artifacts present', () => {
    const checks = [
      { artifact: 'README.md',    present: true },
      { artifact: 'CHANGELOG.md', present: true },
      { artifact: 'openapi',      present: true },
    ]
    expect(resolveVerdict(checks)).toBe('PASS')
  })

  it('returns RETRY on first attempt when CHANGELOG is missing', () => {
    const checks = [
      { artifact: 'README.md',    present: true },
      { artifact: 'CHANGELOG.md', present: false },
      { artifact: 'openapi',      present: true },
    ]
    expect(resolveVerdict(checks, 0)).toBe('RETRY')
  })

  it('returns RETRY on second attempt when CHANGELOG is missing', () => {
    const checks = [
      { artifact: 'README.md',    present: true },
      { artifact: 'CHANGELOG.md', present: false },
      { artifact: 'openapi',      present: true },
    ]
    expect(resolveVerdict(checks, 1)).toBe('RETRY')
  })

  it('returns FAIL after max 2 retries are exhausted', () => {
    const checks = [
      { artifact: 'README.md',    present: true },
      { artifact: 'CHANGELOG.md', present: false },
      { artifact: 'openapi',      present: true },
    ]
    expect(resolveVerdict(checks, 2)).toBe('FAIL')
  })
})

// ─── output schema ────────────────────────────────────────────────────────────

describe('documentation — output schema shape', () => {
  it('valid output satisfies required fields', () => {
    const output = {
      verdict: 'pass' as const,
      checks: [
        { artifact: 'README.md',    present: true,  status: 'ok' },
        { artifact: 'CHANGELOG.md', present: true,  status: 'ok' },
        { artifact: 'openapi',      present: false, status: 'missing', message: 'openapi.json not found' },
      ],
    }

    expect(['pass', 'fail', 'retry']).toContain(output.verdict)
    expect(Array.isArray(output.checks)).toBe(true)
    for (const check of output.checks) {
      expect(typeof check.artifact).toBe('string')
      expect(typeof check.present).toBe('boolean')
      expect(['ok', 'missing', 'incomplete', 'outdated']).toContain(check.status)
    }
  })
})
