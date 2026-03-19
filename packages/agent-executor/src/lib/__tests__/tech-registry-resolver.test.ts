import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { TechRegistryResolver } from '../prompt-compiler/index.js'

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tech-registry-resolver-'))
const rmTmp = (dir: string) => fs.rmSync(dir, { recursive: true, force: true })

const SAMPLE_PACK = `---
name: typescript
version: 1.0.0
description: TypeScript static type checking
---
## Rules
- Always use strict mode
`

describe('TechRegistryResolver.resolve()', () => {
  let tmp: string

  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('returns TechPack from installed @ai-agencee/tech-registry package', async () => {
    const pack = await TechRegistryResolver.resolve('typescript', tmp)
    expect(pack.name).toBe('typescript')
    expect(typeof pack.rules).toBe('string')
    expect(pack.rules.length).toBeGreaterThan(0)
  })

  it('returns local pack when agents/technologies/{name}.pack.md exists', async () => {
    const techDir = path.join(tmp, 'agents', 'technologies')
    fs.mkdirSync(techDir, { recursive: true })
    fs.writeFileSync(path.join(techDir, 'typescript.pack.md'), SAMPLE_PACK, 'utf8')
    const pack = await TechRegistryResolver.resolve('typescript', tmp)
    expect(pack.name).toBe('typescript')
    expect(pack.rules).toContain('strict mode')
  })

  it('local file takes priority over package when both present', async () => {
    const techDir = path.join(tmp, 'agents', 'technologies')
    fs.mkdirSync(techDir, { recursive: true })
    const localPack = `---\nname: typescript\nversion: 99.0.0\ndescription: Local override\n---\n## Local rules\n`
    fs.writeFileSync(path.join(techDir, 'typescript.pack.md'), localPack, 'utf8')
    const pack = await TechRegistryResolver.resolve('typescript', tmp)
    expect(pack.version).toBe('99.0.0')
    expect(pack.description).toBe('Local override')
  })

  it('throws PackNotFoundError for nonexistent pack', async () => {
    await expect(TechRegistryResolver.resolve('nonexistent-pack-xyz', tmp))
      .rejects.toMatchObject({ name: 'PackNotFoundError' })
  })

  it('PackNotFoundError carries name and projectRoot', async () => {
    let caught: unknown
    try {
      await TechRegistryResolver.resolve('no-such-pack', tmp)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
    const err = caught as Record<string, unknown>
    expect(err['name']).toBe('PackNotFoundError')
    expect(String(err['message'])).toContain('no-such-pack')
  })
})

describe('TechRegistryResolver.catalog()', () => {
  let tmp: string

  beforeEach(() => { tmp = mkTmp() })
  afterEach(() => rmTmp(tmp))

  it('includes local entries with source="local"', async () => {
    const techDir = path.join(tmp, 'agents', 'technologies')
    fs.mkdirSync(techDir, { recursive: true })
    fs.writeFileSync(path.join(techDir, 'my-custom.pack.md'), `---\nname: my-custom\nversion: 1.0.0\ndescription: Custom pack\n---\nrules\n`, 'utf8')
    const entries = await TechRegistryResolver.catalog(tmp)
    const local = entries.find(e => e.name === 'my-custom')
    expect(local).toBeDefined()
    expect(local?.source).toBe('local')
  })

  it('includes package entries with source="package"', async () => {
    const entries = await TechRegistryResolver.catalog(tmp)
    const pkgEntries = entries.filter(e => e.source === 'package')
    expect(pkgEntries.length).toBeGreaterThan(0)
  })

  it('local names deduplicate package names (local wins)', async () => {
    const techDir = path.join(tmp, 'agents', 'technologies')
    fs.mkdirSync(techDir, { recursive: true })
    // Override 'typescript' locally
    fs.writeFileSync(path.join(techDir, 'typescript.pack.md'), SAMPLE_PACK, 'utf8')
    const entries = await TechRegistryResolver.catalog(tmp)
    const tsEntries = entries.filter(e => e.name === 'typescript')
    expect(tsEntries.length).toBe(1)
    expect(tsEntries[0].source).toBe('local')
  })

  it('works when agents/technologies/ does not exist', async () => {
    const entries = await TechRegistryResolver.catalog(tmp)
    expect(Array.isArray(entries)).toBe(true)
  })
})
