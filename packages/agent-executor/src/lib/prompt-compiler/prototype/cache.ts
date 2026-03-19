import * as fs from 'fs'
import * as path from 'path'
import type { ModelFamily } from '../../llm-provider.js'
import type { CompiledPrompt } from '../prompt-compiler.types.js'

const cacheDir = (projectRoot: string): string => path.join(projectRoot, '.agencee')

const cachePath = (agentName: string, modelFamily: ModelFamily, projectRoot: string): string =>
  path.join(cacheDir(projectRoot), `${agentName}.${modelFamily}.compiled.json`)

export const readCache = (
  agentName: string,
  modelFamily: ModelFamily,
  fingerprint: string,
  projectRoot: string,
): CompiledPrompt | null => {
  const filePath = cachePath(agentName, modelFamily, projectRoot)
  if (!fs.existsSync(filePath)) return null
  try {
    const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CompiledPrompt
    if (cached.fingerprint !== fingerprint) return null
    return cached
  } catch {
    return null
  }
}

export const writeCache = (
  compiled: CompiledPrompt,
  agentName: string,
  modelFamily: ModelFamily,
  projectRoot: string,
): void => {
  const dir = cacheDir(projectRoot)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cachePath(agentName, modelFamily, projectRoot), JSON.stringify(compiled), 'utf-8')
}

export const invalidateCache = function(agentName: string, projectRoot: string): void {
  const dir = cacheDir(projectRoot)
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.startsWith(`${agentName}.`) && f.endsWith('.compiled.json'))
  for (const f of files) {
    try { fs.unlinkSync(path.join(dir, f)) } catch { /* ignore */ }
  }
}

/**
 * Invalidate ALL compiled prompts in the project.
 * Called when project rules or agent definitions change.
 */
export const invalidateAllCaches = function(projectRoot: string): void {
  const dir = cacheDir(projectRoot)
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.compiled.json'))
  for (const f of files) {
    try { fs.unlinkSync(path.join(dir, f)) } catch { /* ignore */ }
  }
}
