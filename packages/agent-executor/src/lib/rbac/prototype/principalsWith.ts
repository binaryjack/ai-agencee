import type { IRbacPolicy } from '../rbac.js';

export function principalsWith(this: IRbacPolicy, action: string): string[] {
  return Object.keys(this._policyFile.principals).filter((p) => this.can(p, action));
}
