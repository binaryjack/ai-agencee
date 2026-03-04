import { randomUUID } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { BarrierCoordinator } from './barrier-coordinator.js'
import { ContractRegistry } from './contract-registry.js'
import { CostTracker } from './cost-tracker.js'
import { DagPlanner } from './dag-planner.js'
import { DagResultBuilder } from './dag-result-builder.js'
import {
  DagDefinition,
  DagResult,
  LaneResult,
} from './dag-types.js'
import { runLane } from './lane-executor.js'
import { SamplingCallback } from './llm-provider.js'
import { ModelRouterFactory } from './model-router-factory.js'
import { ModelRouter } from './model-router.js'

// â”€â”€â”€ DagRunOptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DagRunOptions {
  verbose?: boolean;
  resultsDir?: string;
  /** USD spend cap for the entire run. Lanes stop when the cap is exceeded. */
  budgetCapUSD?: number;
  /** Pause at needs-human-review checkpoints and prompt the operator for a decision. */
  interactive?: boolean;
  /**
   * Path to a model-router.json file (relative to projectRoot).
   * Overrides dag.json's modelRouterFile field when provided.
   */
  modelRouterFile?: string;
  /**
   * Override the directory that contains agent/supervisor JSON files.
   * When not set, defaults to the directory of the dag.json file itself.
   */
  agentsBaseDir?: string;
  /**
   * Inject a VS Code sampling callback (MCP server context).
   * When provided a VSCodeSamplingProvider is registered as 'vscode' and set
   * as the default provider, bypassing the need for API keys.
   */
  samplingCallback?: SamplingCallback;
}

// â”€â”€â”€ DagOrchestrator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Top-level DAG execution engine.
 *
 * Responsibilities:
 *   1. Load + validate a dag.json        â†’ delegated to DagPlanner
 *   2. Topological sort â†’ execution groups â†’ delegated to DagPlanner
 *   3. Promise.allSettled per group       â†’ parallel lane execution
 *   4. Shared ContractRegistry + BarrierCoordinator across all lanes
 *   5. Merge LaneResults â†’ DagResult     â†’ delegated to DagResultBuilder
 *   6. Persist result to .agents/results/ â†’ delegated to DagResultBuilder
 *
 * Usage:
 *   const result = await DagOrchestrator.run('agents/dag.json', projectRoot);
 */
export class DagOrchestrator {
  private readonly projectRoot: string;
  private readonly resultsDir: string;
  private readonly options: DagRunOptions;
  private verbose: boolean;

  constructor(projectRoot: string, options?: DagRunOptions) {
    this.projectRoot = projectRoot;
    this.options     = options ?? {};
    this.verbose     = options?.verbose ?? false;
    this.resultsDir  =
      options?.resultsDir ?? path.join(projectRoot, '.agents', 'results');
  }

  // â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Load a dag.json file, validate it, then execute all lanes */
  async run(dagFile: string): Promise<DagResult> {
    const dagPath = path.isAbsolute(dagFile) ? dagFile : path.resolve(this.projectRoot, dagFile);
    const dagDir  = path.dirname(dagPath);
    const dag     = await this.loadDag(dagPath);
    return this.execute(dag, dagDir);
  }

  /**
   * Execute a pre-loaded DagDefinition.
   * @param dag    Parsed DAG definition
   * @param dagDir Directory of the dag.json â€” used to resolve agent/supervisor/router paths.
   *               Defaults to projectRoot when not provided.
   */
  async execute(dag: DagDefinition, dagDir?: string): Promise<DagResult> {
    const agentsBaseDir = this.options.agentsBaseDir ?? dagDir ?? this.projectRoot;
    const runId         = randomUUID();
    const startedAt     = new Date().toISOString();
    const startMs       = Date.now();

    this.log(`\nðŸš€  Starting DAG run: ${dag.name}  [${runId}]`);
    this.log(`   ${dag.description}\n`);

    // â”€ Cost tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let aborted = false;
    const costTracker =
      this.options.budgetCapUSD !== undefined
        ? new CostTracker(runId, this.options.budgetCapUSD, () => {
            aborted = true;
            this.log(`\nðŸ’¸  Budget cap of $${this.options.budgetCapUSD} USD exceeded â€” aborting remaining lane groups`);
          })
        : undefined;

    // â”€ Model router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const routerFile = this.options.modelRouterFile ?? dag.modelRouterFile;
    const modelRouter: ModelRouter | undefined = await ModelRouterFactory.create({
      routerFilePath:   routerFile,
      samplingCallback: this.options.samplingCallback,
      agentsBaseDir,
      log: (msg) => this.log(msg),
    });

    // â”€ Shared infrastructure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const registry       = new ContractRegistry();
    const coordinator    = new BarrierCoordinator(registry);
    const capabilityRegistry = DagPlanner.buildCapabilityRegistry(dag);

    // â”€ Topological execution order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const groups = DagPlanner.topologicalSort(dag.lanes);
    this.log(
      `   Execution plan: ${groups
        .map((g, i) => `Group ${i + 1}: [${g.map((l) => l.id).join(', ')}]`)
        .join(' â†’ ')}\n`,
    );

    const allLaneResults: LaneResult[] = [];

    for (let gi = 0; gi < groups.length; gi++) {
      if (aborted) break;

      const group = groups[gi];
      this.log(`â–¶  Group ${gi + 1}/${groups.length}: ${group.map((l) => l.id).join(' + ')}`);

      const groupStartMs = Date.now();
      const settled = await Promise.allSettled(
        group.map((lane) =>
          runLane(
            lane, this.projectRoot, registry, coordinator,
            capabilityRegistry, modelRouter, costTracker,
            this.options.interactive, agentsBaseDir,
          ),
        ),
      );

      for (let li = 0; li < settled.length; li++) {
        const outcome = settled[li];
        const lane    = group[li];

        if (outcome.status === 'fulfilled') {
          allLaneResults.push(outcome.value);
          const s    = outcome.value.status;
          const icon = s === 'success' ? 'âœ…' : s === 'escalated' ? 'ðŸš¨' : 'âŒ';
          this.log(
            `   ${icon} [${lane.id}] ${s} â€” ${outcome.value.checkpoints.length} checkpoints, ` +
            `${outcome.value.totalRetries} retries, ${outcome.value.durationMs}ms`,
          );
        } else {
          allLaneResults.push({
            laneId:           lane.id,
            status:           'failed',
            checkpoints:      [],
            totalRetries:     0,
            handoffsReceived: 0,
            startedAt:        new Date().toISOString(),
            completedAt:      new Date().toISOString(),
            durationMs:       Date.now() - groupStartMs,
            error:            String(outcome.reason),
          });
          this.log(`   âŒ [${lane.id}] failed â€” ${outcome.reason}`);
        }
      }

      // Handle global barriers that follow this group
      if (dag.globalBarriers) {
        for (const barrier of dag.globalBarriers) {
          const groupLaneIds                 = new Set(group.map((l) => l.id));
          const barrierParticipantsInGroup   = barrier.participants.filter((p) =>
            groupLaneIds.has(p),
          );
          if (barrierParticipantsInGroup.length === barrier.participants.length) {
            this.log(`â³  Global barrier "${barrier.name}" â€” waiting for all participantsâ€¦`);
            const resolution = await coordinator.resolveGlobalBarrier(
              barrier.participants,
              barrier.timeoutMs,
            );
            if (!resolution.resolved) {
              this.log(`âš ï¸   Barrier "${barrier.name}" timed out for: ${resolution.timedOut.join(', ')}`);
            } else {
              this.log(`âœ…  Barrier "${barrier.name}" resolved`);
            }
          }
        }
      }
    }

    const completedAt    = new Date().toISOString();
    const totalDurationMs = Date.now() - startMs;

    const dagResult = DagResultBuilder.build({
      dagName: dag.name,
      runId,
      laneResults: allLaneResults,
      startedAt,
      completedAt,
      totalDurationMs,
    });

    this.log(
      `\n${dagResult.status === 'success' ? 'âœ…' : dagResult.status === 'partial' ? 'âš ï¸ ' : 'âŒ'}` +
      `  DAG complete: ${dagResult.status.toUpperCase()} in ${totalDurationMs}ms`,
    );
    this.log(`   ${dagResult.findings.length} findings, ${dagResult.recommendations.length} recommendations\n`);

    await DagResultBuilder.save(dagResult, this.resultsDir, this.projectRoot, (m) => this.log(m));

    // Cost report
    if (costTracker) {
      this.log(costTracker.formatReport());
      await costTracker.save(this.resultsDir);
    }

    return dagResult;
  }

  // â”€â”€â”€ Load & Validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async loadDag(dagFilePath: string): Promise<DagDefinition> {
    const raw = await fs.readFile(dagFilePath, 'utf-8');
    const dag: DagDefinition = JSON.parse(raw);
    DagPlanner.validateDag(dag);
    return dag;
  }

  // â”€â”€â”€ Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private log(msg: string): void {
    if (this.verbose) {
      process.stdout.write(msg + '\n');
    }
  }
}
