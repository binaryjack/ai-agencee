import { getAgentCapabilities } from '../handlers/get-agent-capabilities/index.js'

describe('getAgentCapabilities()', () => {
  it('returns non-empty checkTypes array', () => {
    const caps = getAgentCapabilities()
    expect(caps.checkTypes.length).toBeGreaterThan(0)
  })

  it('contains llm-review type', () => {
    const caps = getAgentCapabilities()
    expect(caps.checkTypes.map(c => c.type)).toContain('llm-review')
  })

  it('contains llm-generate type', () => {
    const caps = getAgentCapabilities()
    expect(caps.checkTypes.map(c => c.type)).toContain('llm-generate')
  })

  it('each entry has type + description + inputSchema', () => {
    const caps = getAgentCapabilities()
    for (const entry of caps.checkTypes) {
      expect(typeof entry.type).toBe('string')
      expect(entry.type.length).toBeGreaterThan(0)
      expect(typeof entry.description).toBe('string')
      expect(entry.description.length).toBeGreaterThan(0)
      expect(typeof entry.inputSchema).toBe('object')
    }
  })
})
