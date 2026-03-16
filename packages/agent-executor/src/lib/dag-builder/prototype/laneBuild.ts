import type { BuiltLaneDefinition, ILaneBuilder } from '../dag-builder.js';

export function laneBuild(this: ILaneBuilder): BuiltLaneDefinition {
  return { ...this._lane };
}
