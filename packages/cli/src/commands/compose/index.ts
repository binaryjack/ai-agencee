/**
 * CLI Command: ai-kit compose (REFACTORED)
 * AI-powered DAG generator from natural language descriptions
 * 
 * Phase 3.6: AI-powered DAG Generator
 * REFACTORED: Phase 1 - Foundation improvements
 * 
 * Improvements:
 * - Uses @cli/constants instead of hardcoded paths
 * - Uses @cli/services/logger instead of console.log
 * - Uses @cli/types for proper typing (no `any`)
 * - Uses @cli/errors for proper error handling
 * - Extracted system prompt to separate file
 */

import { ModelRouter } from '@ai-agencee/engine';
import { validateDagContract } from '@ai-agencee/mcp/lib/contract-validator.js';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import prompts from 'prompts';

// Phase 1: Use centralized constants and types
import { PATHS } from '../../constants/index.js';
import { createLogger } from '../../services/logger/index.js';
import type { ComposeOptions, Dag } from '../../types/index.js';
import { 
  JsonParseError, 
  InvalidDagError, 
  LlmRequestError, 
  UserCancelledError,
  FileWriteError 
} from '../../errors/index.js';

// Create namespaced logger
const logger = createLogger('compose');

/**
 * Fallback system prompt (for backward compatibility)
 * Prefer loading from external file via loadSystemPrompt()
 */
const FALLBACK_SYSTEM_PROMPT = `You are an expert at creating multi-agent DAG workflows for the AI Agencee framework.

Your task is to convert natural language descriptions into valid DAG JSON configurations.

DAG Structure:
- "name": Human-readable workflow name
- "description": What the workflow does
- "lanes": Array of parallel execution lanes
- "globalBarriers": Synchronization points (optional)
- "capabilityRegistry": Maps capabilities to lane IDs
- "modelRouterFile": Relative path to model router (default: "model-router.json")

Lane Structure:
- "id": Unique lane identifier (lowercase-with-dashes)
- "agentFile": Relative path to agent JSON file (e.g., "agents/security-scanner.json")
- "supervisorFile": Relative path to supervisor JSON file (e.g., "agents/security-supervisor.json")
- "dependsOn": Array of lane IDs that must complete first (empty array for no dependencies)
- "capabilities": Array of capability tags this lane provides (e.g., ["security-scan", "vulnerability-detection"])

Best Practices:
1. Break complex workflows into multiple lanes
2. Use meaningful lane IDs (e.g., "security-scan", "report-generator", "code-reviewer")
3. Set up dependencies for sequential steps (e.g., report-generator depends on security-scan)
4. Group related capabilities together
5. Use standard file paths: agents/<lane-id>.json for agent files
6. Include quality gates via supervisors for important validations
7. Keep lane count reasonable (1-5 lanes for most workflows)
8. Use descriptive names and descriptions

Example DAG:
{
  "name": "Security API Scan",
  "description": "Scans API routes for security vulnerabilities and generates a report",
  "lanes": [
    {
      "id": "security-scanner",
      "agentFile": "agents/security-scanner.json",
      "supervisorFile": "agents/security-supervisor.json",
      "dependsOn": [],
      "capabilities": ["security-analysis", "vulnerability-detection"]
    },
    {
      "id": "report-generator",
      "agentFile": "agents/report-generator.json",
      "supervisorFile": "agents/report-supervisor.json",
      "dependsOn": ["security-scanner"],
      "capabilities": ["report-generation"]
    }
  ],
  "globalBarriers": [],
  "capabilityRegistry": {
    "security-analysis": "security-scanner",
    "vulnerability-detection": "security-scanner",
    "report-generation": "report-generator"
  },
  "modelRouterFile": "model-router.json"
}

Respond ONLY with valid JSON. No explanations, no markdown code blocks, just the raw JSON.`;

/**
 * Load system prompt from file (Phase 1: Extract embedded prompt)
 */
async function loadSystemPrompt(): Promise<string> {
  const promptPath = path.join(PATHS.PROMPTS_DIR, 'dag-generator.prompt.md');
  
  try {
    const content = await fs.readFile(promptPath, 'utf-8');
    return content;
  } catch (error) {
    logger.warn(`Could not load prompt file, using embedded prompt`, { promptPath });
    return FALLBACK_SYSTEM_PROMPT;
  }
}

/**
 * Generate DAG from natural language description using LLM
 */
async function generateDagFromDescription(
  description: string,
  modelRouter: typeof ModelRouter,
  options: { verbose?: boolean } = {}
): Promise<Dag> {
  const { verbose = false } = options;
  
  logger.debug('Generating DAG from description', { description });
  
  const systemPrompt = await loadSystemPrompt();
  const userPrompt = `Create a DAG workflow for the following description:\n\n"${description}"\n\nProvide the complete DAG JSON configuration.`;

  try {
    const response = await modelRouter.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'haiku', // Use fast, cheap model for DAG generation
      max_tokens: 4000,
    });

    const content = response.content[0].text;
    
    // Extract JSON from response
    const dagJson = extractJsonFromLlmResponse(content);
    
    // Validate it's a proper DAG
    if (!isDag(dagJson)) {
      throw new InvalidDagError('Generated content is not a valid DAG structure');
    }
    
    logger.debug('DAG generated successfully', { laneCount: dagJson.lanes.length });
    
    return dagJson;
    
  } catch (error) {
    if (error instanceof InvalidDagError || error instanceof JsonParseError) {
      throw error;
    }
    
    logger.error('LLM request failed', { error });
    throw new LlmRequestError('Failed to generate DAG', { cause: error });
  }
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
function extractJsonFromLlmResponse(content: string): unknown {
  let jsonStr = content.trim();
  
  // Remove markdown code blocks
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new JsonParseError('Failed to parse JSON from LLM response', { cause: error });
  }
}

/**
 * Type guard: Check if value is a valid DAG
 */
function isDag(value: unknown): value is Dag {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.lanes) &&
    typeof obj.modelRouterFile === 'string'
  );
}

/**
 * Display DAG preview
 */
function displayDagPreview(dag: Dag): void {
  console.log(chalk.bold('\n━'.repeat(80)));
  console.log(chalk.bold('  📋 DAG PREVIEW — Generated Workflow'));
  console.log(chalk.bold('━'.repeat(80)));
  console.log();
  console.log(chalk.bold(`  ${dag.name}`));
  if (dag.description) {
    console.log(chalk.dim(`  ${dag.description}`));
  }
  console.log();

  // Show lanes
  console.log(chalk.bold('Workflow Structure:'));
  console.log();
  
  dag.lanes.forEach((lane, idx) => {
    const isLast = idx === dag.lanes.length - 1;
    const prefix = isLast ? '└─' : '├─';
    
    console.log(chalk.cyan(`  ${prefix} Lane: ${lane.id}`));
    console.log(chalk.dim(`     Agent: ${lane.agentFile}`));
    console.log(chalk.dim(`     Supervisor: ${lane.supervisorFile}`));
    
    if (lane.dependsOn && lane.dependsOn.length > 0) {
      console.log(chalk.dim(`     Depends on: ${lane.dependsOn.join(', ')}`));
    }
    
    if (lane.capabilities && lane.capabilities.length > 0) {
      console.log(chalk.dim(`     Capabilities: ${lane.capabilities.join(', ')}`));
    }
    
    console.log();
  });

  // Show estimated cost/timing (if we can analyze it)
  console.log(chalk.dim('Estimated cost: <calculation requires agent files>'));
  console.log(chalk.dim('Estimated time: <calculation requires agent files>'));
  console.log();
  console.log(chalk.bold('━'.repeat(80)));
  console.log();
}

/**
 * Display validation results
 */
function displayValidation(validation: { valid: boolean; errors?: string[] }): void {
  if (validation.valid) {
    logger.success('DAG validation passed');
  } else {
    logger.error('Generated DAG failed validation');
    if (validation.errors && validation.errors.length > 0) {
      validation.errors.forEach(err => {
        logger.error(`  • ${err}`);
      });
    }
    logger.info('The AI generated invalid JSON. Please try a more specific description.');
  }
}

/**
 * Save DAG to file
 */
async function saveDag(dag: Dag, filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(dag, null, 2), 'utf-8');
    
    logger.success(`DAG saved: ${filePath}`);
  } catch (error) {
    throw new FileWriteError(filePath, { cause: error });
  }
}

/**
 * Main compose command
 */
export async function runCompose(options: ComposeOptions): Promise<void> {
  const {
    description,
    output = path.join(PATHS.PROJECT_AGENTS_DIR, PATHS.DAG_FILE),
    provider = 'anthropic',
    modelRouterConfig,
    skipApproval = false,
    verbose = false,
  } = options;
  
  console.log(chalk.bold('\n🎨 AI DAG Composer\n'));
  console.log(chalk.dim(`Description: "${description}"\n`));
  
  logger.info('Starting DAG composition', { provider });
  
  try {
    // Initialize model router
    let modelRouter: typeof ModelRouter;
    
    if (modelRouterConfig && await fs.stat(modelRouterConfig).catch(() => null)) {
      modelRouter = await ModelRouter.fromFile(modelRouterConfig);
    } else {
      modelRouter = ModelRouter.fromConfig({
        defaultProvider: provider,
        taskProfiles: {},
        providers: {},
      });
    }

    await modelRouter.autoRegister();

    if (modelRouter.registeredProviders().length === 0) {
      logger.error('No LLM providers available');
      logger.info('Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI generation');
      throw new LlmRequestError('No LLM providers configured');
    }

    if (verbose) {
      logger.info(`LLM Provider: ${modelRouter.registeredProviders().join(', ')}`);
    }
    
    // Generate DAG
    const dag = await generateDagFromDescription(description, modelRouter, { verbose });
    
    logger.success('DAG generated successfully');
    
    // Validate
    const projectRoot = process.cwd();
    const validation = validateDagContract(dag, projectRoot);
    displayValidation(validation);
    
    if (!validation.valid) {
      throw new InvalidDagError('Generated DAG failed validation', validation.errors || []);
    }
    
    // Display preview
    displayDagPreview(dag);
    
    // Determine output path
    const outputPath = output 
      ? path.resolve(output)
      : path.join(process.cwd(), `${dag.name.toLowerCase().replace(/\s+/g, '-')}.dag.json`);
    
    // Request approval (unless skipped)
    if (!skipApproval) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `Save DAG to ${path.basename(outputPath)}?`,
        initial: true,
      });
      
      if (!proceed) {
        throw new UserCancelledError('DAG composition');
      }
    }
    
    // Save to file
    await saveDag(dag, outputPath);
    
    // Success message
    console.log();
    logger.info('Next steps:');
    logger.info('  1. Create agent files referenced in the DAG');
    logger.info('  2. Review and customize lane configurations');
    logger.info(`  3. Test with: ${chalk.cyan(`ai-kit agent:dag ${path.basename(outputPath)} --preview`)}`);
    logger.info(`  4. Run with: ${chalk.cyan(`ai-kit agent:dag ${path.basename(outputPath)}`)}`);
    console.log();
    
  } catch (error) {
    // Let errors bubble up to be handled by CLI error formatter
    throw error;
  }
}
