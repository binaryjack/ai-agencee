import type { IPythonMcpBridge, McpToolResult } from '../python-mcp-bridge.js';

export async function callTool(
  this: IPythonMcpBridge,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const result = await this._rpc('tools/call', { name, arguments: args });
  return result as McpToolResult;
}
