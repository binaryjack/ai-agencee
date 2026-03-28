/**
 * Factory for RustParser
 */

import { RustParser } from './rust-parser'
import type { RustParserInstance } from './rust-parser.types'

export const createRustParser = function(): RustParserInstance {
  return new (RustParser as any)()
}
