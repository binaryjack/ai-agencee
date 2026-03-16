import type { ArbiterDecision, IArbiter } from '../arbiter.js'

export function getDecisions(this: IArbiter): ArbiterDecision[] {
  return [...this._decisions];
}
