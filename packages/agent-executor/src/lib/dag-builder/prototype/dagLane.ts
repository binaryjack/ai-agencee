import type { BuiltLaneDefinition, IDagBuilder, ILaneBuilder } from '../dag-builder.js';
import { LaneBuilder } from '../dag-builder.js';

export function dagLane(
  this: IDagBuilder,
  id:   string,
  opts: Partial<Omit<BuiltLaneDefinition, 'id'>> & { provider?: string } = {},
): ILaneBuilder {
  if (this._currentLane) {
    this._lanes.push(this._currentLane);
  }
  const lb = new LaneBuilder(
    id,
    { ...opts, providerOverride: opts.provider ?? opts.providerOverride },
    this,
  );
  this._currentLane = lb;
  return lb;
}
