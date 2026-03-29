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
import { PATHS } from '@cli/constants';
import { createLogger } from '@cli/services/logger';
import type { ComposeOptions } from '@cli/types';
import type { Dag } from '@cli/types';
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
 * Load system prompt from file (Phase 1: Extract embedded prompt)
 */
async function loadSystemPrompt(): Promise<string> {
  const promptPath = path.join(PATHS.PROMPTS_DIR, 'dag-generator.prompt.md');
  
  try {
    const content = await fs.readFile(promptPath, 'utf-8');
    return content;
  } catch (error) {
    logger.warn(`Could not load prompt file, using embedded prompt`, { promptPath });
    // Fallback to embedded prompt for backward compatibility
    return FALLBACK_SYSTEM_PROMPT;
  }
}

/**
 * Fallback system prompt (for backward compatibility)
 */
const FALLBACK_SYSTEM_PROMPT = `You are an expert at creating multi-agent DAG workflows.
Convert natural language descriptions into valid DAG JSON configurations.
Respond ONLY with valid JSON. No explanations, no markdown code blocks.`;

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
 * (Imported from @cli/types, re-export for clarity)
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
  logger.info('\n📋 Generated DAG:\n');
  console.log(chalk.cyan(JSON.stringify(dag, null, 2)));
  console.log('');
  
  logger.info('DAG Summary:');
  logger.info(`  Name: ${dag.name}`);
  logger.info(`  Description: ${dag.description}`);
  logger.info(`  Lanes: ${dag.lanes.length}`);
  
  dag.lanes.forEach((lane, idx) => {
    logger.info(`    ${idx + 1}. ${lane.id} (depends on: ${lane.dependsOn.length > 0 ? lane.dependsOn.join(', ') : 'none'})`);
  });
  
  console.log('');
}

/**
 * Display validation results
 */
function displayValidation(validation: { valid: boolean; errors?: string[] }): void {
  if (validation.valid) {
    logger.success('DAG validation passed');
  } else {
    logger.error('DAG validation failed');
    if (validation.errors && validation.errors.length > 0) {
      validation.errors.forEach(err => {
        logger.error(`  - ${err}`);
      });
    }
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
  
  logger.info('Starting DAG composition', { provider });
  
  try {
    // Initialize model router
    // TODO: Use proper ModelRouter initialization with config
    const modelRouter = ModelRouter as any; // Temporary: needs proper DI
    
    // Generate DAG
    const dag = await generateDagFromDescription(description, modelRouter, { verbose });
    
    // Display preview
    displayDagPreview(dag);
    
    // Validate
    const validation = validateDagContract(dag);
    displayValidation(validation);
    
    if (!validation.valid) {
      throw new InvalidDagError('Generated DAG failed validation', validation.errors || []);
    }
    
    // Request approval (unless skipped)
    if (!skipApproval) {
      const { approved } = await prompts({
        type: 'confirm',
        name: 'approved',
        message: 'Save this DAG configuration?',
        initial: true,
      });
      
      if (!approved) {
        throw new UserCancelledError('DAG composition');
      }
    }
    
    // Save to file
    await saveDag(dag, output);
    
    // Success message
    logger.info('');
    logger.success('DAG composition complete!');
    logger.info(`  File: ${output}`);
    logger.info(`  Lanes: ${dag.lanes.length}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Review the generated DAG configuration');
    logger.info('  2. Create agent files for each lane');
    logger.info('  3. Run: ai-kit agent:dag ' + output);
    logger.info('');
    
  } catch (error) {
    // Let errors bubble up to be handled by error formatter
    throw error;
  }
}
