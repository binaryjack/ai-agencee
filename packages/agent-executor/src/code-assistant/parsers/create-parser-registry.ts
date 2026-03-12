/**
 * Factory for ParserRegistry
 * Auto-registers all built-in parsers (TypeScript/JS, Python, Go).
 */

import type { ParserRegistryOptions } from './parser-protocol.types'
import type { ParserRegistryInstance } from './parser-registry'
import { ParserRegistry } from './parser-registry'
import { createTypeScriptParser } from './create-typescript-parser'
import { createPythonParser } from './create-python-parser'
import { createGoParser } from './create-go-parser'

export const createParserRegistry = function(options: ParserRegistryOptions = {}): ParserRegistryInstance {
  const registry = new (ParserRegistry as any)(options) as ParserRegistryInstance

  // Built-in parsers (customParsers in options can override these)
  const tsParser = createTypeScriptParser({ language: 'typescript' })
  registry.register('typescript', tsParser)
  registry.register('javascript', tsParser)
  registry.register('python', createPythonParser())
  registry.register('go', createGoParser())

  return registry
}
