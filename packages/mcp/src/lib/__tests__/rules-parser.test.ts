import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { appendRulesToFile, parseRulesFile, parseRulesText, serializeRule } from '../rules-parser.js'

describe('rules-parser', () => {
  describe('parseRulesText', () => {
    it('parses single rule from markdown', () => {
      const content = `# No Default Exports
Avoid default exports; use named exports instead.`

      const rules = parseRulesText(content)
      expect(rules).toHaveLength(1)
      expect(rules[0].name).toBe('No Default Exports')
      expect(rules[0].body).toContain('named exports')
    })

    it('parses multiple rules', () => {
      const content = `# Rule One
Body for rule one

# Rule Two
Body for rule two`

      const rules = parseRulesText(content)
      expect(rules).toHaveLength(2)
      expect(rules[0].name).toBe('Rule One')
      expect(rules[1].name).toBe('Rule Two')
    })

    it('handles multiline rule body', () => {
      const content = `# Complex Rule
Line 1
Line 2
Line 3`

      const rules = parseRulesText(content)
      expect(rules[0].body).toContain('Line 1')
      expect(rules[0].body).toContain('Line 3')
    })

    it('ignores content before first heading', () => {
      const content = `Some preamble text
# Rule
Rule body`

      const rules = parseRulesText(content)
      expect(rules).toHaveLength(1)
    })

    it('returns empty array for empty content', () => {
      const rules = parseRulesText('')
      expect(rules).toEqual([])
    })
  })

  describe('serializeRule', () => {
    it('converts rule to markdown format', () => {
      const rule = { name: 'Test Rule', body: 'Body text' }
      const serialized = serializeRule(rule)

      expect(serialized).toContain('# Test Rule')
      expect(serialized).toContain('Body text')
    })
  })

  describe('appendRulesToFile', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rules-parser-'))
    })

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    it('creates new rules file', async () => {
      const filePath = path.join(tempDir, '.ai', 'rules.md')
      const rules = [{ name: 'Rule 1', body: 'Body 1' }]

      await appendRulesToFile(filePath, rules)

      const exists = await fs.stat(filePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('appends new rule to existing file', async () => {
      const filePath = path.join(tempDir, 'rules.md')
      const rule1 = { name: 'Rule 1', body: 'Body 1' }
      const rule2 = { name: 'Rule 2', body: 'Body 2' }

      await appendRulesToFile(filePath, [rule1])
      await appendRulesToFile(filePath, [rule2])

      const parsed = await parseRulesFile(filePath)
      expect(parsed).toHaveLength(2)
    })

    it('replaces existing rule with same name', async () => {
      const filePath = path.join(tempDir, 'rules.md')
      const rule1 = { name: 'Rule', body: 'Original body' }
      const rule1Updated = { name: 'Rule', body: 'Updated body' }

      await appendRulesToFile(filePath, [rule1])
      await appendRulesToFile(filePath, [rule1Updated])

      const parsed = await parseRulesFile(filePath)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].body).toContain('Updated body')
    })
  })
})
