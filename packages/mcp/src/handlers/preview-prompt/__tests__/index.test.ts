/**
 * @file handlers/preview-prompt/__tests__/index.test.ts
 * @description Tests for preview-prompt MCP handler
 */

// Mock the engine module
jest.mock('@ai-agencee/engine', () => ({
  PromptCompiler: jest.fn(function(this: any) {
    this.compile = jest.fn()
  }),
}))

// Mock find-project-root
jest.mock('../../../find-project-root.js', () => ({
  findProjectRoot: jest.fn(() => '/test-project'),
}))

import { PromptCompiler } from '@ai-agencee/engine'
import * as path from 'path'
import { runPreviewPrompt } from '../index.js'

describe('runPreviewPrompt', () => {
  let mockCompiler: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockCompiler = {
      compile: jest.fn(),
    }
    ;(PromptCompiler as any).mockImplementation(() => mockCompiler)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return compiled prompt with metadata for valid agent', async () => {
    const mockCompiled = {
      text: 'You are a backend specialist...',
      tokenCount: 250,
      fingerprint: 'abc123',
      modelFamily: 'sonnet' as const,
      cachedAt: 1700000000,
      layers: [],
    }

    mockCompiler.compile.mockResolvedValue(mockCompiled)

    const result = await runPreviewPrompt('backend-agent', 'sonnet', '/my-project')

    expect(result).toBeDefined()
    const parsed = JSON.parse(result)
    expect(parsed.compiledText).toBe('You are a backend specialist...')
    expect(parsed.tokenCount).toBe(250)
    expect(parsed.modelFamily).toBe('sonnet')
    expect(parsed.cachedAt).toBe(1700000000)
    expect(parsed.fingerprint).toBe('abc123')
  })

  it('should use haiku model family', async () => {
    const mockCompiled = {
      text: 'Haiku prompt...',
      tokenCount: 150,
      fingerprint: 'def456',
      modelFamily: 'haiku' as const,
      cachedAt: 1700000001,
      layers: [],
    }

    mockCompiler.compile.mockResolvedValue(mockCompiled)

    const result = await runPreviewPrompt('quick-review', 'haiku', '/my-project')

    const parsed = JSON.parse(result)
    expect(parsed.modelFamily).toBe('haiku')
    expect(parsed.tokenCount).toBe(150)
  })

  it('should use opus model family', async () => {
    const mockCompiled = {
      text: 'Opus prompt...',
      tokenCount: 1200,
      fingerprint: 'ghi789',
      modelFamily: 'opus' as const,
      cachedAt: 1700000002,
      layers: [],
    }

    mockCompiler.compile.mockResolvedValue(mockCompiled)

    const result = await runPreviewPrompt('complex-arch', 'opus', '/my-project')

    const parsed = JSON.parse(result)
    expect(parsed.modelFamily).toBe('opus')
    expect(parsed.tokenCount).toBe(1200)
  })

  it('should handle compile errors gracefully', async () => {
    mockCompiler.compile.mockRejectedValue(new Error('Agent not found'))

    const result = await runPreviewPrompt('nonexistent-agent', 'sonnet', '/my-project')

    const parsed = JSON.parse(result)
    expect(parsed.error).toBeDefined()
    expect(parsed.error).toContain('nonexistent-agent')
    expect(parsed.error).toContain('Agent not found')
  })

  it('should pass correct agentName and modelFamily to compiler', async () => {
    mockCompiler.compile.mockResolvedValue({
      text: 'test',
      tokenCount: 100,
      fingerprint: 'test',
      modelFamily: 'opus' as const,
      cachedAt: 1700000000,
      layers: [],
    })

    await runPreviewPrompt('my-agent', 'opus', '/custom/project')

    expect(mockCompiler.compile).toHaveBeenCalledWith('my-agent', path.resolve('/custom/project'), 'opus')
  })

  it('should return valid JSON even on non-Error exceptions', async () => {
    mockCompiler.compile.mockRejectedValue('Unknown error')

    const result = await runPreviewPrompt('bad-agent', 'sonnet', '/my-project')

    expect(() => JSON.parse(result)).not.toThrow()
    const parsed = JSON.parse(result)
    expect(parsed.error).toBeDefined()
  })

  it('should include all required response fields on success', async () => {
    const mockCompiled = {
      text: 'prompt text',
      tokenCount: 300,
      fingerprint: 'fp123',
      modelFamily: 'sonnet' as const,
      cachedAt: 1700000010,
      layers: [],
    }

    mockCompiler.compile.mockResolvedValue(mockCompiled)

    const result = await runPreviewPrompt('test-agent', 'sonnet', '/project')

    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('compiledText')
    expect(parsed).toHaveProperty('tokenCount')
    expect(parsed).toHaveProperty('modelFamily')
    expect(parsed).toHaveProperty('cachedAt')
    expect(parsed).toHaveProperty('fingerprint')
  })

  it('should include agentName and modelFamily in error response', async () => {
    mockCompiler.compile.mockRejectedValue(new Error('Compile failed'))

    const result = await runPreviewPrompt('failing-agent', 'haiku', '/project')

    const parsed = JSON.parse(result)
    expect(parsed.agentName).toBe('failing-agent')
    expect(parsed.modelFamily).toBe('haiku')
  })
})
