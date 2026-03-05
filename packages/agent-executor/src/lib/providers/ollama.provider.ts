/**
 * G-32: Ollama provider — local model inference via Ollama HTTP API.
 *
 * Enables zero-cost development, CI without API keys, and enterprise air-gap deployments.
 *
 * Usage:
 *   Set OLLAMA_HOST=http://localhost:11434 (default) before running.
 *   Add to model-router.json:
 *   {
 *     "providers": {
 *       "ollama": {
 *         "models": { "haiku": "llama3.2", "sonnet": "codestral", "opus": "deepseek-r1" },
 *         "costs":  { "inputPerMillion": 0, "outputPerMillion": 0 }
 *       }
 *     }
 *   }
 */

import type { LLMPrompt, LLMProvider, LLMResponse, LLMStreamChunk } from '../llm-provider.js'

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  eval_count?: number;
  prompt_eval_count?: number;
  done: boolean;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(prompt: LLMPrompt, modelId: string): Promise<LLMResponse> {
    const messages: OllamaMessage[] = prompt.messages.map((m) => ({
      role: m.role as OllamaMessage['role'],
      content: m.content,
    }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: false,
        options: {
          num_predict: prompt.maxTokens ?? 4096,
          temperature: prompt.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as OllamaChatResponse;

    return {
      content: data.message.content,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
      model: modelId,
      provider: this.name,
    };
  }

  async *stream(prompt: LLMPrompt, modelId: string): AsyncIterable<LLMStreamChunk> {
    const messages: OllamaMessage[] = prompt.messages.map((m) => ({
      role: m.role as OllamaMessage['role'],
      content: m.content,
    }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
        options: {
          num_predict: prompt.maxTokens ?? 4096,
          temperature: prompt.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`Ollama stream error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line) as OllamaChatResponse;
            if (chunk.message?.content) {
              outputTokens++;
              yield { token: chunk.message.content, done: false };
            }
            if (chunk.done) {
              inputTokens = chunk.prompt_eval_count ?? inputTokens;
              outputTokens = chunk.eval_count ?? outputTokens;
              yield { token: '', done: true, usage: { inputTokens, outputTokens } };
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
