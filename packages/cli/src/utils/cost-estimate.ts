/**
 * Pre-flight cost estimation for DAG runs — Phase 1.3
 * 
 * Estimates total cost BEFORE running a DAG based on:
 * - Number of lanes and agents per lane
 * - Task types (determines model family: haiku/sonnet/opus)
 * - Estimated token counts per task type
 * - Model router pricing configuration
 * 
 * Reinforces BYOK transparency philosophy: "Know the cost before you run"
 */

import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Estimated token usage by task type (conservative estimates)
 */
const TASK_TOKEN_ESTIMATES: Record<string, { input: number; output: number }> = {
  // Haiku tier tasks (fast, cheap)
  'file-analysis':        { input: 500,   output: 200 },
  'file-exists':          { input: 100,   output: 50 },
  'validation':           { input: 300,   output: 150 },
  'contract-extraction':  { input: 800,   output: 300 },
  'check':                { input: 400,   output: 150 },
  
  // Sonnet tier tasks (balanced)
  'code-generation':      { input: 2000,  output: 2000 },
  'refactoring':          { input: 1500,  output: 1500 },
  'code-review':          { input: 1200,  output: 800 },
  'api-design':           { input: 1500,  output: 1000 },
  'test-execution':       { input: 1000,  output: 500 },
  'security-analysis':    { input: 1800,  output: 1200 },
  
  // Opus tier tasks (complex reasoning)
  'architecture-decision': { input: 5000,  output: 3000 },
  'security-review':       { input: 4000,  output: 2500 },
  'deployment':            { input: 3000,  output: 2000 },
  
  // Default fallback
  'default':              { input: 1000,  output: 500 },
}

/**
 * Model family pricing (Anthropic public rates per million tokens)
 */
const MODEL_FAMILY_PRICING = {
  haiku:  { inputPerMillion: 0.25,  outputPerMillion: 1.25 },
  sonnet: { inputPerMillion: 3.00,  outputPerMillion: 15.00 },
  opus:   { inputPerMillion: 15.00, outputPerMillion: 75.00 },
}

/**
 * Cost estimate breakdown
 */
interface CostEstimate {
  laneEstimates: LaneCostEstimate[]
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  naiveCost: number  // If everything ran on Opus
  savings: number    // Difference between naive and smart routing
  provider: string
}

interface LaneCostEstimate {
  laneId: string
  agentCalls: number
  supervisorCalls: number
  estimatedTokens: { input: number; output: number }
  estimatedCost: number
  modelFamily: string
}

/**
 * Estimate the cost of running a DAG
 */
export async function estimateDagCost(
  orchestrator: any,  // DagOrchestrator instance (using any to avoid type import issues)
  dagFilePath: string,
  projectRoot: string,
): Promise<CostEstimate> {
  // Load the DAG definition
  const dag = await orchestrator.loadDag(dagFilePath)
  
  const laneEstimates: LaneCostEstimate[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCost = 0
  
  // Get model router config (if available)
  const routerConfigPath = dag.modelRouterFile 
    ? path.join(path.dirname(dagFilePath), dag.modelRouterFile)
    : null
  
  let modelRouterConfig: any = null
  if (routerConfigPath) {
    try {
      const routerContent = await fs.readFile(routerConfigPath, 'utf-8')
      modelRouterConfig = JSON.parse(routerContent)
    } catch {
      // Fallback to default pricing if router config not found
    }
  }
  
  // Estimate each lane
  for (const lane of dag.lanes) {
    const agentFilePath = path.join(path.dirname(dagFilePath), lane.agentFile)
    const supervisorFilePath = lane.supervisorFile 
      ? path.join(path.dirname(dagFilePath), lane.supervisorFile)
      : null
    
    // Load agent config to count checks
    let agentCalls = 0
    let taskType = 'default'
    let modelFamily: 'haiku' | 'sonnet' | 'opus' = 'sonnet'
    
    try {
      const agentContent = await fs.readFile(agentFilePath, 'utf-8')
      const agentConfig = JSON.parse(agentContent)
      agentCalls = agentConfig.checks?.length ?? 1
      
      // Infer task type from first check or agent name
      if (agentConfig.checks?.[0]?.type) {
        taskType = agentConfig.checks[0].type
      } else if (agentConfig.name?.toLowerCase().includes('security')) {
        taskType = 'security-analysis'
      } else if (agentConfig.name?.toLowerCase().includes('refactor')) {
        taskType = 'refactoring'
      }
      
      // Get model family from router config or infer from task type
      if (modelRouterConfig?.taskProfiles?.[taskType]) {
        modelFamily = modelRouterConfig.taskProfiles[taskType].family
      } else {
        // Infer based on task type
        if (taskType.includes('architecture') || taskType.includes('security-review')) {
          modelFamily = 'opus'
        } else if (taskType.includes('file') || taskType.includes('validation') || taskType.includes('exists')) {
          modelFamily = 'haiku'
        } else {
          modelFamily = 'sonnet'
        }
      }
    } catch {
      // Fallback if agent file not readable
      agentCalls = 1
    }
    
    // Supervisor adds 1 call per lane (assumes no retries for estimate)
    const supervisorCalls = supervisorFilePath ? 1 : 0
    
    // Get token estimates for this task type
    const tokenEst = TASK_TOKEN_ESTIMATES[taskType] ?? TASK_TOKEN_ESTIMATES.default
    
    const laneInputTokens = (agentCalls + supervisorCalls) * tokenEst.input
    const laneOutputTokens = (agentCalls + supervisorCalls) * tokenEst.output
    
    // Calculate cost using model family pricing
    const pricing = MODEL_FAMILY_PRICING[modelFamily]
    const laneCost = 
      (laneInputTokens / 1_000_000) * pricing.inputPerMillion +
      (laneOutputTokens / 1_000_000) * pricing.outputPerMillion
    
    laneEstimates.push({
      laneId: lane.id,
      agentCalls,
      supervisorCalls,
      estimatedTokens: { input: laneInputTokens, output: laneOutputTokens },
      estimatedCost: laneCost,
      modelFamily,
    })
    
    totalInputTokens += laneInputTokens
    totalOutputTokens += laneOutputTokens
    totalCost += laneCost
  }
  
  // Calculate naive cost (if everything ran on Opus)
  const opusPricing = MODEL_FAMILY_PRICING.opus
  const naiveCost = 
    (totalInputTokens / 1_000_000) * opusPricing.inputPerMillion +
    (totalOutputTokens / 1_000_000) * opusPricing.outputPerMillion
  
  const savings = naiveCost - totalCost
  
  return {
    laneEstimates,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    naiveCost,
    savings,
    provider: modelRouterConfig?.defaultProvider ?? 'anthropic',
  }
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const lines: string[] = []
  
  lines.push('\n╔═══════════════════════════════════════════════════╗')
  lines.push('║          💰 PRE-FLIGHT COST ESTIMATE              ║')
  lines.push('╚═══════════════════════════════════════════════════╝\n')
  
  lines.push(`Provider: ${estimate.provider}`)
  lines.push(`Total lanes: ${estimate.laneEstimates.length}\n`)
  
  lines.push('Lane breakdown:')
  for (const lane of estimate.laneEstimates) {
    const familyIcon = {
      haiku: '🚀',
      sonnet: '⚖️',
      opus: '🧠',
    }[lane.modelFamily] ?? '⚙️'
    
    lines.push(`  ${familyIcon} ${lane.laneId.padEnd(25)} ${lane.modelFamily.padEnd(8)} $${lane.estimatedCost.toFixed(4)}`)
    lines.push(`     └─ ${lane.agentCalls} agent call(s) + ${lane.supervisorCalls} supervisor`)
  }
  
  lines.push('\n─────────────────────────────────────────────────────')
  lines.push(`  Total tokens   : ${(estimate.totalInputTokens + estimate.totalOutputTokens).toLocaleString()}`)
  lines.push(`    Input        : ${estimate.totalInputTokens.toLocaleString()}`)
  lines.push(`    Output (est) : ${estimate.totalOutputTokens.toLocaleString()}`)
  lines.push(`  \n  Estimated cost : \x1b[33m$${estimate.totalCost.toFixed(4)}\x1b[0m`)
  
  if (estimate.savings > 0.0001) {
    lines.push(`  Naive cost     : $${estimate.naiveCost.toFixed(4)} (all Opus)`)
    lines.push(`  💡 Savings     : \x1b[32m$${estimate.savings.toFixed(4)} (${((estimate.savings / estimate.naiveCost) * 100).toFixed(0)}%)\x1b[0m`)
  }
  
  lines.push('─────────────────────────────────────────────────────\n')
  
  if (estimate.totalCost === 0) {
    lines.push('  ℹ️  Mock provider detected: runs with $0 cost\n')
  }
  
  return lines.join('\n')
}
