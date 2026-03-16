import type { ILaneBuilder } from '../dag-builder.js';

export function laneDependsOn(this: ILaneBuilder, ...laneIds: string[]): ILaneBuilder {
  this._lane.dependsOn.push(...laneIds);
  return this;
}
