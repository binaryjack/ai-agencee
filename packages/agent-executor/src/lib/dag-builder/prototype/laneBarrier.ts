import type { IDagBuilder, ILaneBuilder } from '../dag-builder.js';

export function laneBarrier(
  this:  ILaneBuilder,
  name:  string,
  mode:  'hard' | 'soft',
  opts:  { participants?: string[]; timeoutMs?: number } = {},
): IDagBuilder {
  return this._parent.barrier(name, mode, opts);
}
