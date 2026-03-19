import { TechRegistryResolver } from '../prompt-compiler/index.js'

describe('TechRegistryResolver integration', () => {
  it('resolve any installed base pack from actual @ai-agencee/tech-registry', async () => {
    const pack = await TechRegistryResolver.resolve('typescript', process.cwd())
    expect(pack.name).toBe('typescript')
    expect(typeof pack.rules).toBe('string')
    expect(pack.rules.length).toBeGreaterThan(0)
  })

  it('catalog() returns ≥10 entries when package installed', async () => {
    const entries = await TechRegistryResolver.catalog(process.cwd())
    expect(entries.length).toBeGreaterThanOrEqual(10)
  })
})
