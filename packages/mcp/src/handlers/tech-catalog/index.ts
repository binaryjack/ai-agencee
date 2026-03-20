/**
 * @file handlers/tech-catalog/index.ts
 * @description MCP handler to retrieve tech-registry catalog
 * Resolution order: local .agencee/config/technologies/*.pack.md → @ai-agencee/tech-registry package
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { TECHNOLOGIES_DIR } from '@ai-agencee/engine'
import { findProjectRoot } from '../../find-project-root.js'

export interface TechCatalogEntry {
  name:        string
  version:     string
  description: string
  category?:   string
  source:      'local' | 'package'
}

export interface TechCatalogResult {
  entries: TechCatalogEntry[]
  localCount: number
  packageCount: number
}

const parsePack = async (filePath: string): Promise<TechCatalogEntry> => {
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const startIdx = lines.findIndex(l => l.trim() === '---')
  if (startIdx === -1) throw new Error(`Missing frontmatter in ${filePath}`)
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim() === '---')
  if (endIdx === -1) throw new Error(`Missing closing frontmatter in ${filePath}`)
  
  const meta: Record<string, string> = {}
  for (const line of lines.slice(startIdx + 1, endIdx)) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim()
    meta[key] = val
  }
  
  return {
    name: meta['name'] ?? path.basename(filePath, '.pack.md'),
    version: meta['version'] ?? '1.0.0',
    description: meta['description'] ?? '',
    category: meta['category'],
    source: 'local',
  }
}

export const runTechCatalog = async (projectRoot?: string): Promise<TechCatalogResult> => {
  const pr = projectRoot ? path.resolve(projectRoot) : findProjectRoot()
  const entries: TechCatalogEntry[] = []
  
  // 1. Load local overrides from .agencee/config/technologies/
  const localDir = path.join(pr, TECHNOLOGIES_DIR)
  let localCount = 0
  try {
    const files = await fs.readdir(localDir)
    const packFiles = files.filter(f => f.endsWith('.pack.md'))
    for (const file of packFiles) {
      try {
        const entry = await parsePack(path.join(localDir, file))
        entries.push(entry)
        localCount++
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e)
      }
    }
  } catch {
    // agents/technologies/ doesn't exist — that's ok
  }
  
  // 2. Load from @ai-agencee/tech-registry package
  const localNames = new Set(entries.map(e => e.name))
  let packageCount = 0
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('@ai-agencee/tech-registry') as {
      catalog: () => { packs: Array<{
        name: string
        version: string
        description: string
        category?: string
      }> }
    }
    const pkgCatalog = pkg.catalog()
    const pkgEntries = pkgCatalog.packs
      .filter(p => !localNames.has(p.name))
      .map(p => ({
        name: p.name,
        version: p.version,
        description: p.description,
        category: p.category,
        source: 'package' as const,
      }))
    entries.push(...pkgEntries)
    packageCount = pkgEntries.length
  } catch {
    // @ai-agencee/tech-registry not installed — use local-only
  }
  
  return { entries, localCount, packageCount }
}
