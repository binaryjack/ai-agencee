import type { IRbacPolicy } from '../rbac.js';

export function canRunLane(this: IRbacPolicy, principal: string, laneId: string): boolean {
  const pd = this._policyFile.principals[principal] ??
    { role: this._policyFile.defaultRole ?? 'observer' };

  const restriction = pd.laneRestrictions?.[laneId];
  if (restriction === 'deny')  return false;
  if (restriction === 'allow') return true;

  return this.can(principal, 'run') || this.can(principal, `run:${laneId}`);
}
