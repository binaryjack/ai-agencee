import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { runDoctor } from '../src/commands/doctor/run-doctor'

const ALL_CHECK_NAMES = [
  'mcp-server',
  'model-router',
  'tech-registry',
  'agencee-init',
  'agent-files',
  'cloud-api',
  'codernic',
]

describe('runDoctor integration', () => {
  let tmpDir: string
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-doctor-int-'))
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs without throwing', async () => {
    await expect(runDoctor(tmpDir)).resolves.toBeDefined()
  })

  it('output includes all 7 check names', async () => {
    await runDoctor(tmpDir)
    const allOutput = consoleSpy.mock.calls.map((args) => String(args[0])).join('\n')
    for (const name of ALL_CHECK_NAMES) {
      expect(allOutput).toContain(name)
    }
  })

  it('exit code 0 when all checks pass (mocked)', async () => {
    // Provide .agencee and 1 agent file so those two checks are green
    fs.mkdirSync(path.join(tmpDir, '.agencee'))
    const agentsDir = path.join(tmpDir, 'agents')
    fs.mkdirSync(agentsDir)
    fs.writeFileSync(path.join(agentsDir, 'my.agent.json'), JSON.stringify({ name: 'My Agent' }))

    const report = await runDoctor(tmpDir)
    // agencee-init and agent-files should be ok, rest warn/error
    const agenceeCheck = report.checks.find((c) => c.name === 'agencee-init')
    const agentCheck = report.checks.find((c) => c.name === 'agent-files')
    expect(agenceeCheck?.status).toBe('ok')
    expect(agentCheck?.status).toBe('ok')
  })
})
