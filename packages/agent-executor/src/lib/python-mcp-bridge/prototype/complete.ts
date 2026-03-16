import type { LLMPrompt, LLMResponse } from '../../llm-provider.js';
import type { IPythonMcpProvider } from '../python-mcp-bridge.js';

export async function complete(
  this:    IPythonMcpProvider,
  prompt:  LLMPrompt,
  modelId: string,
): Promise<LLMResponse> {
  const userMessages   = prompt.messages.filter((m) => m.role !== 'system');
  const systemMessages = prompt.messages.filter((m) => m.role === 'system');
  const promptText     = userMessages.map((m) => m.content).join('\n');

  const callArgs: Record<string, unknown> = {
    [this._promptArg]: promptText,
    model:             modelId,
  };

  if (systemMessages.length > 0) {
    callArgs['system'] = systemMessages.map((m) => m.content).join('\n');
  }

  if (prompt.maxTokens   !== undefined) callArgs['maxTokens']   = prompt.maxTokens;
  if (prompt.temperature !== undefined) callArgs['temperature'] = prompt.temperature;

  const result = await this._bridge.callTool(this._toolName, callArgs);

  const text = result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');

  return {
    content:  text,
    usage:    { inputTokens: 0, outputTokens: 0 },
    model:    modelId,
    provider: 'python-mcp',
  };
}
