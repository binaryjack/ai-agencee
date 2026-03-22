/**
 * Local ONNX embedding provider — @xenova/transformers
 *
 * Runs fully in-process with no external API calls.  On first use the model is
 * downloaded into the OS cache (~/.cache/huggingface/).  Subsequent uses load
 * directly from disk.  Quantized weights are ~90 MB for nomic-embed-text-v1.5.
 *
 * Suitable for the Codernic hybrid retrieval pipeline:
 *   1. Embed the task description once at query time (fast after warm-up)
 *   2. Compare against stored vectors in the SQLite index via cosine similarity
 *
 * Pipeline instances are cached per model+quantized key so multiple orchestrator
 * instances in the same process share the same loaded model.
 */

import type { EmbeddingProvider, EmbeddingVector, TransformersEmbeddingProviderOptions } from './embedding-provider.types'

// Keyed by "model:quantized" so different model variants never share a cache entry.
const _pipelineCache = new Map<string, Promise<(text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>>>()

export type TransformersEmbeddingProviderInstance = EmbeddingProvider & {
  _model:      string
  _quantized:  boolean
  _getPipeline(): Promise<(text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>>
}

export const TransformersEmbeddingProvider = function(
  this: TransformersEmbeddingProviderInstance,
  options: TransformersEmbeddingProviderOptions = {}
) {
  const {
    model     = 'Xenova/nomic-embed-text-v1.5',
    quantized = true,
  } = options

  Object.defineProperty(this, '_model',     { enumerable: false, value: model })
  Object.defineProperty(this, '_quantized', { enumerable: false, value: quantized })
  Object.defineProperty(this, 'model',      { enumerable: true,  value: model })
  // nomic-embed-text-v1.5 outputs 768-dimensional vectors
  Object.defineProperty(this, 'dimensions', { enumerable: true,  value: 768 })
} as unknown as new (options?: TransformersEmbeddingProviderOptions) => TransformersEmbeddingProviderInstance

TransformersEmbeddingProvider.prototype._getPipeline = function(
  this: TransformersEmbeddingProviderInstance
): Promise<(text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>> {
  const key = this._model + ':' + String(this._quantized)
  if (!_pipelineCache.has(key)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promise = (import('@xenova/transformers') as Promise<any>).then(({ pipeline }) =>
      pipeline('feature-extraction', this._model, { quantized: this._quantized })
    )
    _pipelineCache.set(key, promise)
  }
  return _pipelineCache.get(key)!
}

TransformersEmbeddingProvider.prototype.embed = async function(
  this: TransformersEmbeddingProviderInstance,
  texts: string[]
): Promise<EmbeddingVector[]> {
  const pipe = await this._getPipeline()
  const results: EmbeddingVector[] = new Array(texts.length)

  // Process in small batches to keep memory pressure reasonable for large symbol lists
  const BATCH = 8
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      chunk.map(t => pipe(t, { pooling: 'mean', normalize: true }))
    )
    batchResults.forEach((out, j) => {
      results[i + j] = new Float32Array(out.data)
    })
  }

  return results
}
