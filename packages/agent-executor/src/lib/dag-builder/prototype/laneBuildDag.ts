import type { BuiltDagDefinition, ILaneBuilder } from '../dag-builder.js';

export function laneBuildDag(this: ILaneBuilder): BuiltDagDefinition {
  return this._parent.build();
}
