import type { IRbacPolicy } from '../rbac.js';
import type { RbacPrincipalDefinition } from '../rbac.types.js';

export function getRateLimits(
  this:      IRbacPolicy,
  principal: string,
): RbacPrincipalDefinition['rateLimits'] {
  return this._policyFile.principals[principal]?.rateLimits;
}
