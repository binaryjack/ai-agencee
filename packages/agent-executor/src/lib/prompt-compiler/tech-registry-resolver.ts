import type { TechPack } from '@ai-agencee/tech-registry'
import * as fs from 'fs'
import * as path from 'path'
import type { CatalogEntry, ITechRegistryResolver } from './tech-registry-resolver.types.js'
import { PackNotFoundError } from './tech-registry-resolver.types.js'

const parsePack = (content: string): TechPack => {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const startIdx = lines.findIndex(l => l.trim() === '---')
  if (startIdx === -1) throw new Error('Missing frontmatter opening ---')
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim() === '---')
  if (endIdx === -1) throw new Error('Missing frontmatter closing ---')
  const fmLines = lines.slice(startIdx + 1, endIdx)
  const meta: Record<string, string> = {}
  for (const line of fmLines) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim()
    meta[key] = val
  }
  const name = meta['name'] ?? ''
  const version = meta['version'] ?? '1.0.0'
  const description = meta['description'] ?? ''
  const frameworks = meta['frameworks'] ? meta['frameworks'].split(',').map(f => f.trim()) : undefined
  const rules = lines.slice(endIdx + 1).join('\n').trimStart()
  return { name, version, description, ...(frameworks ? { frameworks } : {}), rules }
}

export const TechRegistryResolver: ITechRegistryResolver = {
  resolve: async (name: string, projectRoot: string): Promise<TechPack> => {
    const localPath = path.join(projectRoot, 'agents', 'technologies', `${name}.pack.md`)
    if (fs.existsSync(localPath)) {
      return parsePack(fs.readFileSync(localPath, 'utf8'))
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('@ai-agencee/tech-registry') as { loadPack: (n: string) => TechPack }
      return pkg.loadPack(name)
    } catch (e) {
      const err = e as Error & { name?: string }
      if (err.name === 'PackNotFoundError') throw new PackNotFoundError(name, projectRoot)
      throw new PackNotFoundError(name, projectRoot)
    }
  },

  catalog: async (projectRoot: string): Promise<CatalogEntry[]> => {
    const entries: CatalogEntry[] = []
    const localDir = path.join(projectRoot, 'agents', 'technologies')
    if (fs.existsSync(localDir)) {
      const localEntries = fs.readdirSync(localDir)
        .filter(f => f.endsWith('.pack.md'))
        .map(f => {
          const pack = parsePack(fs.readFileSync(path.join(localDir, f), 'utf8'))
          return { name: pack.name, version: pack.version, description: pack.description, source: 'local' as const }
        })
      entries.push(...localEntries)
    }
    const localNames = new Set(entries.map(e => e.name))
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('@ai-agencee/tech-registry') as { catalog: () => { packs: Array<{ name: string; version: string; description: string }> } }
      const pkgCatalog = pkg.catalog()
      const pkgEntries = pkgCatalog.packs
        .filter(p => !localNames.has(p.name))
        .map(p => ({ name: p.name, version: p.version, description: p.description, source: 'package' as const }))
      entries.push(...pkgEntries)
    } catch { /* package not installed — local-only mode */ }
    return entries
  },
}
