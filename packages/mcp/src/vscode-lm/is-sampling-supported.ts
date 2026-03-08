import { Server } from '@modelcontextprotocol/sdk/server/index.js'

export function isSamplingSupported(server: Server): boolean {
  const s = server as unknown as {
    _clientCapabilities?: { sampling?: unknown };
  };
  return !!s._clientCapabilities?.sampling;
}
