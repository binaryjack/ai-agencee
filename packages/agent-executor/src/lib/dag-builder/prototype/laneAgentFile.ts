import type { ILaneBuilder } from '../dag-builder.js';

export function laneAgentFile(this: ILaneBuilder, p: string): ILaneBuilder {
  this._lane.agentFile = p;
  return this;
}
