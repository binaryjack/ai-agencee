/**
 * Factory for SqlParser
 */

import { SqlParser } from './sql-parser'
import type { SqlParserInstance } from './sql-parser.types'

export const createSqlParser = function(): SqlParserInstance {
  return new (SqlParser as any)()
}
