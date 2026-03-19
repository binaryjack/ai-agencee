import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-compiler-test-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

// Helper to write a minimal agent JSON
const writeAgent = (dir: string, agentName: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'agents', `${agentName}.agent.json`),
    JSON.stringify({ name: agentName, description: `${agentName} system prompt`, ...extra }),
  )
}

describe('formatForModel + truncate', () => {
  const { formatForModel, truncate } = require('../prompt-compiler/prototype/format-for-model')

  it('haiku output uses XML tag format', () => {
    const layers = [{ source: 'agent-base' as const, name: 'backend', content: 'be helpful', tokens: 3 }]
    const text = formatForModel(layers, { modelFamily: 'haiku', tokenBudget: 300 })
    expect(text).toContain('<agent-base>')
    expect(text).toContain('</agent-base>')
  })

  it('sonnet output uses Markdown ## headers', () => {
    const layers = [{ source: 'agent-base' as const, name: 'backend', content: 'be helpful', tokens: 3 }]
    const text = formatForModel(layers, { modelFamily: 'sonnet', tokenBudget: 600 })
    expect(text).toContain('## backend')
  })

  it('opus output uses full prose ### headers', () => {
    const layers = [{ source: 'agent-base' as const, name: 'backend', content: 'be helpful', tokens: 3 }]
    const text = formatForModel(layers, { modelFamily: 'opus', tokenBudget: 1200 })
    expect(text).toContain('### backend')
  })

  it('truncate clips content that exceeds char budget', () => {
    const long = 'a'.repeat(200)
    const result = truncate(long, 50)
    expect(result.length).toBe(50)
    expect(result.endsWith('...')).toBe(true)
  })

  it('truncate returns original string when within budget', () => {
    const short = 'hello'
    expect(truncate(short, 50)).toBe('hello')
  })
})

describe('PromptCompiler compile()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  const makeCompiler = () => {
    const { PromptCompiler } = require('../prompt-compiler/prompt-compiler')
    return new PromptCompiler()
  }

  it('compile() returns CompiledPrompt with non-empty text', async () => {
    writeAgent(tmp, 'backend')
    const compiler = makeCompiler()
    const result = await compiler.compile('backend', tmp, 'sonnet')
    expect(result.text.length).toBeGreaterThan(0)
    expect(result.tokenCount).toBeGreaterThan(0)
    expect(result.fingerprint).toBeTruthy()
    expect(result.modelFamily).toBe('sonnet')
    expect(Array.isArray(result.layers)).toBe(true)
  })

  it('compile() uses cached result on second call (same fingerprint)', async () => {
    writeAgent(tmp, 'backend')
    const compiler = makeCompiler()
    const first = await compiler.compile('backend', tmp, 'sonnet')
    const second = await compiler.compile('backend', tmp, 'sonnet')
    expect(second.fingerprint).toBe(first.fingerprint)
    expect(second.cachedAt).toBe(first.cachedAt)
  })

  it('compile() recompiles when fingerprint changes (agent description changes)', async () => {
    writeAgent(tmp, 'backend')
    const compiler = makeCompiler()
    const first = await compiler.compile('backend', tmp, 'sonnet')

    // Change agent description to invalidate cache
    fs.writeFileSync(
      path.join(tmp, 'agents', 'backend.agent.json'),
      JSON.stringify({ name: 'backend', description: 'updated description XYZ' }),
    )

    const second = await compiler.compile('backend', tmp, 'sonnet')
    expect(second.fingerprint).not.toBe(first.fingerprint)
  })

  it('tokenCount ≈ text.length / 4', async () => {
    writeAgent(tmp, 'backend')
    const compiler = makeCompiler()
    const result = await compiler.compile('backend', tmp, 'haiku')
    expect(result.tokenCount).toBe(Math.ceil(result.text.length / 4))
  })

  it('tech pack rules appear in compiled text', async () => {
    writeAgent(tmp, 'backend', { technologies: ['mytechstack'] })
    // Create a local tech pack
    const techDir = path.join(tmp, 'agents', 'technologies')
    fs.mkdirSync(techDir, { recursive: true })
    fs.writeFileSync(path.join(techDir, 'mytechstack.pack.md'), [
      '---',
      'name: mytechstack',
      'version: 1.0.0',
      'description: My tech stack rules',
      '---',
      'UNIQUE_TECH_RULE_CONTENT_XYZ',
    ].join('\n'))

    const compiler = makeCompiler()
    const result = await compiler.compile('backend', tmp, 'sonnet')
    expect(result.text).toContain('UNIQUE_TECH_RULE_CONTENT_XYZ')
  })

  it('project rules appear in compiled text', async () => {
    writeAgent(tmp, 'backend')
    fs.mkdirSync(path.join(tmp, '.ai'), { recursive: true })
    fs.writeFileSync(path.join(tmp, '.ai', 'rules.md'), 'UNIQUE_PROJECT_RULES_ABC')

    const compiler = makeCompiler()
    const result = await compiler.compile('backend', tmp, 'sonnet')
    expect(result.text).toContain('UNIQUE_PROJECT_RULES_ABC')
  })

  it('codernic context appears when .ai/project-intelligence.json exists', async () => {
    writeAgent(tmp, 'backend')
    fs.mkdirSync(path.join(tmp, '.ai'), { recursive: true })
    fs.writeFileSync(path.join(tmp, '.ai', 'project-intelligence.json'), JSON.stringify({
      techStack: ['TypeScript', 'Node.js'],
      fileCount: 42,
    }))

    const compiler = makeCompiler()
    const result = await compiler.compile('backend', tmp, 'sonnet')
    expect(result.text).toContain('File count')
  })

  it('invalidateCache() removes cache files for agent', async () => {
    writeAgent(tmp, 'backend')
    const compiler = makeCompiler()
    await compiler.compile('backend', tmp, 'sonnet')
    await compiler.compile('backend', tmp, 'haiku')

    const cacheDir = path.join(tmp, '.agencee')
    const before = fs.readdirSync(cacheDir).filter((f: string) => f.startsWith('backend.') && f.endsWith('.compiled.json'))
    expect(before.length).toBeGreaterThan(0)

    compiler.invalidateCache('backend', tmp)

    const after = fs.readdirSync(cacheDir).filter((f: string) => f.startsWith('backend.') && f.endsWith('.compiled.json'))
    expect(after.length).toBe(0)
  })
})

describe('LLM handler prompt injection', () => {
  const makeCtx = (override: Record<string, unknown> = {}) => ({
    check: { type: 'llm-review' as const, path: 'src', prompt: 'Review {content}' },
    projectRoot: '/tmp/project',
    fullPath: '/tmp/project/src',
    modelRouter: {
      route: jest.fn().mockResolvedValue({ content: 'findings', taskType: 'validation', estimatedCostUSD: 0, naiveCostUSD: 0 }),
      streamRoute: jest.fn(),
    },
    ...override,
  })

  it('when ctx.promptCompiler set: system message is compiled prompt', async () => {
    const { execute } = require('../checks/llm-review-handler/prototype/execute')
    const mockCompile = jest.fn().mockResolvedValue({ text: 'COMPILED_PROMPT_SENTINEL', tokenCount: 10, fingerprint: 'fp', modelFamily: 'sonnet', layers: [], cachedAt: 1 })
    const ctx = makeCtx({
      promptCompiler: { compile: mockCompile, invalidateCache: jest.fn() },
      agentName: 'backend',
    })

    await execute(ctx)

    expect(mockCompile).toHaveBeenCalledWith('backend', '/tmp/project', 'sonnet')
    const callArgs = (ctx.modelRouter.route as jest.Mock).mock.calls[0][1]
    expect(callArgs.messages[0].content).toBe('COMPILED_PROMPT_SENTINEL')
  })

  it('when ctx.promptCompiler absent: falls back to hardcoded system string', async () => {
    const { execute } = require('../checks/llm-review-handler/prototype/execute')
    const ctx = makeCtx()

    await execute(ctx)

    const callArgs = (ctx.modelRouter.route as jest.Mock).mock.calls[0][1]
    expect(callArgs.messages[0].content).toContain('code reviewer')
  })

  it('llm-generate: when ctx.promptCompiler set: system message is compiled prompt', async () => {
    const { execute } = require('../checks/llm-generate-handler/prototype/execute')
    const mockCompile = jest.fn().mockResolvedValue({ text: 'GEN_COMPILED_SENTINEL', tokenCount: 10, fingerprint: 'fp', modelFamily: 'sonnet', layers: [], cachedAt: 1 })
    const ctx = makeCtx({
      check: { type: 'llm-generate' as const, prompt: 'Generate {path}' },
      promptCompiler: { compile: mockCompile, invalidateCache: jest.fn() },
      agentName: 'backend',
    })

    await execute(ctx)

    expect(mockCompile).toHaveBeenCalled()
    const callArgs = (ctx.modelRouter.route as jest.Mock).mock.calls[0][1]
    expect(callArgs.messages[0].content).toBe('GEN_COMPILED_SENTINEL')
  })

  it('llm-generate: when ctx.promptCompiler absent: falls back to hardcoded string', async () => {
    const { execute } = require('../checks/llm-generate-handler/prototype/execute')
    const ctx = makeCtx({
      check: { type: 'llm-generate' as const, prompt: 'Generate {path}' },
    })

    await execute(ctx)

    const callArgs = (ctx.modelRouter.route as jest.Mock).mock.calls[0][1]
    expect(callArgs.messages[0].content).toContain('expert software engineer')
  })
})
