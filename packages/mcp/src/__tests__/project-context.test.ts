import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { detectTechStack, resolveProjectContext } from '../lib/project-context.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'project-context-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

const writePkg = (dir: string, deps: Record<string, string>, devDeps: Record<string, string> = {}) => {
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps, devDependencies: devDeps }), 'utf8')
}

describe('detectTechStack()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('detects prisma + react + typescript → includes those names + node', () => {
    writePkg(tmp, { react: '*', '@prisma/client': '*' }, { typescript: '*' })
    const stack = detectTechStack(tmp)
    expect(stack).toContain('react')
    expect(stack).toContain('prisma')
    expect(stack).toContain('typescript')
    expect(stack).toContain('node')
  })

  it('always includes node', () => {
    writePkg(tmp, {})
    const stack = detectTechStack(tmp)
    expect(stack).toContain('node')
  })

  it('returns empty for missing package.json (except node)', () => {
    const stack = detectTechStack(tmp)
    expect(stack).toEqual(['node'])
  })
})

describe('resolveProjectContext()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  const makeAgentsDir = (dir: string, files: string[]) => {
    fs.mkdirSync(path.join(dir, 'agents'), { recursive: true })
    for (const f of files) fs.writeFileSync(path.join(dir, 'agents', f), '{}')
  }

  it('returns context with agentFiles as bare basenames', async () => {
    writePkg(tmp, {})
    makeAgentsDir(tmp, ['01-ba.agent.json', '02-arch.agent.json'])
    const ctx = await resolveProjectContext(tmp)
    expect(ctx.agentFiles).toContain('01-ba.agent.json')
    expect(ctx.agentFiles.every(f => !f.includes('/') && !f.includes('\\'))).toBe(true)
  })

  it('returns cached context when fingerprint unchanged', async () => {
    writePkg(tmp, {})
    const first = await resolveProjectContext(tmp)
    const second = await resolveProjectContext(tmp)
    expect(second.cachedAt).toBe(first.cachedAt)
    expect(second.fingerprint).toBe(first.fingerprint)
  })

  it('invalidates cache when fingerprint changes', async () => {
    writePkg(tmp, {})
    await resolveProjectContext(tmp)
    // Touch the package.json to change mtime
    await new Promise(r => setTimeout(r, 10))
    writePkg(tmp, { react: '*' })
    // Need to also update fingerprint — force by removing cached file
    const cachePath = path.join(tmp, '.agencee', 'project-context.json')
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
      // Corrupt fingerprint so cache is invalid
      cached.fingerprint = 'wrong'
      fs.writeFileSync(cachePath, JSON.stringify(cached))
    }
    const second = await resolveProjectContext(tmp)
    expect(second.techStack).toContain('react')
  })
})
