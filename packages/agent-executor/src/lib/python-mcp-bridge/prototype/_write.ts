import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export function _write(this: IPythonMcpBridge, msg: object): void {
  if (!this._process?.stdin?.writable) {
    throw new Error('Python MCP bridge is not started');
  }
  this._process.stdin.write(JSON.stringify(msg) + '\n');
}
