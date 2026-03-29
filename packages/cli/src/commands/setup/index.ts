/**
 * Interactive setup wizard — Phase 1.4
 * 
 * Guided onboarding for first-time users:
 * - Detects if project is initialized
 * - Asks about use case (security, refactoring, testing, etc.)
 * - Generates appropriate DAG and agent configurations
 * - Optionally configures API keys
 * - Runs a test execution to verify setup
 * 
 * Philosophy: "Zero friction from install to first success"
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import prompts from 'prompts'
import { enrichError, ErrorCategory, exitWithError } from '../../utils/error-formatter.js'
import { runDemo } from '../demo/index.js'
import { runInit } from '../init/index.js'

interface SetupOptions {
  verbose?: boolean
}

/**
 * Use case templates with pre-configured DAGs
 */
const USE_CASE_TEMPLATES = [
  {
    id: 'security-scan',
    title: '🔐  Security Scan',
    description: 'Find vulnerabilities and security issues in your codebase',
    dagFile: 'security-scan.dag.json',
    agents: ['security-agent.json', 'security-supervisor.json'],
  },
  {
    id: 'code-review',
    title: '🔍  Code Review',
    description: 'Automated code quality checks and best practices review',
    dagFile: 'code-review.dag.json',
    agents: ['review-agent.json', 'review-supervisor.json'],
  },
  {
    id: 'refactoring',
    title: '♻️   Refactoring',
    description: 'Quality-gated code refactoring with supervisor approval',
    dagFile: 'refactoring.dag.json',
    agents: ['analyze-agent.json', 'refactor-agent.json', 'test-agent.json', 'analyze-supervisor.json', 'refactor-supervisor.json', 'test-supervisor.json'],
  },
  {
    id: 'testing',
    title: '🧪  Testing',
    description: 'Generate and run unit tests for your code',
    dagFile: 'testing.dag.json',
    agents: ['test-generator-agent.json', 'test-runner-agent.json', 'test-supervisor.json'],
  },
  {
    id: 'documentation',
    title: '📚  Documentation',
    description: 'Generate comprehensive documentation from code',
    dagFile: 'documentation.dag.json',
    agents: ['doc-agent.json', 'doc-supervisor.json'],
  },
  {
    id: 'custom',
    title: '⚙️   Custom Setup',
    description: 'I want to configure agents manually',
    dagFile: null,
    agents: [],
  },
]

/**
 * Run the interactive setup wizard
 */
export async function runSetup(options: SetupOptions = {}): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║     🚀  AI Agencee — Interactive Setup Wizard           ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('Welcome! Let\'s set up your AI agent workspace.\n')

  // Step 1: Check if already initialized
  const cwd = process.cwd()
  const agentsDir = path.join(cwd, 'agents')
  
  let isInitialized = false
  try {
    await fs.access(agentsDir)
    isInitialized = true
  } catch {
    // Not initialized
  }

  if (isInitialized) {
    const { reinit } = await prompts({
      type: 'confirm',
      name: 'reinit',
      message: 'Project already has an agents/ directory. Reinitialize?',
      initial: false,
    })

    if (!reinit) {
      console.log('\n✅ Setup cancelled. Existing configuration preserved.\n')
      return
    }
  }

  // Step 2: Choose use case
  const { useCase } = await prompts({
    type: 'select',
    name: 'useCase',
    message: 'What would you like to do?',
    choices: USE_CASE_TEMPLATES.map(template => ({
      title: template.title,
      description: template.description,
      value: template.id,
    })),
  })

  if (!useCase) {
    console.log('\n❌ Setup cancelled.\n')
    return
  }

  const template = USE_CASE_TEMPLATES.find(t => t.id === useCase)!

  // Step 3: Choose provider
  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Which LLM provider would you like to use?',
    choices: [
      { title: '🎭  Mock (free, demo mode)', value: 'mock' },
      { title: '🤖  Anthropic Claude', value: 'anthropic' },
      { title: '🧠  OpenAI GPT', value: 'openai' },
      { title: '🏠  Ollama (local)', value: 'ollama' },
      { title: '⚙️   Configure later', value: 'none' },
    ],
  })

  if (!provider) {
    console.log('\n❌ Setup cancelled.\n')
    return
  }

  // Step 4: API key configuration (if needed)
  let apiKeyConfigured = false
  if (provider === 'anthropic' || provider === 'openai') {
    const envPath = path.join(cwd, '.env')
    const envVarName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
    
    console.log(`\n📝 To use ${provider}, you need an API key.`)
    console.log(`   Create one at: ${provider === 'anthropic' ? 'https://console.anthropic.com' : 'https://platform.openai.com'}\n`)
    
    const { configureKey } = await prompts({
      type: 'confirm',
      name: 'configureKey',
      message: `Do you have an API key ready?`,
      initial: true,
    })

    if (configureKey) {
      const { apiKey } = await prompts({
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${provider} API key:`,
      })

      if (apiKey) {
        // Check if .env exists
        let envContent = ''
        try {
          envContent = await fs.readFile(envPath, 'utf-8')
        } catch {
          // .env doesn't exist, will create it
        }

        // Add or update the API key
        const envVarRegex = new RegExp(`^${envVarName}=.*$`, 'm')
        if (envVarRegex.test(envContent)) {
          envContent = envContent.replace(envVarRegex, `${envVarName}=${apiKey}`)
        } else {
          envContent += `\n${envVarName}=${apiKey}\n`
        }

        await fs.writeFile(envPath, envContent.trim() + '\n', 'utf-8')
        apiKeyConfigured = true
        console.log(`\n✅ API key saved to .env\n`)
      }
    } else {
      console.log(`\n⚠️  You can add the API key later to .env:`)
      console.log(`   ${envVarName}=your-api-key-here\n`)
    }
  }

  // Step 5: Initialize project structure
  console.log('\n📦 Setting up project structure...\n')
  
  try {
    await runInit({ strict: false })
  } catch (err) {
    const richError = enrichError(err, ErrorCategory.FILE_SYSTEM, [
      'Ensure you have write permissions',
      'Check disk space is available',
      'Try running in a different directory',
    ]);
    exitWithError(richError);
  }

  // Step 6: Generate use case template files
  if (template.dagFile && useCase !== 'custom') {
    console.log(`\n📝 Generating ${template.title} configuration...\n`)
    
    // Copy template files from demo templates
    const templateDir = path.join(process.cwd(), 'packages', 'cli', 'templates', 'demos')
    const targetDir = path.join(cwd, 'agents')

    try {
      // For now, just generate a simple DAG based on the use case
      // In a full implementation, we'd copy from templates
      await generateUseCaseDAG(targetDir, useCase, provider)
      console.log(`✅ Generated ${template.title} configuration in agents/\n`)
    } catch (err) {
      console.warn(`⚠️  Could not generate template files: ${err}`)
      console.log('   You can configure agents manually in agents/\n')
    }
  }

  // Step 7: Summary and next steps
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                  ✅ Setup Complete!                      ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('Your AI agent workspace is ready!\n')
  console.log('📁 Project structure:')
  console.log('   agents/          - Agent configurations')
  console.log('   agents/dag.json  - DAG orchestration file')
  console.log('   .agents/         - FTS5 index and cache')
  if (apiKeyConfigured || provider === 'mock') {
    console.log('   .env             - API keys (gitignored)\n')
  }

  console.log('🚀 Next steps:\n')
  
  if (provider === 'mock') {
    console.log('  1. Try the demo (zero cost):')
    console.log('     ai-kit demo\n')
    const { runDemoNow } = await prompts({
      type: 'confirm',
      name: 'runDemoNow',
      message: 'Run a demo now?',
      initial: true,
    })

    if (runDemoNow) {
      console.log('\n')
      await runDemo({ verbose: false })
      return
    }
  } else if (apiKeyConfigured) {
    console.log('  1. Run your agents:')
    console.log('     ai-kit agent:dag agents/dag.json --dashboard\n')
  } else {
    console.log(`  1. Add your ${provider} API key to .env:`)
    console.log(`     ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}=your-key-here\n`)
    console.log('  2. Run your agents:')
    console.log('     ai-kit agent:dag agents/dag.json --dashboard\n')
  }

  console.log('  📚 Documentation: https://github.com/binaryjack/ai-agencee')
  console.log('  💬 Questions: https://github.com/binaryjack/ai-agencee/discussions\n')
}

/**
 * Generate a use case DAG file
 */
async function generateUseCaseDAG(
  targetDir: string,
  useCase: string,
  provider: string
): Promise<void> {
  // Simple DAG templates based on use case
  const dagTemplates: Record<string, any> = {
    'security-scan': {
      name: 'Security Scan',
      description: 'Automated security vulnerability scan',
      lanes: [
        {
          id: 'security-scan',
          agentFile: 'security-agent.json',
          supervisorFile: 'security-supervisor.json',
          dependsOn: [],
          capabilities: ['security-analysis'],
        },
      ],
      globalBarriers: [],
      capabilityRegistry: {
        'security-analysis': ['security-scan'],
      },
      modelRouterFile: provider === 'mock' ? 'mock-router.json' : 'model-router.json',
    },
    'code-review': {
      name: 'Code Review',
      description: 'Automated code quality review',
      lanes: [
        {
          id: 'review',
          agentFile: 'review-agent.json',
          supervisorFile: 'review-supervisor.json',
          dependsOn: [],
          capabilities: ['code-review'],
        },
      ],
      globalBarriers: [],
      capabilityRegistry: {
        'code-review': ['review'],
      },
      modelRouterFile: provider === 'mock' ? 'mock-router.json' : 'model-router.json',
    },
    'refactoring': {
      name: 'Quality-Gated Refactoring',
      description: 'Multi-lane refactoring with quality gates',
      lanes: [
        {
          id: 'analyze',
          agentFile: 'analyze-agent.json',
          supervisorFile: 'analyze-supervisor.json',
          dependsOn: [],
          capabilities: ['code-analysis'],
        },
        {
          id: 'refactor',
          agentFile: 'refactor-agent.json',
          supervisorFile: 'refactor-supervisor.json',
          dependsOn: ['analyze'],
          capabilities: ['refactoring'],
        },
        {
          id: 'test',
          agentFile: 'test-agent.json',
          supervisorFile: 'test-supervisor.json',
          dependsOn: ['refactor'],
          capabilities: ['testing'],
        },
      ],
      globalBarriers: [],
      capabilityRegistry: {
        'code-analysis': ['analyze'],
        'refactoring': ['refactor'],
        'testing': ['test'],
      },
      modelRouterFile: provider === 'mock' ? 'mock-router.json' : 'model-router.json',
    },
  }

  const dagConfig = dagTemplates[useCase]
  if (!dagConfig) {
    throw new Error(`No template for use case: ${useCase}`)
  }

  await fs.writeFile(
    path.join(targetDir, 'dag.json'),
    JSON.stringify(dagConfig, null, 2),
    'utf-8'
  )

  // Generate minimal agent files (user will customize these)
  for (const lane of dagConfig.lanes) {
    const agentConfig = {
      name: lane.id,
      description: `Agent for ${lane.id}`,
      checks: [
        {
          type: 'check',
          pass: '✅ Check passed',
          fail: '❌ Check failed',
          failSeverity: 'warning',
        },
      ],
    }

    await fs.writeFile(
      path.join(targetDir, lane.agentFile),
      JSON.stringify(agentConfig, null, 2),
      'utf-8'
    )

    if (lane.supervisorFile) {
      const supervisorConfig = {
        name: `${lane.id}-supervisor`,
        description: `Supervisor for ${lane.id}`,
        approvalCriteria: ['Quality standards met', 'No critical issues'],
      }

      await fs.writeFile(
        path.join(targetDir, lane.supervisorFile),
        JSON.stringify(supervisorConfig, null, 2),
        'utf-8'
      )
    }
  }
}

// Export for CLI registration
export { runSetup as default }
