import { parseFindingsFromLlmOutput } from '../finding-parser.js'

describe('finding-parser', () => {
  describe('parseFindingsFromLlmOutput', () => {
    it('parses ERROR finding with line and column', () => {
      const raw = '[ERROR] src/index.ts:42:5 — Function complexity exceeds threshold'
      const findings = parseFindingsFromLlmOutput(raw, 'backend-review')

      expect(findings).toHaveLength(1)
      expect(findings[0]).toEqual({
        severity: 'ERROR',
        file: 'src/index.ts',
        line: 42,
        column: 5,
        message: 'Function complexity exceeds threshold',
        agentName: 'backend-review',
      })
    })

    it('parses WARNING finding without column', () => {
      const raw = '[WARNING] src/utils.ts:15 — Missing error handler'
      const findings = parseFindingsFromLlmOutput(raw)

      expect(findings).toHaveLength(1)
      expect(findings[0]).toEqual({
        severity: 'WARNING',
        file: 'src/utils.ts',
        line: 15,
        column: undefined,
        message: 'Missing error handler',
        agentName: undefined,
      })
    })

    it('parses INFO-level finding', () => {
      const raw = '[INFO] README.md:1 — Documentation could be clearer'
      const findings = parseFindingsFromLlmOutput(raw)

      expect(findings).toHaveLength(1)
      expect(findings[0].severity).toBe('INFO')
    })

    it('parses multiple findings from multiline output', () => {
      const raw = `[ERROR] src/index.ts:10:2 — Missing semicolon
[WARNING] src/index.ts:15:8 — Unused variable
[INFO] src/index.ts:20:1 — Consider using const`

      const findings = parseFindingsFromLlmOutput(raw, 'linter-agent')

      expect(findings).toHaveLength(3)
      expect(findings[0].severity).toBe('ERROR')
      expect(findings[1].severity).toBe('WARNING')
      expect(findings[2].severity).toBe('INFO')
      expect(findings.every(f => f.agentName === 'linter-agent')).toBe(true)
    })

    it('handles hyphen or em-dash separator', () => {
      const raw1 = '[ERROR] file.ts:1:1 — message'
      const raw2 = '[ERROR] file.ts:1:1 - message'

      expect(parseFindingsFromLlmOutput(raw1)).toHaveLength(1)
      expect(parseFindingsFromLlmOutput(raw2)).toHaveLength(1)
    })

    it('returns empty array when no findings present', () => {
      const raw = 'No findings detected in this code'
      const findings = parseFindingsFromLlmOutput(raw)

      expect(findings).toEqual([])
    })
  })
})
