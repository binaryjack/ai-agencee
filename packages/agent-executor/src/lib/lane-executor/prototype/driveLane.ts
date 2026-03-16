import * as path from 'path';
import type { AgentResult } from '../../agent-types.js';
import { getGlobalEventBus } from '../../dag-events/index.js';
import type {
  BarrierResolution,
  CheckpointPayload,
  CheckpointRecord,
  ContractExports,
  ContractSnapshot,
  LaneDefinition,
  SupervisorVerdict,
} from '../../dag-types.js';
import { VERDICT } from '../../dag-types.js';
import { IntraSupervisor } from '../../intra-supervisor/index.js';
import type { IModelRouter, RoutedResponse } from '../../model-router/index.js';
import { getGlobalTracer } from '../../otel.js';
import { EscalationError, SupervisedAgent } from '../../supervised-agent/index.js';
import type { ILaneExecutor } from '../lane-executor.js';

export async function driveLane(
  this:        ILaneExecutor,
  lane:        LaneDefinition,
  checkpoints: CheckpointRecord[],
  counters:    { retries: { count: number }; handoffsRef: { count: number } },
): Promise<AgentResult | null> {
  const agentFilePath = path.resolve(this._agentsBaseDir, lane.agentFile);
  const agent         = await SupervisedAgent.fromFile(agentFilePath);

  let supervisor = lane.supervisorFile
    ? await IntraSupervisor.fromFile(path.resolve(this._agentsBaseDir, lane.supervisorFile))
    : IntraSupervisor.noOp(lane.id);

  const publishContract = (): ContractSnapshot => {
    return this._registry.getSnapshot(lane.id) ?? {
      laneId:    lane.id,
      version:   0,
      timestamp: new Date().toISOString(),
      exports:   {} as ContractExports,
      pending:   [],
    };
  };

  const pendingCosts: RoutedResponse[] = [];
  const onLlmResponse = (resp: RoutedResponse): void => {
    if (this._costTracker) pendingCosts.push(resp);
    if (this._auditLog) {
      const costUSD = resp.usage
        ? (resp.usage.inputTokens * 0.000003 + resp.usage.outputTokens * 0.000015) : 0;
      const llmSpan = getGlobalTracer().startLlmCall(lane.id, resp.model ?? 'unknown');
      llmSpan.setAttribute('llm.model',         resp.model ?? 'unknown')
             .setAttribute('llm.input_tokens',  resp.usage?.inputTokens ?? 0)
             .setAttribute('llm.output_tokens', resp.usage?.outputTokens ?? 0)
             .setAttribute('llm.cost_usd',      costUSD)
             .end();
      void this._auditLog.llmCall(lane.id, lane.id, resp.model ?? 'unknown', costUSD);
    }
    const llmCostUSD = resp.usage
      ? (resp.usage.inputTokens * 0.000003 + resp.usage.outputTokens * 0.000015) : 0;
    getGlobalEventBus().emitLlmCall({
      runId:            this._runId,
      laneId:           lane.id,
      model:            resp.model ?? 'unknown',
      provider:         resp.provider,
      inputTokens:      resp.usage?.inputTokens ?? 0,
      outputTokens:     resp.usage?.outputTokens ?? 0,
      estimatedCostUSD: llmCostUSD,
      timestamp:        new Date().toISOString(),
    });
  };

  const onLlmStream = (token: string): void => {
    process.stdout.write(token);
    getGlobalEventBus().emitTokenStream({
      runId:     this._runId,
      laneId:    lane.id,
      token,
      timestamp: new Date().toISOString(),
    });
  };

  const effectiveRouter: IModelRouter | undefined = lane.providerOverride && this._modelRouter
    ? this._modelRouter.withProviderOverride(lane.providerOverride)
    : this._modelRouter;

  const generator = agent.run(
    this._projectRoot, 'self', publishContract, effectiveRouter, onLlmResponse, onLlmStream,
  );

  let currentVerdict: SupervisorVerdict = { type: VERDICT.APPROVE };
  let iteration = await generator.next(currentVerdict);

  while (!iteration.done) {
    const payload: CheckpointPayload = iteration.value;
    const checkpointStartMs = Date.now();

    for (const resp of pendingCosts.splice(0)) {
      this._costTracker?.record(lane.id, payload.checkpointId, resp);
    }

    if (payload.contracts) {
      this._registry.publish(lane.id, payload.contracts);
    }

    const supervisorRule    = supervisor.getRuleFor(payload.checkpointId);
    const effectivePayload: CheckpointPayload = supervisorRule
      ? {
          ...payload,
          mode:      supervisorRule.mode,
          waitFor:   supervisorRule.waitFor   ?? payload.waitFor,
          timeoutMs: supervisorRule.timeoutMs ?? payload.timeoutMs,
        }
      : payload;

    const barrierPayload: CheckpointPayload =
      effectivePayload.mode === 'needs-human-review'
        ? { ...effectivePayload, mode: 'self' }
        : effectivePayload;

    const barrierResolution: BarrierResolution = await this._coordinator.resolve(barrierPayload);

    let verdict: SupervisorVerdict = supervisor.evaluate(
      payload.checkpointId,
      payload.partialResult,
      barrierResolution,
    );

    if (this._interactive && effectivePayload.mode === 'needs-human-review') {
      verdict = await this._humanReviewGate.prompt(effectivePayload, verdict);
    }

    let retryCount = 0;

    if (verdict.type === VERDICT.RETRY) {
      if (supervisor.isExhausted(payload.checkpointId)) {
        verdict = {
          type:     VERDICT.ESCALATE,
          reason:   `Retry budget exhausted for checkpoint "${payload.checkpointId}"`,
          evidence: { checkpointId: payload.checkpointId, laneId: lane.id },
        };
      } else {
        retryCount = supervisor.incrementRetry(payload.checkpointId);
        counters.retries.count++;
      }
    }

    if (verdict.type === VERDICT.HANDOFF) {
      verdict = this.resolveHandoffTarget(verdict, lane.id);

      if (verdict.type === VERDICT.HANDOFF && verdict.targetLaneId) {
        const specialistLaneId = verdict.targetLaneId;
        const specialistLane   = await this.findHandoffLane(specialistLaneId, lane);

        if (specialistLane) {
          counters.handoffsRef.count++;
          const handoffResult = await this.runLane(specialistLane);
          checkpoints.push(
            this.buildRecord(effectivePayload, verdict, retryCount, barrierResolution, checkpointStartMs),
          );

          if (handoffResult.agentResult) {
            currentVerdict = { type: VERDICT.APPROVE };
            iteration      = await generator.next(currentVerdict);
            continue;
          }
        }

        verdict = {
          type:     VERDICT.ESCALATE,
          reason:   `HANDOFF target lane "${specialistLaneId}" not found or failed`,
          evidence: { originalVerdict: verdict, laneId: lane.id },
        };
      }
    }

    checkpoints.push(
      this.buildRecord(effectivePayload, verdict, retryCount, barrierResolution, checkpointStartMs),
    );

    if (verdict.type === VERDICT.ESCALATE) {
      await generator.return(null);
      throw new EscalationError(verdict.reason ?? 'Escalated', verdict);
    }

    iteration = await generator.next(verdict);
  }

  return iteration.value as AgentResult | null;
}
