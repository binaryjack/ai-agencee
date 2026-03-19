import type { ModelFamily } from '../llm-provider.js'
import type { CompiledPrompt, IPromptCompiler } from './prompt-compiler.types.js'
import { invalidateCache } from './prototype/cache.js'
import { compile } from './prototype/compile.js'

export const PromptCompiler = function PromptCompiler(
  this: IPromptCompiler,
) {
  // no instance state — all methods use args directly
} as unknown as {
  new(): IPromptCompiler
}

Object.assign((PromptCompiler as Function).prototype, { compile, invalidateCache })

export type { CompiledPrompt, IPromptCompiler, ModelFamily }

