import type { LLMProvider } from '../llm-provider.js'
import { AnthropicProvider } from '../providers/anthropic-provider/index.js'
import { BedrockProvider } from '../providers/bedrock-provider/index.js'
import { GeminiProvider } from '../providers/gemini-provider/index.js'
import { MockProvider } from '../providers/mock-provider/index.js'
import { OllamaProvider } from '../providers/ollama-provider/index.js'
import { OpenAIProvider } from '../providers/openai-provider/index.js'
import type { SamplingCallback } from '../providers/vscode-sampling-provider/index.js'
import { VSCodeSamplingProvider } from '../providers/vscode-sampling-provider/index.js'

export const PROVIDER_REGISTRY: Record<string, (config: unknown) => LLMProvider> = {
  anthropic: (_cfg) => new AnthropicProvider() as unknown as LLMProvider,
  openai:    (_cfg) => new OpenAIProvider()    as unknown as LLMProvider,
  bedrock:   (_cfg) => new BedrockProvider()   as unknown as LLMProvider,
  gemini:    (_cfg) => new GeminiProvider()    as unknown as LLMProvider,
  ollama:    (_cfg) => new OllamaProvider()    as unknown as LLMProvider,
  vscode:    (cfg)  => new VSCodeSamplingProvider(cfg as SamplingCallback) as unknown as LLMProvider,
  mock:      (cfg)  => new MockProvider((cfg ?? {}) as Record<string, string>) as unknown as LLMProvider,
}
