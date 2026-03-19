import * as fs from 'fs'
import * as path from 'path'
import type { ModelFamily } from '../../llm-provider.js'
import type { PromptLayer } from '../prompt-compiler.types.js'
import { TechRegistryResolver } from '../tech-registry-resolver.js'

const estimateTokens = (text: string): number => Math.ceil(text.length / 4)

const readIfExists = (filePath: string): string | null => {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8')
  } catch {
    // ignore
  }
  return null
}

const resolveAgentPrompt = (agentJson: Record<string, unknown>, projectRoot: string, agentName: string): string => {
  // Try agents/prompts/{agentName}.prompt.md first
  const promptFile = path.join(projectRoot, 'agents', 'prompts', `${agentName}.prompt.md`)
  const promptContent = readIfExists(promptFile)
  if (promptContent) return promptContent

  // Fall back to inline description
  if (typeof agentJson.description === 'string') return agentJson.description
  if (typeof agentJson.systemPrompt === 'string') return agentJson.systemPrompt

  return `Agent: ${agentName}`
}

const formatCodernicContext = (intelligence: Record<string, unknown>): string => {
  const lines: string[] = ['## Project Intelligence']
  if (intelligence.techStack) {
    lines.push(`Tech stack: ${JSON.stringify(intelligence.techStack)}`)
  }
  if (typeof intelligence.fileCount === 'number') {
    lines.push(`File count: ${intelligence.fileCount}`)
  }
  if (intelligence.languages) {
    lines.push(`Languages: ${JSON.stringify(intelligence.languages)}`)
  }
  return lines.join('\n')
}

export const resolveLayers = async (
  agentName: string,
  projectRoot: string,
  _modelFamily: ModelFamily,
): Promise<PromptLayer[]> => {
  const layers: PromptLayer[] = []

  // Layer 1: agent base
  let agentJson: Record<string, unknown> = {}
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'agents', `${agentName}.agent.json`), 'utf-8')
    agentJson = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // agent file missing — use defaults
  }

  const agentBase = resolveAgentPrompt(agentJson, projectRoot, agentName)
  layers.push({ source: 'agent-base', name: agentName, content: agentBase, tokens: estimateTokens(agentBase) })

  // Layer 2: tech packs
  const technologies = Array.isArray(agentJson.technologies)
    ? (agentJson.technologies as unknown[]).filter((t): t is string => typeof t === 'string')
    : []

  for (const techName of technologies) {
    try {
      const pack = await TechRegistryResolver.resolve(techName, projectRoot)
      layers.push({ source: 'tech-pack', name: techName, content: pack.rules, tokens: estimateTokens(pack.rules) })
    } catch {
      // pack not found — skip
    }
  }

  // Layer 3: project rules
  const globalRules = readIfExists(path.join(projectRoot, '.ai', 'rules.md')) ?? ''
  const agentRules = readIfExists(path.join(projectRoot, 'agents', `${agentName}.rules.md`)) ?? ''
  const combined = [globalRules, agentRules].filter(Boolean).join('\n\n')
  if (combined) {
    layers.push({ source: 'project-rules', name: 'rules', content: combined, tokens: estimateTokens(combined) })
  }

  // Layer 4: Codernic context
  const intelligencePath = path.join(projectRoot, '.ai', 'project-intelligence.json')
  const intelligenceRaw = readIfExists(intelligencePath)
  if (intelligenceRaw) {
    try {
      const intelligence = JSON.parse(intelligenceRaw) as Record<string, unknown>
      const codernicCtx = formatCodernicContext(intelligence)
      layers.push({ source: 'codernic', name: 'codernic', content: codernicCtx, tokens: estimateTokens(codernicCtx) })
    } catch {
      // invalid JSON — skip
    }
  }

  return layers
}
