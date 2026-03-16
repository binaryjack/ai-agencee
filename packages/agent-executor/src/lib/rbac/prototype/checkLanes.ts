import type { IRbacPolicy } from '../rbac.js';

export function checkLanes(
  this:      IRbacPolicy,
  principal: string,
  laneIds:   string[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const id of laneIds) {
    result[id] = this.canRunLane(principal, id);
  }
  return result;
}
