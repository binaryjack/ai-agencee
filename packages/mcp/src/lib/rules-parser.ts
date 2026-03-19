import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Parsed rule from .ai/rules.md
 */
export interface Rule {
  name: string
  body: string
}

/**
 * Parse all rules from .ai/rules.md
 * Format: each rule is a top-level heading (# Rule Name) followed by markdown content until next heading.
 */
export const parseRulesFile = async (filePath: string): Promise<Rule[]> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return parseRulesText(content)
  } catch {
    return []
  }
}

/**
 * Parse rules from raw text content.
 */
export const parseRulesText = (content: string): Rule[] => {
  const rules: Rule[] = []
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Look for top-level heading (# Rule Name)
    if (line.startsWith('# ')) {
      const name = line.slice(2).trim()
      i++

      // Collect body until next heading or EOF
      const bodyLines: string[] = []
      while (i < lines.length && !lines[i].startsWith('#')) {
        bodyLines.push(lines[i])
        i++
      }

      // Remove trailing whitespace from body
      while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) {
        bodyLines.pop()
      }

      rules.push({
        name,
        body: bodyLines.join('\n'),
      })
    } else {
      i++
    }
  }

  return rules
}

/**
 * Serialize rule to markdown format (# rule.name followed by body).
 */
export const serializeRule = (rule: Rule): string => {
  return `# ${rule.name}\n${rule.body}\n`
}

/**
 * Append or replace a rule in .ai/rules.md
 * If a rule with the same name exists, replace it; otherwise append.
 */
export const appendRulesToFile = async (
  filePath: string,
  rulesToAdd: Rule[],
): Promise<void> => {
  // Ensure directory exists
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  // Read existing rules
  const existingRules = await parseRulesFile(filePath)

  // Merge: replace existing, keep new
  const ruleMap = new Map(existingRules.map(r => [r.name, r]))
  for (const rule of rulesToAdd) {
    ruleMap.set(rule.name, rule)
  }

  // Serialize back to file
  const content = Array.from(ruleMap.values())
    .map(serializeRule)
    .join('\n')

  await fs.writeFile(filePath, content, 'utf-8')
}
