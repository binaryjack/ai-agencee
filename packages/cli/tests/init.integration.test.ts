import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

jest.mock('@ai-agencee/core', () => ({
  copyTemplateFiles: jest.fn().mockResolvedValue([]),
  fileExists: jest.fn().mockResolvedValue(false),
  TEMPLATE_DIR: '/fake/template',
}))

describe('runInit — tech-registry integration', () => {
  let tmpDir: string
  let cwdSpy: jest.SpyInstance

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-init-int-'))
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpDir)
    jest.resetModules()
  })

  afterEach(() => {
    cwdSpy.mockRestore()
    jest.clearAllMocks()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('adds @ai-agencee/tech-registry to devDependencies when package.json present', async () => {
    const pkgPath = path.join(tmpDir, 'package.json')
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'my-project', devDependencies: {} }, null, 2))
    const { runInit } = await import('../src/commands/init/run-init')
    await runInit()
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { devDependencies: Record<string, string> }
    expect(pkg.devDependencies['@ai-agencee/tech-registry']).toBe('^1.0.0')
  })

  it('does not modify package.json when @ai-agencee/tech-registry already present', async () => {
    const pkgPath = path.join(tmpDir, 'package.json')
    const existing = { name: 'my-project', devDependencies: { '@ai-agencee/tech-registry': '^0.9.0' } }
    fs.writeFileSync(pkgPath, JSON.stringify(existing, null, 2))
    const { runInit } = await import('../src/commands/init/run-init')
    await runInit()
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { devDependencies: Record<string, string> }
    expect(pkg.devDependencies['@ai-agencee/tech-registry']).toBe('^0.9.0') // unchanged
  })

  it('skips silently when no package.json exists', async () => {
    const { runInit } = await import('../src/commands/init/run-init')
    await expect(runInit()).resolves.not.toThrow()
  })
})
