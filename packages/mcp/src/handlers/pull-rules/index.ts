import * as path from 'path'
import { parseRulesFile } from '../../lib/rules-parser.js'

/**
 * Pull project rules from .ai/rules.md and return as JSON.
 * Called by external systems to sync rules in.
 */
export const runPullRules = async (projectRoot: string): Promise<string> => {
  const rulesPath = path.join(projectRoot, '.ai', 'rules.md')

  try {
    const rules = await parseRulesFile(rulesPath)

    return JSON.stringify(
      {
        success: true,
        count: rules.length,
        rules,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    )
  } catch (err) {
    return JSON.stringify(
      {
        success: false,
        error: `Failed to pull rules: ${err instanceof Error ? err.message : String(err)}`,
      },
      null,
      2,
    )
  }
}
