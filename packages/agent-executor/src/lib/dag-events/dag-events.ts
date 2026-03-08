import { EventEmitter } from 'events'

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

// ─── DagEventBus ─────────────────────────────────────────────────────────────

// DagEventBus extends EventEmitter — kept as class (EventEmitter subclass exception)
export class DagEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitDagStart(event: DagStartEvent): void {
    this._safeEmit('dag:start', event);
  }

  emitDagEnd(event: DagEndEvent): void {
    this._safeEmit('dag:end', event);
  }

  emitLaneStart(event: LaneStartEvent): void {
    this._safeEmit('lane:start', event);
  }

  emitLaneEnd(event: LaneEndEvent): void {
    this._safeEmit('lane:end', event);
  }

  emitLlmCall(event: LlmCallEvent): void {
    this._safeEmit('llm:call', event);
  }

  emitBudgetExceeded(event: BudgetExceededEvent): void {
    this._safeEmit('budget:exceeded', event);
  }

  emitRbacDenied(event: RbacDeniedEvent): void {
    this._safeEmit('rbac:denied', event);
  }

  emitCheckpointComplete(event: CheckpointEvent): void {
    this._safeEmit('checkpoint:complete', event);
  }

  emitTokenStream(event: TokenStreamEvent): void {
    this._safeEmit('token:stream', event);
  }

  on(event: 'dag:start',           listener: (e: DagStartEvent)         => void): this;
  on(event: 'dag:end',             listener: (e: DagEndEvent)           => void): this;
  on(event: 'lane:start',          listener: (e: LaneStartEvent)        => void): this;
  on(event: 'lane:end',            listener: (e: LaneEndEvent)          => void): this;
  on(event: 'llm:call',            listener: (e: LlmCallEvent)          => void): this;
  on(event: 'budget:exceeded',     listener: (e: BudgetExceededEvent)   => void): this;
  on(event: 'rbac:denied',         listener: (e: RbacDeniedEvent)       => void): this;
  on(event: 'checkpoint:complete', listener: (e: CheckpointEvent)       => void): this;
  on(event: 'token:stream',        listener: (e: TokenStreamEvent)      => void): this;
  on(event: string | symbol,       listener: (...args: unknown[]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  once(event: 'dag:start',           listener: (e: DagStartEvent)         => void): this;
  once(event: 'dag:end',             listener: (e: DagEndEvent)           => void): this;
  once(event: 'lane:start',          listener: (e: LaneStartEvent)        => void): this;
  once(event: 'lane:end',            listener: (e: LaneEndEvent)          => void): this;
  once(event: 'llm:call',            listener: (e: LlmCallEvent)          => void): this;
  once(event: 'budget:exceeded',     listener: (e: BudgetExceededEvent)   => void): this;
  once(event: 'rbac:denied',         listener: (e: RbacDeniedEvent)       => void): this;
  once(event: 'checkpoint:complete', listener: (e: CheckpointEvent)       => void): this;
  once(event: 'token:stream',        listener: (e: TokenStreamEvent)      => void): this;
  once(event: string | symbol,       listener: (...args: unknown[]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  private _safeEmit(event: string, payload: unknown): void {
    try {
      super.emit(event, payload);
    } catch {
      // swallow listener errors — the orchestration must not be disrupted
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _globalBus: DagEventBus = new DagEventBus();

export function getGlobalEventBus(): DagEventBus {
  return _globalBus;
}

export function setGlobalEventBus(bus: DagEventBus): DagEventBus {
  const old = _globalBus;
  _globalBus = bus;
  return old;
}
