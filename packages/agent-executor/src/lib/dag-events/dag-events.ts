import { EventEmitter } from 'events';

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface DagStartEvent {
  runId: string;
  dagName: string;
  laneIds: string[];
  principal?: string;
  timestamp: string;
}

export interface DagEndEvent {
  runId: string;
  dagName: string;
  durationMs: number;
  status: 'success' | 'partial' | 'failed';
  timestamp: string;
}

export interface LaneStartEvent {
  runId: string;
  laneId: string;
  providerOverride?: string;
  timestamp: string;
}

export interface LaneEndEvent {
  runId: string;
  laneId: string;
  durationMs: number;
  status: 'success' | 'failed' | 'escalated';
  retries: number;
  timestamp: string;
}

export interface LlmCallEvent {
  runId: string;
  laneId: string;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  timestamp: string;
}

export interface BudgetExceededEvent {
  runId: string;
  laneId?: string;
  limitUSD: number;
  actualUSD: number;
  scope: 'run' | 'lane';
  timestamp: string;
}

export interface RbacDeniedEvent {
  runId: string;
  principal: string;
  action: string;
  reason: string;
  timestamp: string;
}

export interface CheckpointEvent {
  runId: string;
  laneId: string;
  checkpointId: string;
  verdict: string;
  retryCount: number;
  durationMs: number;
  timestamp: string;
}

export interface TokenStreamEvent {
  runId: string;
  laneId: string;
  token: string;
  timestamp: string;
}

// ─── Typed Event Map ──────────────────────────────────────────────────────────

export interface DagEventMap {
  'dag:start':         [event: DagStartEvent];
  'dag:end':           [event: DagEndEvent];
  'lane:start':        [event: LaneStartEvent];
  'lane:end':          [event: LaneEndEvent];
  'llm:call':          [event: LlmCallEvent];
  'budget:exceeded':   [event: BudgetExceededEvent];
  'rbac:denied':       [event: RbacDeniedEvent];
  'checkpoint:complete': [event: CheckpointEvent];
  'token:stream':      [event: TokenStreamEvent];
}

// ─── DagEventBus interface ───────────────────────────────────────────────────

export interface DagEventBus {
  emitDagStart(event: DagStartEvent): void
  emitDagEnd(event: DagEndEvent): void
  emitLaneStart(event: LaneStartEvent): void
  emitLaneEnd(event: LaneEndEvent): void
  emitLlmCall(event: LlmCallEvent): void
  emitBudgetExceeded(event: BudgetExceededEvent): void
  emitRbacDenied(event: RbacDeniedEvent): void
  emitCheckpointComplete(event: CheckpointEvent): void
  emitTokenStream(event: TokenStreamEvent): void
  on(event: 'dag:start',           listener: (e: DagStartEvent)         => void): DagEventBus
  on(event: 'dag:end',             listener: (e: DagEndEvent)           => void): DagEventBus
  on(event: 'lane:start',          listener: (e: LaneStartEvent)        => void): DagEventBus
  on(event: 'lane:end',            listener: (e: LaneEndEvent)          => void): DagEventBus
  on(event: 'llm:call',            listener: (e: LlmCallEvent)          => void): DagEventBus
  on(event: 'budget:exceeded',     listener: (e: BudgetExceededEvent)   => void): DagEventBus
  on(event: 'rbac:denied',         listener: (e: RbacDeniedEvent)       => void): DagEventBus
  on(event: 'checkpoint:complete', listener: (e: CheckpointEvent)       => void): DagEventBus
  on(event: 'token:stream',        listener: (e: TokenStreamEvent)      => void): DagEventBus
  on(event: string | symbol,       listener: (...args: unknown[]) => void): DagEventBus
  once(event: 'dag:start',           listener: (e: DagStartEvent)         => void): DagEventBus
  once(event: 'dag:end',             listener: (e: DagEndEvent)           => void): DagEventBus
  once(event: 'lane:start',          listener: (e: LaneStartEvent)        => void): DagEventBus
  once(event: 'lane:end',            listener: (e: LaneEndEvent)          => void): DagEventBus
  once(event: 'llm:call',            listener: (e: LlmCallEvent)          => void): DagEventBus
  once(event: 'budget:exceeded',     listener: (e: BudgetExceededEvent)   => void): DagEventBus
  once(event: 'rbac:denied',         listener: (e: RbacDeniedEvent)       => void): DagEventBus
  once(event: 'checkpoint:complete', listener: (e: CheckpointEvent)       => void): DagEventBus
  once(event: 'token:stream',        listener: (e: TokenStreamEvent)      => void): DagEventBus
  once(event: string | symbol,       listener: (...args: unknown[]) => void): DagEventBus
  removeListener(event: 'dag:start',           listener: (e: DagStartEvent)         => void): DagEventBus
  removeListener(event: 'dag:end',             listener: (e: DagEndEvent)           => void): DagEventBus
  removeListener(event: 'lane:start',          listener: (e: LaneStartEvent)        => void): DagEventBus
  removeListener(event: 'lane:end',            listener: (e: LaneEndEvent)          => void): DagEventBus
  removeListener(event: 'llm:call',            listener: (e: LlmCallEvent)          => void): DagEventBus
  removeListener(event: 'budget:exceeded',     listener: (e: BudgetExceededEvent)   => void): DagEventBus
  removeListener(event: 'rbac:denied',         listener: (e: RbacDeniedEvent)       => void): DagEventBus
  removeListener(event: 'checkpoint:complete', listener: (e: CheckpointEvent)       => void): DagEventBus
  removeListener(event: 'token:stream',        listener: (e: TokenStreamEvent)      => void): DagEventBus
  removeListener(event: string | symbol,       listener: (...args: unknown[]) => void): DagEventBus
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createDagEventBus(): DagEventBus {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(100)

  const safeEmit = (event: string, payload: unknown): void => {
    try {
      emitter.emit(event, payload)
    } catch {
      // swallow listener errors — the orchestration must not be disrupted
    }
  }

  const bus: DagEventBus = {
    emitDagStart:           (e) => safeEmit('dag:start', e),
    emitDagEnd:             (e) => safeEmit('dag:end', e),
    emitLaneStart:          (e) => safeEmit('lane:start', e),
    emitLaneEnd:            (e) => safeEmit('lane:end', e),
    emitLlmCall:            (e) => safeEmit('llm:call', e),
    emitBudgetExceeded:     (e) => safeEmit('budget:exceeded', e),
    emitRbacDenied:         (e) => safeEmit('rbac:denied', e),
    emitCheckpointComplete: (e) => safeEmit('checkpoint:complete', e),
    emitTokenStream:        (e) => safeEmit('token:stream', e),
    on: ((event: string | symbol, listener: (...args: unknown[]) => void): DagEventBus => {
      emitter.on(event, listener as Parameters<EventEmitter['on']>[1])
      return bus
    }) as DagEventBus['on'],
    once: ((event: string | symbol, listener: (...args: unknown[]) => void): DagEventBus => {
      emitter.once(event, listener as Parameters<EventEmitter['once']>[1])
      return bus
    }) as DagEventBus['once'],
    removeListener: ((event: string | symbol, listener: (...args: unknown[]) => void): DagEventBus => {
      emitter.removeListener(event, listener as Parameters<EventEmitter['removeListener']>[1])
      return bus
    }) as DagEventBus['removeListener'],
  }
  return bus
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _globalBus: DagEventBus = createDagEventBus();

export function getGlobalEventBus(): DagEventBus {
  return _globalBus;
}

export function setGlobalEventBus(bus: DagEventBus): DagEventBus {
  const old = _globalBus;
  _globalBus = bus;
  return old;
}
