/**
 * Factory for GoParser
 */

import { GoParser } from './go-parser'
import type { GoParserInstance } from './go-parser.types'

export const createGoParser = function(): GoParserInstance {
  return new (GoParser as any)()
}
