import * as path from 'path'
import { appendRulesToFile } from '../../lib/rules-parser.js'

/**
 * Push rules to the project's .ai/rules.md file.
 * Accepts an array of rules in JSON format and appends/replaces them.
 */
export const runPushRules = async (
  projectRoot: string,
  rulesJson: string,
): Promise<string> => {
  try {
    const parsed = JSON.parse(rulesJson)
    const rules = Array.isArray(parsed) ? parsed : parsed.rules ?? []

    if (!Array.isArray(rules)) {
      return JSON.stringify(
        {
          success: false,
          error: 'Invalid rules format: expected array or { rules: [] }',
        },
        null,
        2,
      )
    }

    const rulesPath = path.join(projectRoot, '.ai', 'rules.md')
    await appendRulesToFile(rulesPath, rules)

    return JSON.stringify(
      {
        success: true,
        count: rules.length,
        message: `Pushed ${rules.length} rule(s) to ${rulesPath}`,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    )
  } catch (err) {
    return JSON.stringify(
      {
        success: false,
        error: `Failed to push rules: ${err instanceof Error ? err.message : String(err)}`,
      },
      null,
      2,
    )
  }
}
