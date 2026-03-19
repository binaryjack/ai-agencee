import { catalog } from '../catalog'

describe('catalog', () => {
  it('returns object with packs array of length 10', () => {
    const cat = catalog()
    expect(Array.isArray(cat.packs)).toBe(true)
    expect(cat.packs).toHaveLength(10)
  })

  it('each entry has name, version, and description', () => {
    const cat = catalog()
    for (const entry of cat.packs) {
      expect(typeof entry.name).toBe('string')
      expect(entry.name).toBeTruthy()
      expect(typeof entry.version).toBe('string')
      expect(typeof entry.description).toBe('string')
    }
  })

  it('all pack names are kebab-case', () => {
    const cat = catalog()
    for (const entry of cat.packs) {
      expect(entry.name).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('catalog version is a semver string', () => {
    const cat = catalog()
    expect(cat.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
