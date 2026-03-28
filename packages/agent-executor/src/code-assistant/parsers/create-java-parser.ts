/**
 * Factory for JavaParser
 */

import { JavaParser } from './java-parser'
import type { JavaParserInstance } from './java-parser.types'

export const createJavaParser = function(): JavaParserInstance {
  return new (JavaParser as any)()
}
