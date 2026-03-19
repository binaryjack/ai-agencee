import type { ModelFamily } from '../llm-provider.js'

export interface IPromptCompiler {
  compile(agentName: string, projectRoot: string, modelFamily: ModelFamily): Promise<CompiledPrompt>
  invalidateCache(agentName: string, projectRoot: string): void
}

export interface CompiledPrompt {
  text:        string
  tokenCount:  number
  fingerprint: string
  modelFamily: ModelFamily
  layers:      PromptLayer[]
  cachedAt:    number
}

export interface PromptLayer {
  source:  'agent-base' | 'tech-pack' | 'project-rules' | 'codernic'
  name:    string
  content: string
  tokens:  number
}

export interface FormatOptions {
  modelFamily:  ModelFamily
  tokenBudget:  number
}
