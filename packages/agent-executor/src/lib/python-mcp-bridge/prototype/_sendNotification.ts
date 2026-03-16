import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export function _sendNotification(this: IPythonMcpBridge, method: string): void {
  this._write({ jsonrpc: '2.0', method });
}
