import { LLMMessage, SamplingCallback } from '@ai-agencee/engine'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { type MCPCreateMessageParams } from './mcp-create-message-params.types.js'
import { type MCPCreateMessageResult } from './mcp-create-message-result.types.js'
import { type MCPSamplingMessage } from './mcp-sampling-message.types.js'

export function createVSCodeSamplingBridge(server: Server): SamplingCallback {
  return async (
    messages: LLMMessage[],
    modelHint: string,
    maxTokens: number,
  ): Promise<{ content: string; model: string }> => {
    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');

    const samplingMessages: MCPSamplingMessage[] = conversationMsgs.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: { type: 'text' as const, text: m.content },
    }));

    if (samplingMessages.length === 0 || samplingMessages[samplingMessages.length - 1].role !== 'user') {
      samplingMessages.push({
        role: 'user',
        content: { type: 'text', text: 'Please proceed.' },
      });
    }

    const params: MCPCreateMessageParams = {
      messages: samplingMessages,
      ...(systemMsg ? { systemPrompt: systemMsg.content } : {}),
      maxTokens,
      modelPreferences: {
        hints: [{ name: modelHint }],
        intelligencePriority: modelHint.includes('opus') ? 1.0 : modelHint.includes('sonnet') ? 0.7 : 0.3,
        speedPriority: modelHint.includes('haiku') ? 1.0 : modelHint.includes('sonnet') ? 0.5 : 0.2,
        costPriority: modelHint.includes('haiku') ? 1.0 : modelHint.includes('sonnet') ? 0.6 : 0.2,
      },
    };

    const result = await (server as unknown as {
      createMessage(params: MCPCreateMessageParams): Promise<MCPCreateMessageResult>;
    }).createMessage(params);

    return {
      content: result.content.text,
      model: result.model,
    };
  };
}
