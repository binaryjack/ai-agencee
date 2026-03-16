import type { ILaneBuilder } from '../dag-builder.js';

export function laneSupervisorFile(this: ILaneBuilder, p: string): ILaneBuilder {
  this._lane.supervisorFile = p;
  return this;
}
