import type { LLMProvider } from '../../llm-provider.js';
import type { IPythonMcpBridge } from '../python-mcp-bridge.js';
import { PythonMcpProvider } from '../python-mcp-bridge.js';

export function asLLMProvider(
  this:    IPythonMcpBridge,
  options: { toolName?: string; promptArg?: string } = {},
): LLMProvider {
  const toolName  = options.toolName  ?? 'generate';
  const promptArg = options.promptArg ?? 'prompt';
  return new PythonMcpProvider(this, toolName, promptArg);
}
