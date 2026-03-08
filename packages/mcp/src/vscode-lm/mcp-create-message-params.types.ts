import { type MCPSamplingMessage } from './mcp-sampling-message.types.js'

export interface MCPCreateMessageParams {
  messages: MCPSamplingMessage[];
  systemPrompt?: string;
  maxTokens: number;
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    intelligencePriority?: number;
    speedPriority?: number;
    costPriority?: number;
  };
}
