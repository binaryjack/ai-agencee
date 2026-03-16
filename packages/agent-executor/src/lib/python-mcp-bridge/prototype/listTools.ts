import type { IPythonMcpBridge, McpToolDefinition } from '../python-mcp-bridge.js';

export async function listTools(this: IPythonMcpBridge): Promise<McpToolDefinition[]> {
  const result = await this._rpc('tools/list', {});
  return ((result as { tools?: McpToolDefinition[] }).tools) ?? [];
}
