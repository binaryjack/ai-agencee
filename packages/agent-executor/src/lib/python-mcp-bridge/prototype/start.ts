import { spawn } from 'child_process';
import type { IPythonMcpBridge } from '../python-mcp-bridge.js';

export async function start(this: IPythonMcpBridge): Promise<void> {
  if (this._started) return;

  const proc = spawn(
    this._opts.pythonBin,
    [this._opts.scriptPath, ...this._opts.args],
    {
      env:   { ...process.env, ...this._opts.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  this._process = proc;
  this._started = true;

  proc.stdout!.setEncoding('utf-8');
  proc.stdout!.on('data', (chunk: string) => {
    this._buffer += chunk;
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      this._handleLine(trimmed);
    }
  });

  proc.stderr?.on('data', (_d: Buffer) => { /* forward stderr for debugging */ });

  proc.on('error', (err: Error) => {
    this._rejectAll(new Error(`Python process error: ${err.message}`));
  });

  proc.on('exit', (code: number | null) => {
    if (code !== 0 && code !== null) {
      this._rejectAll(new Error(`Python process exited with code ${code}`));
    }
  });

  await this._rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities:    {},
    clientInfo:      this._opts.clientInfo,
  });

  this._sendNotification('notifications/initialized');
}
