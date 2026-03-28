/**
 * Factory for RubyParser
 */

import { RubyParser } from './ruby-parser'
import type { RubyParserInstance } from './ruby-parser.types'

export const createRubyParser = function(): RubyParserInstance {
  return new (RubyParser as any)()
}
