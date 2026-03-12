/**
 * Embedding Provider interface
 */

/** A dense vector produced by an embedding model. */
export type EmbeddingVector = Float32Array

/** Contract every embedding provider must satisfy. */
export type EmbeddingProvider = {
  /**
   * Embed one or more text strings.
   * Returns one Float32Array per input, in the same order.
   */
  embed(texts: string[]): Promise<EmbeddingVector[]>

  /** Number of dimensions in each vector (model-dependent). */
  readonly dimensions: number

  /** Human-readable model identifier, e.g. "text-embedding-3-small". */
  readonly model: string
}

export type OpenAIEmbeddingProviderOptions = {
  apiKey: string
  model?:   string   // default: 'text-embedding-3-small'
  baseURL?: string   // default: 'https://api.openai.com/v1'
  batchSize?: number // default: 100
}

export type OllamaEmbeddingProviderOptions = {
  model?:   string   // default: 'nomic-embed-text'
  baseURL?: string   // default: 'http://localhost:11434'
}

/** A symbol row returned by Store.semanticSearch(). */
export type SemanticSearchResult = {
  id:         number
  name:       string
  kind:       string
  signature:  string | null
  docstring:  string | null
  file_path:  string
  score:      number
}
