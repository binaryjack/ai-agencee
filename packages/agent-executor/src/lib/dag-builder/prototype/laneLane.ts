import type { BuiltLaneDefinition, ILaneBuilder } from '../dag-builder.js';

export function laneLane(
  this: ILaneBuilder,
  id:   string,
  opts: Partial<Omit<BuiltLaneDefinition, 'id'>> & { provider?: string } = {},
): ILaneBuilder {
  return this._parent.lane(id, opts);
}
