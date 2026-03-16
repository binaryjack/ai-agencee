import type { IRbacPolicy } from '../rbac.js';

export function _permissions(this: IRbacPolicy, principal: string): string[] {
  const pd       = this._policyFile.principals[principal];
  const roleName = pd?.role ?? this._policyFile.defaultRole ?? 'observer';
  const role     = this._policyFile.roles[roleName];
  return role?.permissions ?? [];
}
