/**
 * CLI Command: ai-kit code generate
 *
 * Writes or modifies source files from a natural-language task description.
 * Codernic queries the live codebase index for relevant context, injects real
 * symbol signatures and file snippets into the LLM prompt, generates file
 * patches, and applies them to disk — optionally in dry-run mode for preview.
 */

import { ModelRouter } from '@ai-agencee/engine';
import { createCodeAssistantOrchestrator } from '@ai-agencee/engine/code-assistant';
import * as fs from 'node:fs';
import * as path from 'node:path';

type GenerateOptions = {
  project?:     string;
  mode?:        'quick-fix' | 'feature' | 'refactor' | 'debug';
  dryRun?:      boolean;
  autoApprove?: boolean;
  provider?:    string;
  router?:      string;
};

export const runCodeGenerate = async function(
  task:    string,
  options: GenerateOptions = {},
): Promise<void> {
  if (!task || task.trim() === '') {
    console.error('❌ Task description is required.');
    console.error('   Usage: ai-kit code generate "<task description>"');
    process.exit(1);
  }

  const projectRoot = path.resolve(options.project ?? process.cwd());
  const mode        = options.mode ?? 'feature';
  const dryRun      = options.dryRun ?? false;

  console.log('\n🤖  Codernic — Code Generation');
  console.log('─'.repeat(56));
  console.log('  Project : ' + projectRoot);
  console.log('  Task    : ' + task);
  console.log('  Mode    : ' + mode + (dryRun ? '  (dry run)' : ''));

  // Build model router
  const routerConfigPath = options.router
    ?? path.join(projectRoot, 'agents', 'model-router.json');

  let modelRouter: ReturnType<typeof ModelRouter.fromConfig> | undefined;
  try {
    const router = fs.existsSync(routerConfigPath)
      ? await ModelRouter.fromFile(routerConfigPath)
      : ModelRouter.fromConfig({
          defaultProvider: options.provider ?? 'anthropic',
          taskProfiles:    {},
          providers:       {},
        });

    await router.autoRegister();

    const providers = router.registeredProviders();
    if (providers.length > 0) {
      modelRouter = router;
      console.log('  Provider: ' + providers.join(', '));
    } else {
      console.error('\n❌ No LLM provider available.');
      console.error('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY and retry.');
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('\n❌ Failed to initialise model router: ' + String(err));
    process.exit(1);
  }

  console.log('');
  console.log('🔍  Querying codebase index…');

  const orchestrator = createCodeAssistantOrchestrator({
    projectRoot,
    modelRouter,
  });

  const result = await orchestrator.execute({ task, mode, dryRun, autoApprove: options.autoApprove });

  console.log('');

  if (!result.success) {
    console.error('❌ Generation failed: ' + (result.error ?? 'unknown error'));
    process.exit(1);
  }

  const durationSec = (result.duration / 1000).toFixed(1);

  if (dryRun) {
    console.log('📋  Dry-run plan:\n');
    console.log(result.plan ?? '(no plan returned)');
    console.log('');
    console.log('  No files were written (--dry-run).');
  } else {
    if (result.filesModified && result.filesModified.length > 0) {
      console.log('✏️   Modified files:');
      result.filesModified.forEach(function(f) { console.log('    ' + f); });
    }
    if (result.newFiles && result.newFiles.length > 0) {
      console.log('✨  New files:');
      result.newFiles.forEach(function(f) { console.log('    ' + f); });
    }
    const total = (result.filesModified ?? []).length + (result.newFiles ?? []).length;
    if (total === 0) {
      console.log('⚠️   No file patches were found in the model response.');
      console.log('    Try rephrasing the task or adding more context.');
    }
  }

  console.log('');
  console.log(
    '  Cost : $' + result.totalCost.toFixed(4) + ' USD' +
    '  ·  Duration : ' + durationSec + 's',
  );
  console.log('');
};
