import { DagOrchestrator, DagResult, getGlobalEventBus } from '@ai-agencee/engine';
import * as path from 'path';
import prompts from 'prompts';
import { findProjectRoot, validateProjectRoot } from './find-project-root.js';
import { printDagSummary } from './print-dag-summary.js';
import { renderDashboard } from '../../ui/agent-dashboard.js';
import { estimateDagCost, formatCostEstimate } from '../../utils/cost-estimate.js';
import { createError, enrichError, exitWithError, ErrorCategory } from '../../utils/error-formatter.js';
import { getModeConfig, applyModeConfig, resolveMode } from '../../utils/execution-modes.js';

export const runDag = async (
  dagFile: string,
  options: {
    project?: string;
    verbose?: boolean;
    dryRun?: boolean;
    interactive?: boolean;
    budget?: string;
    provider?: string;
    json?: boolean;
    dashboard?: boolean; // Enable live terminal dashboard
    yes?: boolean;       // Skip cost confirmation
    mode?: string;       // Execution mode preset
  },
): Promise<void> => {
  // Apply execution mode preset (can be overridden by explicit flags)
  const mode = resolveMode(options.mode);
  const modeConfig = getModeConfig(mode);
  const mergedOptions = applyModeConfig(options, modeConfig);
  
  const explicitProject = Boolean(mergedOptions.project);
  const projectRoot = mergedOptions.project
    ? path.resolve(mergedOptions.project)
    : findProjectRoot();
  validateProjectRoot(projectRoot, explicitProject);
  const dagFilePath = path.isAbsolute(dagFile) ? dagFile : path.resolve(projectRoot, dagFile);

  if (!mergedOptions.json) {
    console.log('\n🗂️  DAG Supervised Agent Executor');
    console.log('─'.repeat(52));
    console.log(`  DAG file   : ${path.relative(projectRoot, dagFilePath)}`);
    console.log(`  Project    : ${projectRoot}`);
    console.log(`  Mode       : ${mode.toUpperCase()}`);
  }

  if (mergedOptions.dryRun) {
    try {
      const orchestrator = new DagOrchestrator(projectRoot, { verbose: false });
      const dag = await orchestrator.loadDag(dagFilePath);
      if (mergedOptions.json) {
        process.stdout.write(JSON.stringify({ ok: true, dag: dag.name, lanes: dag.lanes.map((l) => l.id) }) + '\n');
      } else {
        console.log(`\n✅ DAG validated: "${dag.name}"`);
        console.log(`   ${dag.lanes.length} lane(s):`);
        for (const lane of dag.lanes) {
          const deps = lane.dependsOn?.length ? ` (after: ${lane.dependsOn.join(', ')})` : '';
          const sup = lane.supervisorFile ? ' 🔍' : '';
          console.log(`     • ${lane.id}${deps}${sup}`);
        }
        if (dag.globalBarriers?.length) {
          console.log(`   ${dag.globalBarriers.length} global barrier(s):`);
          for (const b of dag.globalBarriers) {
            console.log(`     ⏸  ${b.name} [${b.participants.join(', ')}] timeout=${b.timeoutMs}ms`);
          }
        }
        console.log('\n  (dry-run — no lanes executed)\n');
      }
    } catch (err) {
      if (mergedOptions.json) {
        process.stdout.write(JSON.stringify({ ok: false, error: String(err) }) + '\n');
      } else {
        const richError = enrichError(err, ErrorCategory.VALIDATION, [
          'Check DAG JSON syntax',
          'Ensure all referenced agent files exist',
          'Run "ai-kit check" to validate configuration',
        ]);
        exitWithError(richError, { verbose: mergedOptions.verbose });
      }
      process.exit(1);
    }
    return;
  }

  if (!mergedOptions.json) console.log('');

  const budgetCapUSD = mergedOptions.budget !== undefined ? parseFloat(mergedOptions.budget) : undefined;
  if (!mergedOptions.json) {
    if (mergedOptions.budget !== undefined) {
      console.log(`  Budget cap  : $${budgetCapUSD} USD`);
    }
    if (mergedOptions.interactive) {
      console.log('  Interactive : enabled (needs-human-review prompts will pause for operator input)');
    }
    if (mergedOptions.provider) {
      console.log(`  Provider    : ${mergedOptions.provider}`);
    }
  }

  try {
    const orchestrator = new DagOrchestrator(projectRoot, {
      verbose: mergedOptions.json ? false : (mergedOptions.verbose ?? true),
      budgetCapUSD,
      interactive: mergedOptions.interactive,
      forceProvider: mergedOptions.provider,
    });

    // Load DAG to get lane IDs for dashboard
    const dag = await orchestrator.loadDag(dagFilePath);

    // Phase 1.3: Pre-flight cost estimate (unless JSON mode or --yes flag)
    if (!mergedOptions.json && !mergedOptions.yes) {
      try {
        const costEstimate = await estimateDagCost(orchestrator, dagFilePath, projectRoot);
        console.log(formatCostEstimate(costEstimate));

        // Skip confirmation for mock provider (free) or if explicitly bypassed
        if (costEstimate.provider !== 'mock' && costEstimate.totalCost > 0.001) {
          const response = await prompts({
            type: 'confirm',
            name: 'proceed',
            message: `Proceed with execution? (estimated cost: $${costEstimate.totalCost.toFixed(4)})`,
            initial: true,
          });

          if (!response.proceed) {
            console.log('\n❌ Execution cancelled by user.\n');
            process.exit(0);
          }
        }
      } catch (err) {
        // Don't block execution if cost estimation fails
        console.warn(`\n⚠️  Cost estimation failed: ${err}`);
        console.warn('  Proceeding without estimate...\n');
      }
    }

    // 
    // Enable live dashboard if requested (not in JSON mode)
    if (mergedOptions.dashboard && !mergedOptions.json) {
      const bus = getGlobalEventBus();
      renderDashboard(bus, dag.name, dag.lanes.map(l => l.id));
    }

    const result: DagResult = await orchestrator.run(dagFilePath);
    if (mergedOptions.json) {
      process.stdout.write(JSON.stringify(result) + '\n');
    } else {
      printDagSummary(result, projectRoot);
    }
    if (result.status === 'failed') {
      process.exit(1);
    }
  } catch (err) {
    if (mergedOptions.json) {
      process.stdout.write(JSON.stringify({ ok: false, error: String(err) }) + '\n');
    } else {
      const richError = enrichError(err, ErrorCategory.RUNTIME, [
        'Check error message above for details',
        'Verify API keys are valid',
        'Ensure all agent files are valid',
        'Run "ai-kit doctor" to diagnose issues',
        'Try "ai-kit demo" to test with mock provider',
      ]);
      exitWithError(richError, { verbose: mergedOptions.verbose });
    }
    process.exit(1);
  }
};
