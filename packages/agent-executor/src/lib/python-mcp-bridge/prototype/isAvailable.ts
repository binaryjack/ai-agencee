import type { IPythonMcpProvider } from '../python-mcp-bridge.js';

export async function isAvailable(this: IPythonMcpProvider): Promise<boolean> {
  try {
    const tools = await this._bridge.listTools();
    return tools.some((t) => t.name === this._toolName);
  } catch {
    return false;
  }
}
