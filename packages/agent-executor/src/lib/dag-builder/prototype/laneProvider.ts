import type { ILaneBuilder } from '../dag-builder.js';

export function laneProvider(this: ILaneBuilder, name: string): ILaneBuilder {
  this._lane.providerOverride = name;
  return this;
}
