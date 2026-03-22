/**
 * Embeddings subsystem exports
 */

export { cosineSimilarity } from './cosine-similarity'
export type * from './embedding-provider.types'
export { OllamaEmbeddingProvider } from './ollama-embedding-provider'
export { OpenAIEmbeddingProvider } from './openai-embedding-provider'
export { TransformersEmbeddingProvider } from './transformers-embedding-provider'

