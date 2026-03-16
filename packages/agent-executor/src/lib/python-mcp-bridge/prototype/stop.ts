import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export async function stop(this: IPythonMcpBridge): Promise<void> {
  if (!this._process) return;
  this._rejectAll(new Error('Bridge stopped'));
  this._process.stdin?.end();
  this._process.kill('SIGTERM');
  this._process = null;
  this._started = false;
}
