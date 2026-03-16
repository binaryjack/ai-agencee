import type { IRbacPolicy } from '../rbac.js';

export function can(this: IRbacPolicy, principal: string, action: string): boolean {
  const perms = this._permissions(principal);
  return perms.some((p) => this._matches(p, action));
}
