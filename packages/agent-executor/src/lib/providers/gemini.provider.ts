/**
 * G-33: Google Gemini provider — via the Gemini REST API (no SDK dependency).
 *
 * Model mapping:
 *   haiku  → gemini-2.0-flash-lite  ($0.075 / $0.30 per M tokens)
 *   sonnet → gemini-2.0-flash       ($0.10  / $0.40 per M tokens)
 *   opus   → gemini-2.0-pro         ($1.25  / $5.00 per M tokens)
 *
 * Add GEMINI_API_KEY to env or .env file.
 * Add to model-router.json providers section:
 * {
 *   "gemini": {
 *     "models": { "haiku": "gemini-2.0-flash-lite", "sonnet": "gemini-2.0-flash", "opus": "gemini-2.0-pro" },
 *     "costs":  { "inputPerMillion": 0.10, "outputPerMillion": 0.40 }
 *   }
 * }
 */

import type { LLMPrompt, LLMProvider, LLMResponse, LLMStreamChunk } from '../llm-provider.js'

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['GEMINI_API_KEY'] ?? '';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async complete(prompt: LLMPrompt, modelId: string): Promise<LLMResponse> {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY is not set');

    const { systemInstruction, contents } = this._buildContents(prompt);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: prompt.maxTokens ?? 4096,
        temperature: prompt.temperature ?? 0.7,
      },
    };
    if (systemInstruction) {
      body['systemInstruction'] = { parts: [{ text: systemInstruction }] };
    }

    const url = `${GEMINI_BASE}/${modelId}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

    return {
      content: text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model: modelId,
      provider: this.name,
    };
  }

  async *stream(prompt: LLMPrompt, modelId: string): AsyncIterable<LLMStreamChunk> {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY is not set');

    const { systemInstruction, contents } = this._buildContents(prompt);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: prompt.maxTokens ?? 4096,
        temperature: prompt.temperature ?? 0.7,
      },
    };
    if (systemInstruction) {
      body['systemInstruction'] = { parts: [{ text: systemInstruction }] };
    }

    const url = `${GEMINI_BASE}/${modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`Gemini stream error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const chunk = JSON.parse(jsonStr) as GeminiResponse;
            const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
            if (text) yield { token: text, done: false };
            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
            }
          } catch {
            // skip unparseable
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { token: '', done: true, usage: { inputTokens, outputTokens } };
  }

  private _buildContents(prompt: LLMPrompt): { systemInstruction?: string; contents: GeminiContent[] } {
    const systemMsg = prompt.messages.find((m) => m.role === 'system');
    const nonSystem = prompt.messages.filter((m) => m.role !== 'system');

    // Gemini requires alternating user/model turns; ensure first is user
    const contents: GeminiContent[] = nonSystem.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    return { systemInstruction: systemMsg?.content, contents };
  }
}
