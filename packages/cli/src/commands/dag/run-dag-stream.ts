/**
 * CLI Command: ai-kit agent:run-stream
 *
 * Runs a DAG and streams execution events as NDJSON to stdout in real time.
 * Used by the VS Code extension (Codernic Agent mode live lane panel).
 *
 * Event types (NDJSON, one per line):
 *   {"type":"run-start","dagName":"...","laneIds":["backend","frontend"],"runId":"..."}
 *   {"type":"lane-start","laneId":"backend","timestamp":"..."}
 *   {"type":"lane-end","laneId":"backend","status":"success","durationMs":4200,"retries":0}
 *   {"type":"checkpoint","laneId":"backend","checkpointId":"compile","verdict":"PASS","retryCount":0,"durationMs":800}
 *   {"type":"llm-cost","laneId":"backend","estimatedCostUSD":0.0042}
 *   {"type":"run-end","status":"success","durationMs":12000,"totalCostUSD":0.021}
 *   {"type":"error","message":"..."}
 */

import { DagOrchestrator, getGlobalEventBus } from '@ai-agencee/engine';
import * as path from 'path';
import { findProjectRoot, validateProjectRoot } from './find-project-root.js';

type StreamRunOptions = {
  project?: string;
  provider?: string;
  budget?: string;
};

/** Emit a single NDJSON event line to stdout. */
function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

export const runDagStream = async (
  dagFile: string,
  options: StreamRunOptions = {},
): Promise<void> => {
  const explicitProject = Boolean(options.project);
  const projectRoot = options.project
    ? path.resolve(options.project)
    : findProjectRoot();
  validateProjectRoot(projectRoot, explicitProject);

  const dagFilePath = path.isAbsolute(dagFile)
    ? dagFile
    : path.resolve(projectRoot, dagFile);

  const budgetCapUSD = options.budget !== undefined ? parseFloat(options.budget) : undefined;

  // Subscribe to the global event bus BEFORE creating the orchestrator
  const bus = getGlobalEventBus();

  let runningCostUSD = 0;

  bus.on('dag:start', (e) => {
    emit({ type: 'run-start', dagName: e.dagName, laneIds: e.laneIds, runId: e.runId });
  });

  bus.on('lane:start', (e) => {
    emit({ type: 'lane-start', laneId: e.laneId, timestamp: e.timestamp });
  });

  bus.on('lane:end', (e) => {
    emit({ type: 'lane-end', laneId: e.laneId, status: e.status, durationMs: e.durationMs, retries: e.retries });
  });

  bus.on('checkpoint:complete', (e) => {
    emit({ type: 'checkpoint', laneId: e.laneId, checkpointId: e.checkpointId, verdict: e.verdict, retryCount: e.retryCount, durationMs: e.durationMs });
  });

  bus.on('llm:call', (e) => {
    runningCostUSD += e.estimatedCostUSD;
    emit({ type: 'llm-cost', laneId: e.laneId, estimatedCostUSD: e.estimatedCostUSD, runningTotalUSD: runningCostUSD });
  });

  bus.on('budget:exceeded', (e) => {
    emit({ type: 'budget-exceeded', limitUSD: e.limitUSD, actualUSD: e.actualUSD });
  });

  try {
    const orchestrator = new DagOrchestrator(projectRoot, {
      verbose: false,
      budgetCapUSD,
      forceProvider: options.provider,
    });

    const startMs = Date.now();
    const result = await orchestrator.run(dagFilePath);
    const durationMs = Date.now() - startMs;

    emit({
      type: 'run-end',
      status: result.status,
      durationMs,
      totalCostUSD: runningCostUSD,
      lanes: result.lanes.map((l) => ({ id: l.laneId, status: l.status })),
    });

    if (result.status === 'failed') {
      process.exit(1);
    }
  } catch (err) {
    emit({ type: 'error', message: String(err) });
    process.exit(1);
  }
};
