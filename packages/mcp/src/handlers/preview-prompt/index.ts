import type { ModelFamily } from '@ai-agencee/engine'
import { PromptCompiler } from '@ai-agencee/engine'
import * as path from 'path'
import { findProjectRoot } from '../../find-project-root.js'

export interface PreviewPromptResult {
  compiledText: string
  tokenCount: number
  modelFamily: ModelFamily
  cachedAt: number
  fingerprint?: string
}

/**
 * Compile and return an agent's prompt preview with metadata.
 * @param agentName - Agent name (kebab-case), e.g. "backend-agent"
 * @param modelFamily - Target model family: "haiku" | "sonnet" | "opus"
 * @param projectRoot - Optional project root; defaults to auto-detected
 * @returns JSON string with compiledText, tokenCount, modelFamily, cachedAt
 */
export async function runPreviewPrompt(
  agentName: string,
  modelFamily: ModelFamily,
  projectRoot?: string,
): Promise<string> {
  const pr = projectRoot ? path.resolve(projectRoot) : findProjectRoot()

  try {
    const compiler = new PromptCompiler()
    const compiled = await compiler.compile(agentName, pr, modelFamily)

    const result: PreviewPromptResult = {
      compiledText: compiled.text,
      tokenCount: compiled.tokenCount,
      modelFamily: compiled.modelFamily,
      cachedAt: compiled.cachedAt,
      fingerprint: compiled.fingerprint,
    }

    return JSON.stringify(result, null, 2)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorResult = {
      error: `Failed to compile prompt for agent "${agentName}": ${errorMsg}`,
      agentName,
      modelFamily,
    }
    return JSON.stringify(errorResult, null, 2)
  }
}
