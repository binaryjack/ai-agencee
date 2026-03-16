import type { ILaneBuilder } from '../dag-builder.js';

export function laneCapability(this: ILaneBuilder, cap: string): ILaneBuilder {
  this._lane.capabilities.push(cap);
  return this;
}
