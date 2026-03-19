import * as path from 'path'
import { loadPack, PackNotFoundError } from '../index'

const ALL_PACKS = ['typescript', 'javascript', 'react', 'vue', 'prisma', 'zod', 'vitest', 'jest', 'playwright', 'node']

describe('loadPack', () => {
  it('loads typescript pack with non-empty rules string', async () => {
    const pack = await loadPack('typescript')
    expect(pack.rules).toBeTruthy()
    expect(pack.rules.length).toBeGreaterThan(50)
  })

  it('throws PackNotFoundError for nonexistent pack', async () => {
    await expect(loadPack('nonexistent')).rejects.toThrow(PackNotFoundError)
    await expect(loadPack('nonexistent')).rejects.toThrow('Tech pack not found: nonexistent')
  })

  it('loads all 10 base packs without error', async () => {
    for (const name of ALL_PACKS) {
      await expect(loadPack(name)).resolves.toBeDefined()
    }
  })

  it.each(ALL_PACKS)('pack %s has valid YAML frontmatter (name, version, description)', async (name) => {
    const pack = await loadPack(name)
    expect(typeof pack.name).toBe('string')
    expect(pack.name).toBeTruthy()
    expect(typeof pack.version).toBe('string')
    expect(pack.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(typeof pack.description).toBe('string')
    expect(pack.description).toBeTruthy()
  })

  it.each(ALL_PACKS)('pack %s rules contain a markdown heading (##)', async (name) => {
    const pack = await loadPack(name)
    expect(pack.rules).toMatch(/^##\s+/m)
  })

  it('react pack has frameworks field', async () => {
    const pack = await loadPack('react')
    expect(Array.isArray(pack.frameworks)).toBe(true)
    expect((pack.frameworks ?? []).length).toBeGreaterThan(0)
  })
})

describe('pack file paths', () => {
  it('packs directory exists and contains 10 .pack.md files', () => {
    const fs = require('fs') as typeof import('fs')
    const packsDir = path.join(__dirname, '..', '..', 'packs')
    const files = fs.readdirSync(packsDir).filter((f: string) => f.endsWith('.pack.md'))
    expect(files).toHaveLength(10)
  })
})
