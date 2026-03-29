/**
 * Demo Command — Zero-config demo mode with mock provider
 * 
 * Phase 1.1: Essential UX — Create 5-minute "aha moment"
 * 
 * Runs curated demo scenarios using the built-in MockProvider.
 * No API keys, no configuration, no cost.
 */

import prompts from 'prompts'
import { runDag } from '../dag/index.js'
import * as path from 'path'
import { enrichError, exitWithError, ErrorCategory } from '../../utils/error-formatter.js'

// Get templates directory
const getTemplatesDir = (): string => {
  // Templates are in packages/cli/templates/demos
  // This file is in packages/cli/src/commands/demo/index.ts
  // So templates are at ../../templates/demos relative to src root
  return path.resolve(process.cwd(), 'packages', 'cli', 'templates', 'demos')
}

interface DemoOptions {
  scenario?: string
  verbose?: boolean
  interactive?: boolean
}

const DEMO_SCENARIOS = [
  {
    id: 'security-scan',
    name: 'Security Scan',
    description: 'FTS5 zero-hallucination codebase search + security analysis',
    dagFile: 'security-scan.dag.json',
    emoji: '🔐',
  },
  {
    id: 'refactoring',
    name: 'Quality-Gated Refactoring',
    description: 'Multi-LLM routing + test runner + rollback system',
    dagFile: 'refactoring.dag.json',
    emoji: '♻️',
  },
  {
    id: 'multi-agent',
    name: 'Parallel Agent Orchestra',
    description: 'DAG topology + barriers + handoffs + supervisor approval',
    dagFile: 'multi-agent.dag.json',
    emoji: '🎭',
  },
] as const

export async function runDemo(options: DemoOptions = {}): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║        ai-agencee — Zero-Config Demo Mode 🚀            ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('No API keys • No configuration • No cost\n')
  console.log('Codernic runs on quality + sustainability + transparency.\n')
  console.log('See how we overpass Copilot/Cursor/Claude on values, not features.\n')

  // Scenario selection
  let selectedScenario = options.scenario

  if (!selectedScenario) {
    const response = await prompts({
      type: 'select',
      name: 'scenario',
      message: 'Choose a demo scenario:',
      choices: DEMO_SCENARIOS.map((s) => ({
        title: `${s.emoji}  ${s.name}`,
        description: s.description,
        value: s.id,
      })),
      initial: 0,
    })

    if (!response.scenario) {
      console.log('\n✋ Demo cancelled.\n')
      process.exit(0)
    }

    selectedScenario = response.scenario
  }

  const scenario = DEMO_SCENARIOS.find((s) => s.id === selectedScenario)

  if (!scenario) {
    console.error(`\n❌ Unknown scenario: ${selectedScenario}\n`)
    console.log('Available scenarios:')
    DEMO_SCENARIOS.forEach((s) => {
      console.log(`  • ${s.id} — ${s.name}`)
    })
    process.exit(1)
  }

  // Show scenario header
  console.log(`\n${scenario.emoji}  ${scenario.name}`)
  console.log(`${scenario.description}\n`)

  // Explain what's happening
  console.log('💡 What you\'ll see:')
  console.log(`  • MockProvider (zero cost, deterministic responses)`)
  console.log(`  • Real DAG orchestration (same engine as production)`)
  console.log(`  • Real quality checkpoints (supervisor gates)`)
  console.log(`  • Real cost tracking ($0.00 with mock)\n`)

  // Path to demo DAG templates
  const templatesDir = getTemplatesDir()
  const dagFilePath = path.join(templatesDir, scenario.dagFile)

  // Run the DAG with mock provider
  console.log('▶️  Starting demo...\n')

  try {
    await runDag(dagFilePath, {
      provider: 'mock',
      verbose: options.verbose ?? false,
      interactive: options.interactive ?? false,
      dryRun: false,
      dashboard: true, // Always show dashboard in demo mode
      yes: true,       // Skip cost confirmation for demo (mock is free)
    })

    // Success message
    console.log('\n✅ Demo complete!\n')
    console.log('━'.repeat(60))
    console.log('\n🎯 Next steps:\n')
    console.log('  1. Run with real provider:')
    console.log('     ANTHROPIC_API_KEY=sk-ant-... ai-kit agent:dag agents/dag.json\n')
    console.log('  2. Try the live dashboard:')
    console.log('     ai-kit agent:dag agents/dag.json --dashboard\n')
    console.log('  3. Interactive setup wizard:')
    console.log('     ai-kit setup\n')
    console.log('  4. Explore more demos:')
    console.log('     ai-kit demo\n')
    console.log('━'.repeat(60))
    console.log('\nMission: Quality code that lasts. Sustainable AI. Full transparency.')
    console.log('Codernic doesn\'t compete with GitHub Copilot — it overpasses them.\n')
  } catch (error) {
    const richError = enrichError(error, ErrorCategory.RUNTIME, [
      'Check if project is initialized (run "ai-kit init")',
      'Ensure demo DAG files exist',
      'Try a different demo scenario',
      'Run "ai-kit doctor" to diagnose issues',
    ]);
    exitWithError(richError, { verbose: options.verbose });
  }
}

// Export for CLI registration
export { runDemo as default }
