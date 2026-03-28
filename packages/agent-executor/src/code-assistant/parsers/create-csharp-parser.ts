/**
 * Factory for CSharpParser
 */

import { CSharpParser } from './csharp-parser'
import type { CSharpParserInstance } from './csharp-parser.types'

export const createCSharpParser = function(): CSharpParserInstance {
  return new (CSharpParser as any)()
}
