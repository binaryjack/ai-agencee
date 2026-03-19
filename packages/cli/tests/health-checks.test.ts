import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// health-check imports (resolved via moduleNameMapper .js → no extension)
import {
    checkAgenceeInit,
    checkAgentFiles,
    checkCodernic,
    checkTechRegistry,
} from '../src/commands/doctor/health-checks'

describe('checkAgenceeInit', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-doctor-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns ok when .agencee/ exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.agencee'))
    const result = await checkAgenceeInit(tmpDir)
    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/initialised/)
  })

  it('returns error with fix command when .agencee/ is missing', async () => {
    const result = await checkAgenceeInit(tmpDir)
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/not found/)
    expect(result.fix).toBe('ai-kit init')
  })
})

describe('checkAgentFiles', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-doctor-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns correct count when agent fixtures present', async () => {
    const agentsDir = path.join(tmpDir, 'agents')
    fs.mkdirSync(agentsDir)
    fs.writeFileSync(path.join(agentsDir, 'alpha.agent.json'), JSON.stringify({ name: 'Alpha' }))
    fs.writeFileSync(path.join(agentsDir, 'beta.agent.json'), JSON.stringify({ name: 'Beta' }))
    const result = await checkAgentFiles(tmpDir)
    expect(result.status).toBe('ok')
    expect(result.message).toContain('2 agent files')
  })

  it('returns warn when no agent files found', async () => {
    fs.mkdirSync(path.join(tmpDir, 'agents'))
    const result = await checkAgentFiles(tmpDir)
    expect(result.status).toBe('warn')
    expect(result.fix).toBe('ai-kit agent:create')
  })

  it('returns error for fixture with invalid JSON', async () => {
    const agentsDir = path.join(tmpDir, 'agents')
    fs.mkdirSync(agentsDir)
    fs.writeFileSync(path.join(agentsDir, 'broken.agent.json'), '{ bad json')
    const result = await checkAgentFiles(tmpDir)
    expect(result.status).toBe('error')
    expect(result.message).toContain('broken.agent.json')
    expect(result.fix).toBe('Check file syntax')
  })
})

describe('checkTechRegistry', () => {
  it('returns warn when package not installed', async () => {
    // The package genuinely does not exist in the monorepo; require will throw MODULE_NOT_FOUND
    const result = await checkTechRegistry(process.cwd())
    expect(result.status).toBe('warn')
    expect(result.message).toContain('@ai-agencee/tech-registry not installed')
    expect(result.fix).toContain('pnpm add')
  })
})

describe('checkCodernic', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-doctor-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    jest.useRealTimers()
  })

  it('returns warn when .ai/project-intelligence.json absent', async () => {
    const result = await checkCodernic(tmpDir)
    expect(result.status).toBe('warn')
    expect(result.message).toMatch(/not indexed/)
    expect(result.fix).toBe('ai-kit analyze')
  })

  it('returns ok when file present and fresh (< 24h)', async () => {
    const aiDir = path.join(tmpDir, '.ai')
    fs.mkdirSync(aiDir)
    const freshDate = new Date(Date.now() - 2 * 3_600_000).toISOString() // 2 hours ago
    fs.writeFileSync(
      path.join(aiDir, 'project-intelligence.json'),
      JSON.stringify({ generatedAt: freshDate }),
    )
    const result = await checkCodernic(tmpDir)
    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/fresh/)
  })

  it('returns warn when file present but stale (> 24h)', async () => {
    const aiDir = path.join(tmpDir, '.ai')
    fs.mkdirSync(aiDir)
    const staleDate = new Date(Date.now() - 48 * 3_600_000).toISOString() // 48 hours ago
    fs.writeFileSync(
      path.join(aiDir, 'project-intelligence.json'),
      JSON.stringify({ generatedAt: staleDate }),
    )
    const result = await checkCodernic(tmpDir)
    expect(result.status).toBe('warn')
    expect(result.message).toMatch(/stale/)
    expect(result.fix).toBe('ai-kit analyze')
  })
})
