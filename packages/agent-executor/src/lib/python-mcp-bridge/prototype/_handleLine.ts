import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export function _handleLine(this: IPythonMcpBridge, line: string): void {
  let msg: {
    jsonrpc: string;
    id?: number;
    result?: unknown;
    error?: { code: number; message: string };
  };
  try {
    msg = JSON.parse(line) as typeof msg;
  } catch {
    return;
  }

  if (typeof msg.id !== 'number') return;

  const pending = this._pending.get(msg.id);
  if (!pending) return;

  clearTimeout(pending.timer);
  this._pending.delete(msg.id);

  if (msg.error) {
    pending.reject(new Error(`MCP error ${msg.error.code}: ${msg.error.message}`));
  } else {
    pending.resolve(msg.result);
  }
}
