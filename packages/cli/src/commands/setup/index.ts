/**
 * Interactive setup wizard — Phase 1.4
 * REFACTORED: Phase 1 - Foundation improvements
 * 
 * Guided onboarding for first-time users:
 * - Detects if project is initialized
 * - Asks about use case (security, refactoring, testing, etc.)
 * - Generates appropriate DAG and agent configurations
 * - Optionally configures API keys
 * - Runs a test execution to verify setup
 * 
 * Philosophy: "Zero friction from install to first success"
 * 
 * Improvements:
 * - Uses @cli/constants for provider configuration and paths
 * - Uses @cli/services/logger instead of console.log
 * - Uses @cli/types for SetupOptions
 * - Uses @cli/errors for proper error handling
 * - No process.exit() calls
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import prompts from 'prompts'
import { runDemo } from '../demo/index.js'
import { runInit } from '../init/index.js'

// Phase 1: Use centralized constants and types
import { PATHS, PROVIDERS, getProviderConfig } from '../../constants/index.js'
import { createLogger } from '../../services/logger/index.js'
import type { SetupOptions } from '../../types/index.js'
import { UserCancelledError, FileWriteError } from '../../errors/index.js'

// Create namespaced logger
const logger = createLogger('setup')

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

  logger.info('Welcome! Let\'s set up your AI agent workspace.');
  logger.debug('Setup options', { verbose: options.verbose });

  // Step 1: Check if already initialized
  const cwd = process.cwd()
  const agentsDir = path.join(cwd, PATHS.PROJECT_AGENTS_DIR)
  
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
      logger.success('Setup cancelled. Existing configuration preserved.');
      throw new UserCancelledError('setup');
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
    logger.info('Setup cancelled');
    throw new UserCancelledError('setup');
  }

  const template = USE_CASE_TEMPLATES.find(t => t.id === useCase)!

  // Step 3: Choose provider (Phase 1: Use provider constants)
  const providerChoices = [
    { title: '🎭  Mock (free, demo mode)', value: 'mock' },
    { title: '🤖  Anthropic Claude', value: 'anthropic' },
    { title: '🧠  OpenAI GPT', value: 'openai' },
    { title: '🏠  Ollama (local)', value: 'ollama' },
    { title: '⚙️   Configure later', value: 'none' },
  ];
  
  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Which LLM provider would you like to use?',
    choices: providerChoices,
  })

  if (!provider) {
    logger.info('Setup cancelled');
    throw new UserCancelledError('setup');  }

  // Step 4: API key configuration (Phase 1: Use provider constants)
  let apiKeyConfigured = false
  if (provider === 'anthropic' || provider === 'openai') {
    const providerConfig = getProviderConfig(provider);
    const envPath = path.join(cwd, PATHS.ENV_FILE);
    const envVarName = providerConfig.envVar;
    
    logger.info(`To use ${provider}, you need an API key.`);
    logger.info(`Create one at: ${providerConfig.signupUrl}`);
    
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

        try {
          await fs.writeFile(envPath, envContent.trim() + '\n', 'utf-8');
          apiKeyConfigured = true;
          logger.success('API key saved to .env');
        } catch (error) {
          throw new FileWriteError(envPath, { cause: error });
        }
      }
    } else {
      logger.warn(`You can add the API key later to .env:`);
      logger.info(`   ${envVarName}=your-api-key-here`);
    }
  }

  // Step 5: Initialize project structure
  logger.info('Setting up project structure...');
  
  try {
    await runInit({ strict: false });
  } catch (error) {
    logger.error('Failed to initialize project structure', { error });
    throw error;
  }

  // Step 6: Generate use case template files
  if (template.dagFile && useCase !== 'custom') {
    logger.info(`Generating ${template.title} configuration...`);
    
    const targetDir = path.join(cwd, PATHS.PROJECT_AGENTS_DIR);

    try {
      await generateUseCaseDAG(targetDir, useCase, provider);
      logger.success(`Generated ${template.title} configuration in ${PATHS.PROJECT_AGENTS_DIR}/`);
    } catch (error) {
      logger.warn(`Could not generate template files: ${error}`);
      logger.info(`You can configure agents manually in ${PATHS.PROJECT_AGENTS_DIR}/`);
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
 * Generate a use case DAG file (Phase 1: Type-safe without any)
 */
interface DagTemplate {
  name: string;
  description: string;
  lanes: Array<{
    id: string;
    agentFile: string;
    supervisorFile: string;
    dependsOn: string[];
    capabilities: string[];
  }>;
  globalBarriers: unknown[];
  capabilityRegistry: Record<string, string[]>;
  modelRouterFile: string;
}

async function generateUseCaseDAG(
  targetDir: string,
  useCase: string,
  provider: string
): Promise<void> {
  // Simple DAG templates based on use case
  const dagTemplates: Record<string, DagTemplate> = {
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
