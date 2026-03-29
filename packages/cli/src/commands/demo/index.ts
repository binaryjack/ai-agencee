/**
 * Demo Command — Zero-config demo mode with mock provider
 * 
 * Phase 1.1: Essential UX — Create 5-minute "aha moment"
 * REFACTORED: Phase 1 - Foundation improvements
 * 
 * Runs curated demo scenarios using the built-in MockProvider.
 * No API keys, no configuration, no cost.
 * 
 * Improvements:
 * - Uses @cli/constants for template paths
 * - Uses @cli/services/logger instead of console.log
 * - Uses @cli/types for DemoOptions
 * - Uses @cli/errors for proper error handling
 */

import prompts from 'prompts'
import { runDag } from '../dag/index.js'

// Phase 1: Use centralized constants and types
import { getPath } from '../../constants/index.js'
import { UserCancelledError } from '../../errors/index.js'
import { createLogger } from '../../services/logger/index.js'
import type { DemoOptions } from '../../types/index.js'

// Create namespaced logger
const logger = createLogger('demo')

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
  
  logger.debug('Starting demo mode', { scenario: options.scenario, verbose: options.verbose })

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
      logger.info('Demo cancelled')
      throw new UserCancelledError('demo')
    }

    selectedScenario = response.scenario
  }

  const scenario = DEMO_SCENARIOS.find((s) => s.id === selectedScenario)

  if (!scenario) {
    logger.error(`Unknown scenario: ${selectedScenario}`)
    logger.info('Available scenarios:')
    DEMO_SCENARIOS.forEach((s) => {
      logger.info(`  • ${s.id} — ${s.name}`)
    })
    throw new Error(`Unknown demo scenario: ${selectedScenario}`)
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

  // Path to demo DAG templates (Phase 1: Use constants)
  const dagFilePath = getPath('TEMPLATES_DEMOS', scenario.dagFile)

  // Run the DAG with mock provider
  logger.info('Starting demo...');

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
    logger.success('Demo complete!');
    console.log('\n' + '━'.repeat(60))
    console.log('\n🎯 Next steps:\n')
    logger.info('  1. Run with real provider:')
    logger.info('     ANTHROPIC_API_KEY=sk-ant-... ai-kit agent:dag agents/dag.json')
    logger.info('  2. Try the live dashboard:')
    logger.info('     ai-kit agent:dag agents/dag.json --dashboard')
    logger.info('  3. Interactive setup wizard:')
    logger.info('     ai-kit setup')
    logger.info('  4. Explore more demos:')
    logger.info('     ai-kit demo')
    console.log('\n' + '━'.repeat(60))
    console.log('\nMission: Quality code that lasts. Sustainable AI. Full transparency.')
    console.log('Codernic doesn\'t compete with GitHub Copilot — it overpasses them.\n')
  } catch (error) {
    // Let errors bubble up to be handled by CLI error formatter
    logger.error('Demo failed', { error });
    throw error;
  }
}

// Export for CLI registration
export { runDemo as default }
