import type { CheckDefinition } from '../../agent-types.js';
import type { ILaneBuilder } from '../dag-builder.js';

export function laneCheck(this: ILaneBuilder, definition: CheckDefinition): ILaneBuilder {
  (this._lane.checks ??= []).push(definition);
  return this;
}
