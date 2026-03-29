/**
 * CLI Command: ai-kit compose
 * AI-powered DAG generator from natural language descriptions
 * 
 * Phase 3.6: AI-powered DAG Generator
 */

import { ModelRouter } from '@ai-agencee/engine';
import { validateDagContract } from '@ai-agencee/mcp/lib/contract-validator.js';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import prompts from 'prompts';

type ComposeOptions = {
  description: string;
  output?: string;
  provider?: string;
  modelRouterConfig?: string;
  skipApproval?: boolean;
  verbose?: boolean;
};

/**
 * System prompt for DAG generation
 */
const SYSTEM_PROMPT = `You are an expert at creating multi-agent DAG workflows for the AI Agencee framework.

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
 * Generate DAG from natural language description using LLM
 */
async function generateDagFromDescription(
  description: string,
  modelRouter: typeof ModelRouter,
  verbose: boolean
): Promise<any> {
  if (verbose) {
    console.log(chalk.dim('\n🤖 Generating DAG with AI...'));
  }

  const userPrompt = `Create a DAG workflow for the following description:\n\n"${description}"\n\nProvide the complete DAG JSON configuration.`;

  try {
    const response = await modelRouter.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: 'haiku', // Use fast, cheap model for DAG generation
      max_tokens: 4000,
    });

    const content = response.content[0].text;
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const dagJson = JSON.parse(jsonStr);
    return dagJson;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to generate DAG: ${msg}`);
  }
}

/**
 * Run the compose command
 */
export async function runCompose(options: ComposeOptions): Promise<void> {
  const { description, output, provider, modelRouterConfig, skipApproval, verbose } = options;

  console.log(chalk.bold('\n🎨 AI DAG Composer\n'));
  console.log(chalk.dim(`Description: "${description}"\n`));

  // Initialize Model Router
  let modelRouter: typeof ModelRouter;
  try {
    if (modelRouterConfig && await fs.stat(modelRouterConfig).catch(() => null)) {
      modelRouter = await ModelRouter.fromFile(modelRouterConfig);
    } else {
      modelRouter = ModelRouter.fromConfig({
        defaultProvider: provider ?? 'anthropic',
        taskProfiles: {},
        providers: {},
      });
    }

    await modelRouter.autoRegister();

    if (modelRouter.registeredProviders().length === 0) {
      console.error(chalk.red('❌ No LLM providers available'));
      console.error(chalk.dim('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI generation'));
      process.exit(1);
    }

    if (verbose) {
      console.log(chalk.dim(`LLM Provider: ${modelRouter.registeredProviders().join(', ')}\n`));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`❌ Failed to initialize Model Router: ${msg}`));
    process.exit(1);
  }

  // Generate DAG
  let dagJson: any;
  try {
    dagJson = await generateDagFromDescription(description, modelRouter, verbose ?? false);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`❌ ${msg}`));
    process.exit(1);
  }

  console.log(chalk.green('✨ DAG generated successfully!\n'));

  // Validate DAG schema
  const projectRoot = process.cwd();
  const validationResult = validateDagContract(dagJson, projectRoot);
  
  if (!validationResult.valid) {
    console.error(chalk.red('❌ Generated DAG failed validation:'));
    validationResult.errors.forEach((err: string) => {
      console.error(chalk.red(`   • ${err}`));
    });
    console.error(chalk.dim('\n   The AI generated invalid JSON. Please try a more specific description.'));
    process.exit(1);
  }

  console.log(chalk.green('✅ DAG validation passed\n'));

  // Preview the DAG
  console.log(chalk.bold('━'.repeat(80)));
  console.log(chalk.bold('  📋 DAG PREVIEW — Generated Workflow'));
  console.log(chalk.bold('━'.repeat(80)));
  console.log();
  console.log(chalk.bold(`  ${dagJson.name}`));
  if (dagJson.description) {
    console.log(chalk.dim(`  ${dagJson.description}`));
  }
  console.log();

  // Show lanes
  console.log(chalk.bold('Workflow Structure:'));
  console.log();
  
  dagJson.lanes.forEach((lane: any, idx: number) => {
    const isLast = idx === dagJson.lanes.length - 1;
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

  // Determine output path
  const outputPath = output 
    ? path.resolve(output)
    : path.join(process.cwd(), `${dagJson.name.toLowerCase().replace(/\s+/g, '-')}.dag.json`);

  // Ask for approval
  if (!skipApproval) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: `Save DAG to ${path.basename(outputPath)}?`,
      initial: true,
    });

    if (!proceed) {
      console.log(chalk.yellow('\n❌ Cancelled'));
      process.exit(0);
    }
  }

  // Save DAG
  try {
    await fs.writeFile(outputPath, JSON.stringify(dagJson, null, 2), 'utf-8');
    console.log(chalk.green(`\n✅ DAG saved to: ${outputPath}`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\n❌ Failed to save DAG: ${msg}`));
    process.exit(1);
  }

  // Show next steps
  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim(`  1. Create agent files referenced in the DAG`));
  console.log(chalk.dim(`  2. Review and customize lane configurations`));
  console.log(chalk.dim(`  3. Test with: ${chalk.cyan(`ai-kit agent:dag ${path.basename(outputPath)} --preview`)}`));
  console.log(chalk.dim(`  4. Run with: ${chalk.cyan(`ai-kit agent:dag ${path.basename(outputPath)}`)}`));
  console.log();
}
