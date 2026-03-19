import * as fs from 'fs'
import * as path from 'path'
import type { TechPack } from './pack.types'
import { PackNotFoundError } from './pack.types'

const PACKS_DIR = path.join(__dirname, '..', 'packs')

const parseFrontmatter = (content: string): { meta: Record<string, string>; body: string } => {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== '---') {
    return { meta: {}, body: content }
  }
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) {
    return { meta: {}, body: content }
  }
  const meta: Record<string, string> = {}
  for (const raw of lines.slice(1, endIdx)) {
    const line = raw.replace(/\r$/, '')
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) meta[key] = value
  }
  const body = lines.slice(endIdx + 1).map((l) => l.replace(/\r$/, '')).join('\n').trimStart()
  return { meta, body }
}

export const loadPack = async (name: string): Promise<TechPack> => {
  const packPath = path.join(PACKS_DIR, `${name}.pack.md`)
  if (!fs.existsSync(packPath)) {
    throw new PackNotFoundError(name)
  }
  const content = fs.readFileSync(packPath, 'utf-8')
  const { meta, body } = parseFrontmatter(content)
  const packName = meta['name'] ?? name
  const version = meta['version'] ?? '1.0.0'
  const description = meta['description'] ?? ''
  const frameworks = meta['frameworks']
    ? meta['frameworks'].split(',').map((s) => s.trim())
    : undefined
  return { name: packName, version, description, frameworks, rules: body }
}
