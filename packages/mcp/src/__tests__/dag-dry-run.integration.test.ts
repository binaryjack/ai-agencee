import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { runDagDryRun } from '../handlers/dag-dry-run/index.js'

type DryRunError = { type: string; lane?: string; message: string }

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dag-dry-run-mcp-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

describe('dag-dry-run MCP handler integration', () => {
  let tmp: string
  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('returns valid=true for a well-formed dag file with existing agent files', async () => {
    fs.writeFileSync(path.join(tmp, 'my-agent.agent.json'), JSON.stringify({ name: 'my-agent', checks: [] }))
    const dag = {
      name: 'test',
      description: 'integration test DAG',
      lanes: [{ id: 'lane-one', agentFile: 'my-agent.agent.json' }],
    }
    const dagPath = path.join(tmp, 'test.dag.json')
    fs.writeFileSync(dagPath, JSON.stringify(dag))
    const report = await runDagDryRun(dagPath, tmp)
    expect(report.valid).toBe(true)
    expect(report.errors).toHaveLength(0)
    expect(report.laneCount).toBe(1)
  })

  it('returns valid=false with errors for a dag referencing missing agent files', async () => {
    const dag = {
      name: 'bad-dag',
      description: '',
      lanes: [{ id: 'lane-one', agentFile: 'ghost.agent.json' }],
    }
    const dagPath = path.join(tmp, 'bad.dag.json')
    fs.writeFileSync(dagPath, JSON.stringify(dag))
    const report = await runDagDryRun(dagPath, tmp)
    expect(report.valid).toBe(false)
    expect(report.errors.some((e: DryRunError) => e.type === 'file-missing')).toBe(true)
  })
})
