import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { DryRunError } from '../dag-orchestrator/dry-run-report.types.js'
import { DagOrchestrator } from '../dag-orchestrator/index.js'
import type { DagDefinition } from '../dag-types.js'

// Re-import prototype side-effects so dryRun is attached
import '../dag-orchestrator/prototype/index.js'

const makeTmpDir = (): string => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dag-dry-run-test-'))
  return tmp
}

const makeOrchestrator = (projectRoot: string) =>
  new DagOrchestrator(projectRoot)

describe('DagOrchestrator.dryRun()', () => {
  let tmp: string

  beforeEach(() => {
    tmp = makeTmpDir()
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('returns valid=true for a simple valid DAG with existing agent files', async () => {
    fs.writeFileSync(path.join(tmp, 'my-agent.agent.json'), JSON.stringify({ name: 'my-agent', checks: [] }), 'utf8')
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [{ id: 'lane-a', agentFile: 'my-agent.agent.json' }],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(true)
    expect(report.errors).toHaveLength(0)
    expect(report.laneCount).toBe(1)
    expect(report.agentFiles).toContain('my-agent.agent.json')
  })

  it('reports file-missing when agentFile does not exist', async () => {
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [{ id: 'lane-a', agentFile: 'missing.agent.json' }],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(false)
    expect(report.errors.some((e: DryRunError) => e.type === 'file-missing')).toBe(true)
    expect(report.errors.some((e: DryRunError) => e.lane === 'lane-a')).toBe(true)
  })

  it('reports bare-filename when agentFile contains path separators', async () => {
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [{ id: 'lane-a', agentFile: 'subfolder/my-agent.agent.json' }],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(false)
    expect(report.errors.some((e: DryRunError) => e.type === 'bare-filename')).toBe(true)
  })

  it('reports depends-on-invalid for missing lane ID', async () => {
    fs.writeFileSync(path.join(tmp, 'a.agent.json'), '{}', 'utf8')
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [{ id: 'lane-a', agentFile: 'a.agent.json', dependsOn: ['nonexistent'] }],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(false)
    expect(report.errors.some((e: DryRunError) => e.type === 'depends-on-invalid')).toBe(true)
  })

  it('detects a cycle in dependsOn', async () => {
    fs.writeFileSync(path.join(tmp, 'a.agent.json'), '{}', 'utf8')
    fs.writeFileSync(path.join(tmp, 'b.agent.json'), '{}', 'utf8')
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [
        { id: 'lane-a', agentFile: 'a.agent.json', dependsOn: ['lane-b'] },
        { id: 'lane-b', agentFile: 'b.agent.json', dependsOn: ['lane-a'] },
      ],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(false)
    expect(report.errors.some((e: DryRunError) => e.type === 'cycle')).toBe(true)
  })

  it('reports tech-unresolved when agent references an unknown tech pack', async () => {
    const agentJson = { name: 'my-agent', technologies: ['nonexistent-tech-xyz-123'] }
    fs.writeFileSync(path.join(tmp, 'my-agent.agent.json'), JSON.stringify(agentJson), 'utf8')
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [{ id: 'lane-a', agentFile: 'my-agent.agent.json' }],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp, tmp)
    expect(report.errors.some((e: DryRunError) => e.type === 'tech-unresolved')).toBe(true)
  })

  it('returns valid DAG with multiple lanes and dependsOn chain', async () => {
    fs.writeFileSync(path.join(tmp, 'a.agent.json'), '{}', 'utf8')
    fs.writeFileSync(path.join(tmp, 'b.agent.json'), '{}', 'utf8')
    fs.writeFileSync(path.join(tmp, 'c.agent.json'), '{}', 'utf8')
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [
        { id: 'lane-a', agentFile: 'a.agent.json' },
        { id: 'lane-b', agentFile: 'b.agent.json', dependsOn: ['lane-a'] },
        { id: 'lane-c', agentFile: 'c.agent.json', dependsOn: ['lane-b'] },
      ],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(true)
    expect(report.laneCount).toBe(3)
    expect(report.agentFiles).toHaveLength(3)
  })

  it('accumulates multiple errors for multiple lanes', async () => {
    const dag: DagDefinition = {
      name: 'test',
      description: '',
      lanes: [
        { id: 'lane-a', agentFile: 'missing-a.agent.json' },
        { id: 'lane-b', agentFile: 'missing-b.agent.json' },
      ],
    } as unknown as DagDefinition
    const o = makeOrchestrator(tmp)
    const report = await o.dryRun(dag, tmp)
    expect(report.valid).toBe(false)
      expect(report.errors.length).toBeGreaterThanOrEqual(2)
  })
})
