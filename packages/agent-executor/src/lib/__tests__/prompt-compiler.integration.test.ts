import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { PromptCompiler } from '../prompt-compiler/prompt-compiler.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-compiler-int-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

const writeAgent = (dir: string, agentName: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'agents', `${agentName}.agent.json`),
    JSON.stringify({ name: agentName, description: 'Backend engineer', ...extra }),
  )
}

const writePack = (dir: string, techName: string, rules: string) => {
  const techDir = path.join(dir, 'agents', 'technologies')
  fs.mkdirSync(techDir, { recursive: true })
  fs.writeFileSync(path.join(techDir, `${techName}.pack.md`), [
    '---',
    `name: ${techName}`,
    'version: 1.0.0',
    `description: ${techName} rules`,
    '---',
    rules,
  ].join('\n'))
}

describe('PromptCompiler integration', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('compile() for agent with tech packs → text contains tech rules', async () => {
    writeAgent(tmp, '03-backend', { technologies: ['typescript', 'prisma'] })
    writePack(tmp, 'typescript', 'TYPESCRIPT_RULES: use strict TypeScript')
    writePack(tmp, 'prisma', 'PRISMA_RULES: use Prisma ORM properly')

    const compiler = new PromptCompiler()
    const result = await compiler.compile('03-backend', tmp, 'sonnet')

    expect(result.text).toContain('TYPESCRIPT_RULES')
    expect(result.text).toContain('PRISMA_RULES')
  })

  it('cache written to .agencee/ after first compile', async () => {
    writeAgent(tmp, '03-backend')

    const compiler = new PromptCompiler()
    await compiler.compile('03-backend', tmp, 'sonnet')

    const cacheFile = path.join(tmp, '.agencee', '03-backend.sonnet.compiled.json')
    expect(fs.existsSync(cacheFile)).toBe(true)
  })

  it('second compile reads from cache (same cachedAt timestamp)', async () => {
    writeAgent(tmp, '03-backend', { technologies: ['typescript'] })
    writePack(tmp, 'typescript', 'TS_RULES')

    const compiler = new PromptCompiler()
    const first = await compiler.compile('03-backend', tmp, 'sonnet')
    const second = await compiler.compile('03-backend', tmp, 'sonnet')

    // Cache hit means the cachedAt and fingerprint are identical
    expect(second.cachedAt).toBe(first.cachedAt)
    expect(second.fingerprint).toBe(first.fingerprint)
  })
})
