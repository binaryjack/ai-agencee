import type { IRbacPolicy } from '../rbac.js';

export function _matches(this: IRbacPolicy, permission: string, action: string): boolean {
  if (permission === '*')    return true;
  if (permission === action) return true;
  if (permission.endsWith(':*')) {
    const prefix = permission.slice(0, -2);
    return action === prefix || action.startsWith(`${prefix}:`);
  }
  return false;
}
