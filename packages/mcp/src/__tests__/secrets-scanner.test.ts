import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { scanFile, scanProject } from '../handlers/analyze-project/secrets-scanner.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-scanner-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

describe('scanFile()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('detects GitHub PAT → severity=high, pattern=github-pat', () => {
    const testFile = path.join(tmp, 'test.ts')
    fs.writeFileSync(testFile, 'const token = "ghp_AAABBBCCCDDDEEEFFFGGGHHHZZZ123456789"\n', 'utf8')
    const findings = scanFile(testFile)
    expect(findings.length).toBeGreaterThan(0)
    const f = findings[0]!
    expect(f.severity).toBe('high')
    expect(f.pattern).toBe('github-pat')
  })

  it('masked value never exceeds 8 chars', () => {
    const testFile = path.join(tmp, 'test.ts')
    fs.writeFileSync(testFile, 'const t = "ghp_AAABBBCCCDDDEEEFFFGGGHHHZZZ123456789"\n', 'utf8')
    const findings = scanFile(testFile)
    for (const f of findings) {
      expect(f.masked.length).toBeLessThanOrEqual(8)
    }
  })

  it('masked value does not contain the actual secret beyond first 4 chars', () => {
    const testFile = path.join(tmp, 'test.ts')
    const secret = 'ghp_AAABBBCCCDDDEEEFFFGGGHHHZZZ123456789'
    fs.writeFileSync(testFile, `const t = "${secret}"\n`, 'utf8')
    const findings = scanFile(testFile)
    const f = findings[0]!
    // masked should be first 4 chars + '****' only
    expect(f.masked).toBe(secret.slice(0, 4) + '****')
    // masked should NOT contain the full secret
    expect(f.masked).not.toContain(secret.slice(4))
  })

  it('returns empty array when no secrets found', () => {
    const testFile = path.join(tmp, 'clean.ts')
    fs.writeFileSync(testFile, 'const greeting = "hello world"\n', 'utf8')
    const findings = scanFile(testFile)
    expect(findings).toHaveLength(0)
  })
})

describe('scanProject()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('excludes node_modules from scan', () => {
    const nmDir = path.join(tmp, 'node_modules', 'somelib')
    fs.mkdirSync(nmDir, { recursive: true })
    fs.writeFileSync(path.join(nmDir, 'index.ts'), 'const t = "ghp_AAABBBCCCDDDEEEFFFGGGHHHZZZ123456789"\n', 'utf8')
    const clean = path.join(tmp, 'clean.ts')
    fs.writeFileSync(clean, 'export const hi = 1\n', 'utf8')
    const findings = scanProject(tmp)
    expect(findings.every(f => !f.file.includes('node_modules'))).toBe(true)
  })

  it('excludes .agencee/ from scan', () => {
    const agenceeDir = path.join(tmp, '.agencee')
    fs.mkdirSync(agenceeDir, { recursive: true })
    fs.writeFileSync(path.join(agenceeDir, 'config.json'), '{"token":"ghp_AAABBBCCCDDDEEEFFFGGGHHHZZZ123456789"}\n', 'utf8')
    const clean = path.join(tmp, 'clean.ts')
    fs.writeFileSync(clean, 'export const hi = 1\n', 'utf8')
    const findings = scanProject(tmp)
    expect(findings.every(f => !f.file.includes('.agencee'))).toBe(true)
  })

  it('file with no secrets → empty array', () => {
    const testFile = path.join(tmp, 'safe.ts')
    fs.writeFileSync(testFile, 'export const add = (a: number, b: number) => a + b\n', 'utf8')
    const findings = scanProject(tmp)
    expect(findings).toHaveLength(0)
  })
})
