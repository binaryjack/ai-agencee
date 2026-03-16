import type { IRbacPolicy } from '../rbac.js';

export function summarize(this: IRbacPolicy): Record<string, unknown> {
  return {
    version:        this._policyFile.version,
    defaultRole:    this._policyFile.defaultRole,
    roleCount:      Object.keys(this._policyFile.roles).length,
    principalCount: Object.keys(this._policyFile.principals).length,
    roles:          Object.keys(this._policyFile.roles),
  };
}
