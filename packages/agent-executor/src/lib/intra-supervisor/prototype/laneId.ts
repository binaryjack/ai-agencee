import type { IIntraSupervisor } from '../intra-supervisor.js';

export function laneId(this: IIntraSupervisor): string {
  return this._config.laneId;
}
