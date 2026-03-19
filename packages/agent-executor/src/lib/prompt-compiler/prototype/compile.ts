import { createHash } from 'crypto'
import type { ModelFamily } from '../../llm-provider.js'
import type { CompiledPrompt } from '../prompt-compiler.types.js'
import { readCache, writeCache } from './cache.js'
import { formatForModel } from './format-for-model.js'
import { resolveLayers } from './resolve-layers.js'

const MODEL_TOKEN_BUDGETS: Record<string, number> = {
  haiku:  300,
  sonnet: 600,
  opus:   1200,
}

export async function compile(
  this: unknown,
  agentName: string,
  projectRoot: string,
  modelFamily: ModelFamily,
): Promise<CompiledPrompt> {
  const layers = await resolveLayers(agentName, projectRoot, modelFamily)
  const fingerprint = createHash('sha256')
    .update(layers.map(l => l.content).join('|'))
    .digest('hex')

  const cached = readCache(agentName, modelFamily, fingerprint, projectRoot)
  if (cached) return cached

  const text = formatForModel(layers, {
    modelFamily,
    tokenBudget: MODEL_TOKEN_BUDGETS[modelFamily] ?? MODEL_TOKEN_BUDGETS.sonnet,
  })
  const tokenCount = Math.ceil(text.length / 4)

  const compiled: CompiledPrompt = {
    text,
    tokenCount,
    fingerprint,
    modelFamily,
    layers,
    cachedAt: Date.now(),
  }

  writeCache(compiled, agentName, modelFamily, projectRoot)
  return compiled
}
