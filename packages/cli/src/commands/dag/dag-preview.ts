import type { DagDefinition, LaneDefinition } from '@ai-agencee/engine'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * Phase 3.1: Enhanced DAG Preview
 * 
 * Provides detailed analysis of what a DAG will do before execution:
 * - Phase breakdown with dependencies
 * - File access analysis  
 * - Detailed cost/energy/time estimates
 * - Budget warnings
 */

export interface DagPreview {
  dagName: string
  description: string
  phases: PhasePreview[]
  totalCostUSD: number
  totalEnergyWh: number
  totalDurationSec: number
  filesAnalyzed: string[]
  budgetCapUSD?: number
  budgetExceeded: boolean
}

export interface PhasePreview {
  phaseNumber: number
  laneIds: string[]
  parallel: boolean
  lanes: LanePreview[]
  estimatedCostUSD: number
  estimatedDurationSec: number
}

export interface LanePreview {
  laneId: string
  agentName: string
  checksCount: number
  filesAccessed: string[]
  modelTier: string
  estimatedCostUSD: number
  estimatedDurationSec: number
  hasSupervisor: boolean
}

/**
 * Cost estimation per model tier (per 1000 tokens).
 * Based on Anthropic pricing Jan 2026:
 * - Haiku:  $0.25/1M input, $1.25/1M output → avg $0.75/1M → $0.00075/1k
 * - Sonnet: $3/1M input, $15/1M output → avg $9/1M → $0.009/1k  
 * - Opus:   $15/1M input, $75/1M output → avg $45/1M → $0.045/1k
 * 
 * Assume avg check uses ~2k input, 1k output = 3k tokens total.
 */
const MODEL_COST_PER_CHECK: Record<string, number> = {
  haiku: 0.00225,   // 3k tokens * $0.00075/1k
  sonnet: 0.027,    // 3k tokens * $0.009/1k
  opus: 0.135,      // 3k tokens * $0.045/1k
  mock: 0           // Free provider
}

/**
 * Execution time per check (seconds).
 * - Haiku: fast (3s avg)
 * - Sonnet: moderate (8s avg)
 * - Opus: slow (15s avg)  
 * + 2s checkpoint overhead per check
 */
const MODEL_TIME_PER_CHECK: Record<string, number> = {
  haiku: 5,   // 3s inference + 2s checkpoint
  sonnet: 10, // 8s inference + 2s checkpoint
  opus: 17,   // 15s inference + 2s checkpoint
  mock: 1     // Instant for mock provider
}

/**
 * Energy consumption: ~1 Wh per 1000 tokens (rough estimate).
 */
function costToEnergy(costUSD: number): number {
  // Reverse calculation: cost → tokens → energy
  // $0.009/1k tokens (Sonnet avg) → 1 Wh/1k tokens
  const tokens = costUSD / 0.009 * 1000  // Rough estimate
  return tokens / 1000  // Wh
}

/**
 * Analyze a DAG file and generate detailed preview.
 */
export async function generateDagPreview(
  dagPath: string,
  projectRoot: string,
  budgetCapUSD?: number
): Promise<DagPreview> {
  // Load DAG JSON
  const dagText = await fs.readFile(dagPath, 'utf-8')
  const dag: DagDefinition = JSON.parse(dagText)

  // Compute execution phases based on lane dependencies
  const phases = computePhases(dag.lanes)

  // Analyze each phase
  const phasesPreviews: PhasePreview[] = []
  const allFiles = new Set<string>()

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]!
    const lanesPreviews: LanePreview[] = []

    for (const laneId of phase) {
      const lane = dag.lanes.find(l => l.id === laneId)!
      const lanePreview = await analyzeLane(lane, path.dirname(dagPath), projectRoot)
      lanesPreviews.push(lanePreview)
      lanePreview.filesAccessed.forEach(f => allFiles.add(f))
    }

    const phaseCost = lanesPreviews.reduce((sum: number, l) => sum + l.estimatedCostUSD, 0)
    const phaseDuration = phase.length > 1
      ? Math.max(...lanesPreviews.map(l => l.estimatedDurationSec))  // Parallel: max duration
      : lanesPreviews.reduce((sum: number, l) => sum + l.estimatedDurationSec, 0)  // Sequential: sum

    phasesPreviews.push({
      phaseNumber: i + 1,
      laneIds: phase,
      parallel: phase.length > 1,
      lanes: lanesPreviews,
      estimatedCostUSD: phaseCost,
      estimatedDurationSec: phaseDuration
    })
  }

  const totalCost = phasesPreviews.reduce((sum: number, p) => sum + p.estimatedCostUSD, 0)
  const totalDuration = phasesPreviews.reduce((sum: number, p) => sum + p.estimatedDurationSec, 0)
  const totalEnergy = costToEnergy(totalCost)

  return {
    dagName: dag.name ?? path.basename(dagPath, path.extname(dagPath)),
    description: dag.description ?? '(no description)',
    phases: phasesPreviews,
    totalCostUSD: totalCost,
    totalEnergyWh: totalEnergy,
    totalDurationSec: totalDuration,
    filesAnalyzed: Array.from(allFiles).sort((a, b) => a.localeCompare(b)),
    budgetCapUSD,
    budgetExceeded: budgetCapUSD !== undefined && totalCost > budgetCapUSD
  }
}

/**
 * Analyze a single lane and estimate cost/duration.
 */
async function analyzeLane(
  lane: LaneDefinition,
  dagDir: string,
  projectRoot: string
): Promise<LanePreview> {
  const modelTier = (lane.providerOverride ?? 'sonnet').toLowerCase()
  
  // Load agent JSON to count checks
  let checksCount = 0
  let agentName = lane.id
  let filesAccessed: string[] = []

  if (lane.agentFile) {
    try {
      const agentPath = path.resolve(dagDir, lane.agentFile)
      const agentText = await fs.readFile(agentPath, 'utf-8')
      const agent = JSON.parse(agentText)
      
      agentName = agent.name ?? lane.id
      checksCount = (agent.checks ?? []).length

      // Extract file patterns from checks
      for (const check of agent.checks ?? []) {
        if (check.files) {
          filesAccessed.push(...check.files)
        }
      }
    } catch (err) {
      // Non-fatal: Use defaults if agent file can't be read
      console.warn(`Warning: Could not read agent file ${lane.agentFile}: ${err}`)
    }
  }

  const costPerCheck = MODEL_COST_PER_CHECK[modelTier] ?? MODEL_COST_PER_CHECK.sonnet
  const timePerCheck = MODEL_TIME_PER_CHECK[modelTier] ?? MODEL_TIME_PER_CHECK.sonnet

  return {
    laneId: lane.id,
    agentName,
    checksCount,
    filesAccessed: [...new Set(filesAccessed)],  // Deduplicate
    modelTier,
    estimatedCostUSD: costPerCheck * checksCount,
    estimatedDurationSec: timePerCheck * checksCount,
    hasSupervisor: Boolean(lane.supervisorFile)
  }
}

/**
 * Compute execution phases based on lane dependencies.
 * Returns array of phases, where each phase is an array of lane IDs that can run in parallel.
 */
function computePhases(lanes: LaneDefinition[]): string[][] {
  const laneIds = lanes.map(l => l.id)
  const deps = new Map(lanes.map(l => [l.id, l.dependsOn ?? []]))

  const phases: string[][] = []
  const assigned = new Set<string>()

  while (assigned.size < laneIds.length) {
    // Find lanes ready to execute (all dependencies satisfied)
    const ready = laneIds.filter(id =>
      !assigned.has(id) && deps.get(id)!.every(dep => assigned.has(dep))
    )

    if (ready.length === 0) {
      throw new Error('Circular dependency detected in DAG lanes')
    }

    phases.push(ready)
    ready.forEach(id => assigned.add(id))
  }

  return phases
}

/**
 * Pretty-print DAG preview to console.
 */
export function printDagPreview(preview: DagPreview): void {
  console.log()
  console.log('━'.repeat(80))
  console.log('  📋 DAG PREVIEW — Execution Plan')
  console.log('━'.repeat(80))
  console.log()
  console.log(`  DAG: ${preview.dagName}`)
  console.log(`  ${preview.description}`)
  console.log()

  // Phase-by-phase breakdown
  for (const phase of preview.phases) {
    const parallelMarker = phase.parallel ? ' (parallel execution)' : ''
    console.log(`Phase ${phase.phaseNumber}:${parallelMarker}`)

    for (const lane of phase.lanes) {
      const supervisorBadge = lane.hasSupervisor ? ' 🔍' : ''
      console.log(`  ├─ ${lane.laneId}${supervisorBadge}`)
      console.log(`  │  Agent: ${lane.agentName}`)
      console.log(`  │  Model: ${lane.modelTier}`)
      console.log(`  │  Checks: ${lane.checksCount}`)
      
      if (lane.filesAccessed.length > 0) {
        const filePreview = lane.filesAccessed.slice(0, 3).join(', ')
        const moreFiles = lane.filesAccessed.length > 3 ? ` (+${lane.filesAccessed.length - 3} more)` : ''
        console.log(`  │  Files: ${filePreview}${moreFiles}`)
      }
      
      console.log(`  │  Cost: $${lane.estimatedCostUSD.toFixed(4)}`)
      console.log(`  │  Time: ~${lane.estimatedDurationSec}s`)
    }

    console.log(`  └─ Phase total: $${phase.estimatedCostUSD.toFixed(4)} | ~${phase.estimatedDurationSec}s`)
    console.log()
  }

  // Total estimates
  console.log('Total Estimate:')
  console.log(`  💰 Cost: $${preview.totalCostUSD.toFixed(4)}`)
  console.log(`  ⚡ Energy: ${preview.totalEnergyWh.toFixed(2)} Wh`)
  console.log(`  ⏱️  Duration: ~${Math.ceil(preview.totalDurationSec)}s`)

  // Budget check
  if (preview.budgetCapUSD !== undefined) {
    const remaining = preview.budgetCapUSD - preview.totalCostUSD
    if (preview.budgetExceeded) {
      console.log(`  ⚠️  Budget: EXCEEDED by $${Math.abs(remaining).toFixed(4)} (cap: $${preview.budgetCapUSD.toFixed(2)})`)
    } else {
      console.log(`  🎯 Budget: $${remaining.toFixed(4)} remaining (cap: $${preview.budgetCapUSD.toFixed(2)})`)
    }
  }

  console.log()
  console.log(`  Files analyzed: ${preview.filesAnalyzed.length}`)
  
  if (preview.filesAnalyzed.length > 0 && preview.filesAnalyzed.length <= 10) {
    for (const file of preview.filesAnalyzed) {
      console.log(`    • ${file}`)
    }
  }

  console.log()
  console.log('━'.repeat(80))
  console.log('  💚 DRY RUN — No execution, no costs')
  console.log('  • No LLM calls made')
  console.log('  • No files modified')
  console.log('  • Estimates only')
  console.log('━'.repeat(80))
  console.log()
}
