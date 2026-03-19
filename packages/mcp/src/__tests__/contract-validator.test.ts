import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { validateAgentContract, validateDagContract } from '../lib/contract-validator.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'contract-validator-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

describe('validateAgentContract()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('supervisor with path separator → bare-filename violation', () => {
    const result = validateAgentContract({ supervisor: 'path/to/supervisor.json' }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations[0]?.type).toBe('bare-filename')
    expect(result.violations[0]?.field).toBe('supervisor')
  })

  it('supervisor with absolute path → bare-filename violation', () => {
    const result = validateAgentContract({ supervisor: 'C:\\absolute\\supervisor.json' }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations[0]?.type).toBe('bare-filename')
  })

  it('supervisor file missing on disk → file-missing violation', () => {
    const result = validateAgentContract({ supervisor: 'missing.supervisor.json' }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations[0]?.type).toBe('file-missing')
    expect(result.violations[0]?.field).toBe('supervisor')
  })

  it('valid agent with bare filename and existing file → valid=true', () => {
    const supFile = path.join(tmp, 'backend.supervisor.json')
    fs.writeFileSync(supFile, '{}')
    const result = validateAgentContract({ supervisor: 'backend.supervisor.json' }, tmp)
    expect(result.valid).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('dependsOn with path separator → bare-filename violation', () => {
    const result = validateAgentContract({ dependsOn: ['path/to/dep.json'] }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations[0]?.type).toBe('bare-filename')
    expect(result.violations[0]?.field).toBe('dependsOn[0]')
  })

  it('dependsOn with missing file → file-missing violation', () => {
    const result = validateAgentContract({ dependsOn: ['missing-dep.agent.json'] }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations[0]?.type).toBe('file-missing')
  })
})

describe('validateDagContract()', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  const makeAgent = (dir: string, name: string) => fs.writeFileSync(path.join(dir, name), '{}')

  it('dag lane with path in agent field → bare-filename violation', () => {
    const result = validateDagContract({ lanes: [{ id: 'lane-a', agent: 'path/to/agent.json', dependsOn: [] }] }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.type === 'bare-filename')).toBe(true)
  })

  it('dag dependsOn references nonexistent lane id → depends-on-invalid', () => {
    makeAgent(tmp, 'agent-a.json')
    const result = validateDagContract({
      lanes: [{ id: 'lane-a', agent: 'agent-a.json', dependsOn: ['nonexistent-lane'] }]
    }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.type === 'depends-on-invalid')).toBe(true)
  })

  it('dag with circular dependsOn (A→B→A) → cycle violation', () => {
    makeAgent(tmp, 'a.agent.json')
    makeAgent(tmp, 'b.agent.json')
    const result = validateDagContract({
      lanes: [
        { id: 'lane-a', agent: 'a.agent.json', dependsOn: ['lane-b'] },
        { id: 'lane-b', agent: 'b.agent.json', dependsOn: ['lane-a'] },
      ]
    }, tmp)
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.type === 'cycle')).toBe(true)
  })

  it('valid dag → ContractResult.valid=true', () => {
    makeAgent(tmp, 'a.agent.json')
    makeAgent(tmp, 'b.agent.json')
    const result = validateDagContract({
      lanes: [
        { id: 'lane-a', agent: 'a.agent.json', dependsOn: [] },
        { id: 'lane-b', agent: 'b.agent.json', dependsOn: ['lane-a'] },
      ]
    }, tmp)
    expect(result.valid).toBe(true)
    expect(result.violations).toHaveLength(0)
  })
})
