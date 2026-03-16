import type { BuiltGlobalBarrier, IDagBuilder } from '../dag-builder.js';

export function dagBarrier(
  this:  IDagBuilder,
  name:  string,
  mode:  'hard' | 'soft' = 'hard',
  opts:  { participants?: string[]; timeoutMs?: number } = {},
): IDagBuilder {
  if (this._currentLane) {
    this._lanes.push(this._currentLane);
    this._currentLane = undefined;
  }
  const participants = opts.participants ?? this._lanes.map((l) => l._build().id);
  const barrier: BuiltGlobalBarrier = { name, mode, participants, timeoutMs: opts.timeoutMs };
  this._barriers.push(barrier);
  return this;
}
