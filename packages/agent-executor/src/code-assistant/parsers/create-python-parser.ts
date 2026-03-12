/**
 * Factory for PythonParser
 */

import { PythonParser } from './python-parser'
import type { PythonParserInstance } from './python-parser.types'

export const createPythonParser = function(): PythonParserInstance {
  return new (PythonParser as any)()
}
