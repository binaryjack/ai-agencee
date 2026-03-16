import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export function _rejectAll(this: IPythonMcpBridge, err: Error): void {
  for (const { reject, timer } of this._pending.values()) {
    clearTimeout(timer);
    reject(err);
  }
  this._pending.clear();
}
