import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { validateAgentContract, validateDagContract } from '../lib/contract-validator.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agent-validate-integration-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

describe('agent-validate integration', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('valid agent with all files present → valid=true', () => {
    fs.writeFileSync(path.join(tmp, 'backend.supervisor.json'), JSON.stringify({ laneId: 'backend' }))
    fs.writeFileSync(path.join(tmp, 'dep.agent.json'), '{}')
    const agentJson = { supervisor: 'backend.supervisor.json', dependsOn: ['dep.agent.json'] }
    const result = validateAgentContract(agentJson, tmp)
    expect(result.valid).toBe(true)
  })

  it('agent with malformed supervisor path → returns violations', () => {
    const agentJson = { supervisor: '../sneaky/path.json' }
    const result = validateAgentContract(agentJson, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
  })

  it('dag-validate: valid dag → valid=true', () => {
    fs.writeFileSync(path.join(tmp, 'a.agent.json'), '{}')
    fs.writeFileSync(path.join(tmp, 'b.agent.json'), '{}')
    const dagJson = {
      lanes: [
        { id: 'lane-a', agent: 'a.agent.json', dependsOn: [] },
        { id: 'lane-b', agent: 'b.agent.json', dependsOn: ['lane-a'] },
      ]
    }
    const result = validateDagContract(dagJson, tmp)
    expect(result.valid).toBe(true)
  })
})
