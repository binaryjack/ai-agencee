import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { AuditLog } from '../../audit-log/index.js';
import { BarrierCoordinator } from '../../barrier-coordinator/index.js';
import { ContractRegistry } from '../../contract-registry/index.js';
import { CostTracker } from '../../cost-tracker/index.js';
import { getGlobalEventBus } from '../../dag-events/index.js';
import { DagPlanner } from '../../dag-planner/index.js';
import { DagResultBuilder } from '../../dag-result-builder/index.js';
import type { DagDefinition, DagResult, LaneResult } from '../../dag-types.js';
import { runLane } from '../../lane-executor/index.js';
import { ModelRouterFactory } from '../../model-router-factory/index.js';
import type { IModelRouter } from '../../model-router/index.js';
import { getGlobalTracer } from '../../otel.js';
import { createInjectionSafeProvider } from '../../prompt-injection-detector/index.js';
import { RateLimiter } from '../../rate-limiter/index.js';
import { RbacPolicy } from '../../rbac/index.js';
import { RunRegistry } from '../../run-registry/index.js';
import {
  createDefaultSecretsProvider,
  injectSecretsToEnv,
} from '../../secrets/index.js';
import type { IDagOrchestrator } from '../dag-orchestrator.js';

export async function execute(
  this: IDagOrchestrator,
  dag:     DagDefinition,
  dagDir?: string,
): Promise<DagResult> {
  const agentsBaseDir = this._options.agentsBaseDir ?? dagDir ?? this._projectRoot;
  const runId         = randomUUID();
  const startedAt     = new Date().toISOString();
  const startMs       = Date.now();

  this._log(`\n🚀  Starting DAG run: ${dag.name}  [${runId}]`);
  this._log(`   ${dag.description}\n`);

  const secretsProvider = this._options.secrets ?? createDefaultSecretsProvider(this._projectRoot);
  await injectSecretsToEnv(secretsProvider, this._options.extraSecretKeys);

  const runRegistry = new RunRegistry(this._projectRoot);
  const runPaths    = await runRegistry.create(runId, dag.name);

  getGlobalEventBus().emitDagStart({
    runId,
    dagName:   dag.name,
    laneIds:   dag.lanes.map((l) => l.id),
    principal: this._options.principal,
    timestamp: startedAt,
  });

  const auditLog = new AuditLog(this._projectRoot, runId, runPaths.auditDir);
  await auditLog.open();
  await auditLog.runStart({ dagName: dag.name, lanes: dag.lanes.map((l) => l.id) });

  const principal = this._options.principal ?? RbacPolicy.resolvePrincipal();
  const rbac      = this._options.rbacPolicy ?? await RbacPolicy.load(this._projectRoot);
  this._log(`   Principal: ${principal}`);
  void auditLog.decision(principal, 'run-start', JSON.stringify(rbac.summarize()));

  const rateLimiter = new RateLimiter(this._projectRoot);
  const rateLimits  = rbac.getRateLimits(principal);
  if (rateLimits) {
    await rateLimiter.assertWithinLimits(principal, rateLimits);
  }
  let releaseRateLimit: (() => void) | undefined;
  if (rateLimits) {
    releaseRateLimit = await rateLimiter.acquireRun(principal);
  }

  const rootSpan = getGlobalTracer().startDagRun(runId, dag.name);

  let aborted = false;
  const costTracker =
    this._options.budgetCapUSD !== undefined
      ? new CostTracker(runId, this._options.budgetCapUSD, () => {
          aborted = true;
          this._log(
            `\n💸  Budget cap of $${this._options.budgetCapUSD} USD exceeded — ` +
            `aborting remaining lane groups`,
          );
          getGlobalEventBus().emitBudgetExceeded({
            runId,
            limitUSD:  this._options.budgetCapUSD!,
            actualUSD: this._options.budgetCapUSD!,
            scope:     'run',
            timestamp: new Date().toISOString(),
          });
        })
      : undefined;

  const routerFile    = this._options.modelRouterFile ?? dag.modelRouterFile;
  const modelRouter: IModelRouter | undefined = await ModelRouterFactory.create({
    routerFilePath:   routerFile,
    samplingCallback: this._options.samplingCallback,
    agentsBaseDir,
    forceProvider:    this._options.forceProvider,
    mockResponses:    this._options.mockResponses,
    log: (msg) => this._log(msg),
  });

  const injCfg = this._options.injectionDetection;
  if (modelRouter && injCfg?.enabled) {
    modelRouter.wrapAllProviders((p) =>
      createInjectionSafeProvider(p, {
        mode:             injCfg.mode ?? 'warn',
        skipRoles:        injCfg.skipRoles,
        customSignatures: injCfg.customSignatures,
      }),
    );
    this._log(`   🔍 Prompt injection detection enabled (mode=${injCfg.mode ?? 'warn'})`);
  }

  const registry           = new ContractRegistry();
  const coordinator        = new BarrierCoordinator(registry);
  const capabilityRegistry = DagPlanner.buildCapabilityRegistry(dag);

  const groups = DagPlanner.topologicalSort(dag.lanes);
  this._log(
    `   Execution plan: ${groups
      .map((g, i) => `Group ${i + 1}: [${g.map((l) => l.id).join(', ')}]`)
      .join(' → ')}\n`,
  );

  const allLaneResults: LaneResult[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    if (aborted) break;

    const group          = groups[gi];
    const lanePerms      = rbac.checkLanes(principal, group.map((l) => l.id));
    const permittedGroup = group.filter((l) => {
      if (!lanePerms[l.id]) {
        this._log(
          `   ⛔ [${l.id}] skipped — principal "${principal}" does not have run permission`,
        );
        getGlobalEventBus().emitRbacDenied({
          runId,
          principal,
          action:    `run-lane:${l.id}`,
          reason:    `Principal "${principal}" does not have run permission for lane "${l.id}"`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
      return true;
    });
    this._log(
      `▶  Group ${gi + 1}/${groups.length}: ${permittedGroup.map((l) => l.id).join(' + ')}`,
    );

    const groupStartMs = Date.now();
    const settled      = await Promise.allSettled(
      permittedGroup.map((lane) =>
        runLane(
          lane, this._projectRoot, registry, coordinator,
          capabilityRegistry, modelRouter, costTracker,
          this._options.interactive, agentsBaseDir, auditLog, runPaths.checkpointsDir, runId,
        ),
      ),
    );

    for (let li = 0; li < settled.length; li++) {
      const outcome = settled[li];
      const lane    = permittedGroup[li];

      if (outcome.status === 'fulfilled') {
        allLaneResults.push(outcome.value);
        const s    = outcome.value.status;
        const icon = s === 'success' ? '✅' : s === 'escalated' ? '🚨' : '❌';
        this._log(
          `   ${icon} [${lane.id}] ${s} — ${outcome.value.checkpoints.length} checkpoints, ` +
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
        this._log(`   ❌ [${lane.id}] failed — ${outcome.reason}`);
      }
    }

    if (dag.globalBarriers) {
      for (const barrier of dag.globalBarriers) {
        const groupLaneIds               = new Set(group.map((l) => l.id));
        const barrierParticipantsInGroup = barrier.participants.filter((p) =>
          groupLaneIds.has(p),
        );
        if (barrierParticipantsInGroup.length === barrier.participants.length) {
          this._log(`⏳  Global barrier "${barrier.name}" — waiting for all participants…`);
          const resolution = await coordinator.resolveGlobalBarrier(
            barrier.participants,
            barrier.timeoutMs,
          );
          if (!resolution.resolved) {
            this._log(
              `⚠️   Barrier "${barrier.name}" timed out for: ${resolution.timedOut.join(', ')}`,
            );
          } else {
            this._log(`✅  Barrier "${barrier.name}" resolved`);
          }
        }
      }
    }
  }

  const completedAt     = new Date().toISOString();
  const totalDurationMs = Date.now() - startMs;

  const dagResult = DagResultBuilder.build({
    dagName: dag.name,
    runId,
    laneResults:    allLaneResults,
    startedAt,
    completedAt,
    totalDurationMs,
  });

  getGlobalEventBus().emitDagEnd({
    runId,
    dagName:    dag.name,
    durationMs: totalDurationMs,
    status:     dagResult.status as 'success' | 'partial' | 'failed',
    timestamp:  completedAt,
  });

  this._log(
    `\n${dagResult.status === 'success' ? '✅' : dagResult.status === 'partial' ? '⚠️ ' : '❌'}` +
    `  DAG complete: ${dagResult.status.toUpperCase()} in ${totalDurationMs}ms`,
  );
  this._log(
    `   ${dagResult.findings.length} findings, ` +
    `${dagResult.recommendations.length} recommendations\n`,
  );

  await DagResultBuilder.save(
    dagResult, this._resultsDir, this._projectRoot, (m) => this._log(m),
  );

  if (costTracker) {
    this._log(costTracker.formatReport());
    await costTracker.save(runPaths.resultsDir);
  }

  rootSpan
    .setAttribute('dag.name',   dag.name)
    .setAttribute('dag.runId',  runId)
    .setAttribute('dag.status', dagResult.status)
    .setStatus(dagResult.status === 'failed' ? 'error' : 'ok')
    .end();

  await auditLog.runEnd(totalDurationMs, {
    status:   dagResult.status,
    findings: dagResult.findings.length,
  });
  await auditLog.close();

  await runRegistry.complete(
    runId,
    dagResult.status as import('../../run-registry/run-registry.types.js').RunStatus,
    totalDurationMs,
  );

  releaseRateLimit?.();
  if (rateLimits && costTracker) {
    const report = costTracker.summary();
    await rateLimiter
      .recordTokens(principal, report.totalInputTokens, report.totalOutputTokens)
      .catch(() => undefined);
  }

  return dagResult;
}
