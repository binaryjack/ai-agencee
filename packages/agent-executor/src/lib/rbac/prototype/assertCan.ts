import type { IRbacPolicy } from '../rbac.js';
import { RbacDeniedError } from '../rbac.types.js';

export function assertCan(
  this:      IRbacPolicy,
  principal: string,
  action:    string,
  resource?: string,
): void {
  const allowed = resource
    ? (action === 'run' ? this.canRunLane(principal, resource) : this.can(principal, action))
    : this.can(principal, action);

  if (!allowed) {
    throw new RbacDeniedError(principal, action, resource);
  }
}
