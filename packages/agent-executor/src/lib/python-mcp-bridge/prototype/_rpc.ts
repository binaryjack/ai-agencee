import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export function _rpc(
  this:   IPythonMcpBridge,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = this._nextId++;

    const timer = setTimeout(() => {
      this._pending.delete(id);
      reject(new Error(`MCP RPC timeout: ${method} (id=${id})`));
    }, this._opts.callTimeoutMs);

    this._pending.set(id, { resolve, reject, timer });

    const req = { jsonrpc: '2.0' as const, id, method, params };
    this._write(req);
  });
}
