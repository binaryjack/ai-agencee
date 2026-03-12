/**
 * OpenAI Embedding Provider
 *
 * Calls POST /v1/embeddings with batching.
 * Default model: text-embedding-3-small (1536 dimensions).
 */

import type { EmbeddingProvider, EmbeddingVector, OpenAIEmbeddingProviderOptions } from './embedding-provider.types'

export type OpenAIEmbeddingProviderInstance = EmbeddingProvider & {
  _apiKey:     string
  _model:      string
  _baseURL:    string
  _batchSize:  number
  _embedBatch: (texts: string[]) => Promise<EmbeddingVector[]>
}

export const OpenAIEmbeddingProvider = function(
  this: OpenAIEmbeddingProviderInstance,
  options: OpenAIEmbeddingProviderOptions
) {
  const {
    apiKey,
    model     = 'text-embedding-3-small',
    baseURL   = 'https://api.openai.com/v1',
    batchSize = 100,
  } = options

  if (!apiKey) throw new Error('OpenAIEmbeddingProvider: apiKey is required')

  Object.defineProperty(this, '_apiKey',    { enumerable: false, value: apiKey })
  Object.defineProperty(this, '_model',     { enumerable: false, value: model, writable: false })
  Object.defineProperty(this, '_baseURL',   { enumerable: false, value: baseURL })
  Object.defineProperty(this, '_batchSize', { enumerable: false, value: batchSize })
  Object.defineProperty(this, 'model',      { enumerable: true,  value: model })
  // text-embedding-3-small is 1536 dims; text-embedding-3-large is 3072
  Object.defineProperty(this, 'dimensions', {
    enumerable: true,
    value: model.includes('large') ? 3072 : 1536,
  })
} as unknown as new (options: OpenAIEmbeddingProviderOptions) => OpenAIEmbeddingProviderInstance

OpenAIEmbeddingProvider.prototype.embed = async function(
  this: OpenAIEmbeddingProviderInstance,
  texts: string[]
): Promise<EmbeddingVector[]> {
  const results: EmbeddingVector[] = []

  for (let i = 0; i < texts.length; i += this._batchSize) {
    const batch = texts.slice(i, i + this._batchSize)
    const batchResults = await this._embedBatch(batch)
    results.push(...batchResults)
  }

  return results
}

OpenAIEmbeddingProvider.prototype._embedBatch = async function(
  this: OpenAIEmbeddingProviderInstance,
  texts: string[]
): Promise<EmbeddingVector[]> {
  const response = await fetch(`${this._baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this._apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: this._model, input: texts }),
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const body = await response.json() as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch { /* ignore json parse error */ }
    throw new Error(`OpenAI embeddings error ${response.status}: ${message}`)
  }

  const body = await response.json() as { data: { index: number; embedding: number[] }[] }

  return body.data
    .sort((a, b) => a.index - b.index)
    .map(item => new Float32Array(item.embedding))
}
