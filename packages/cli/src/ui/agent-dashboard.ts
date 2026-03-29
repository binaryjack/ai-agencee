/**
 * Live Agent Dashboard — Phase 1.2
 * 
 * Terminal UI showing parallel agents working in real-time.
 * Displays agent status, cost tracking, progress, and supervisor verdicts.
 * 
 * Uses simple text rendering to avoid ESM/CommonJS compatibility issues.
 */

import type { DagEventBus, LaneStartEvent, LaneEndEvent, LlmCallEvent, CheckpointEvent, TokenStreamEvent } from '@ai-agencee/engine'

// Lane status type
type LaneStatus = 'pending' | 'running' | 'success' | 'failed' | 'escalated'

// Lane state tracked in dashboard
interface LaneState {
  id: string
  status: LaneStatus
  startTime?: number
  endTime?: number
  cost: number
  tokens: string
  verdict?: string
  retries: number
}

/**
 * Render the dashboard using simple console output
 * (Avoids ink ESM/CommonJS compatibility issues)
 */
export async function renderDashboard(
  bus: DagEventBus,
  dagName: string,
  laneIds: string[]
): Promise<void> {
  const lanes = new Map<string, LaneState>(
    laneIds.map(id => [id, {
      id,
      status: 'pending' as LaneStatus,
      cost: 0,
      tokens: '',
      retries: 0,
    }])
  )
  
  let totalCost = 0
  const startTime = Date.now()
  let dagStatus: 'running' | 'success' | 'failed' = 'running'

  // Clear screen and render header
  console.clear()
  console.log(`\n╔═══════════════════════════════════════════════════╗`)
  console.log(`║  ${dagName.padEnd(47)}║`)
  console.log(`╚═══════════════════════════════════════════════════╝\n`)

  // Render function
  const render = () => {
    // Move cursor up to redraw (ANSI escape codes)
    const lineCount = laneIds.length * 3 + 6
    process.stdout.write(`\x1b[${lineCount}A`)

    console.log(`\n╔═══════════════════════════════════════════════════╗`)
    console.log(`║  ${dagName} - ${dagStatus.toUpperCase()}`.padEnd(52) + `║`)
    console.log(`╚═══════════════════════════════════════════════════╝\n`)

    // Lane cards
    lanes.forEach(lane => {
      const statusIcon = {
        pending: '⏳',
        running: '🔄',
        success: '✅',
        failed: '❌',
        escalated: '⚠️ ',
      }[lane.status]

      const durationS = lane.endTime && lane.startTime 
        ? ((lane.endTime - lane.startTime) / 1000).toFixed(1)
        : '...'

      console.log(`  ${statusIcon} ${lane.id} [${lane.status}]`)
      
      if (lane.verdict) {
        const verdictColor = lane.verdict === 'APPROVE' ? '\x1b[32m' : '\x1b[33m'
        const retryText = lane.retries > 0 ? ` (retry ${lane.retries})` : ''
        console.log(`     └─ Supervisor: ${verdictColor}${lane.verdict}\x1b[0m${retryText}`)
      }
      
      if (lane.tokens) {
        console.log(`     └─ ${lane.tokens.slice(-40)}...`)
      }
      
      console.log(`     💰 $${lane.cost.toFixed(4)} | ⏱️  ${durationS}s\n`)
    })

    // Footer
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    console.log(`\n─────────────────────────────────────────────────────`)
    console.log(`  💰 Total Cost: \x1b[33m$${totalCost.toFixed(4)}\x1b[0m | ⏱️  Elapsed: ${elapsed}s`)
    console.log(`─────────────────────────────────────────────────────\n`)
  }

  // Initial render
  render()

  // Event listeners
  const onLaneStart = (e: LaneStartEvent) => {
    const lane = lanes.get(e.laneId)
    if (lane) {
      lane.status = 'running'
      lane.startTime = Date.now()
      render()
    }
  }

  const onLaneEnd = (e: LaneEndEvent) => {
    const lane = lanes.get(e.laneId)
    if (lane) {
      lane.status = e.status === 'success' ? 'success' : e.status === 'escalated' ? 'escalated' : 'failed'
      lane.endTime = Date.now()
      lane.retries = e.retries
      render()
    }
  }

  const onLlmCall = (e: LlmCallEvent) => {
    const lane = lanes.get(e.laneId)
    if (lane) {
      lane.cost += e.estimatedCostUSD
    }
    totalCost += e.estimatedCostUSD
    render()
  }

  const onCheckpoint = (e: CheckpointEvent) => {
    const lane = lanes.get(e.laneId)
    if (lane) {
      lane.verdict = e.verdict
      render()
    }
  }

  const onTokenStream = (e: TokenStreamEvent) => {
    const lane = lanes.get(e.laneId)
    if (lane) {
      lane.tokens = (lane.tokens + e.token).slice(-50)
      render()
    }
  }

  const onDagEnd = () => {
    dagStatus = 'success'
    render()
  }

  // Attach listeners
  bus.on('lane:start', onLaneStart)
  bus.on('lane:end', onLaneEnd)
  bus.on('llm:call', onLlmCall)
  bus.on('checkpoint:complete', onCheckpoint)
  bus.on('token:stream', onTokenStream)
  bus.on('dag:end', onDagEnd)

  // Note: In a real implementation, we'd need to handle cleanup when the process exits
  // For now, the dashboard will remain active until the DAG completes
}
