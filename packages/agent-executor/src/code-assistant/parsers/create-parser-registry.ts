/**
 * Factory for ParserRegistry
 * Auto-registers all built-in parsers (TypeScript/JS, Python, Go, Java, Rust, C#, Ruby, Kotlin, SQL).
 */

import { createCSharpParser } from './create-csharp-parser'
import { createGoParser } from './create-go-parser'
import { createJavaParser } from './create-java-parser'
import { createKotlinParser } from './create-kotlin-parser'
import { createPythonParser } from './create-python-parser'
import { createRubyParser } from './create-ruby-parser'
import { createRustParser } from './create-rust-parser'
import { createSqlParser } from './create-sql-parser'
import { createTypeScriptParser } from './create-typescript-parser'
import type { ParserRegistryOptions } from './parser-protocol.types'
import type { ParserRegistryInstance } from './parser-registry'
import { ParserRegistry } from './parser-registry'

export const createParserRegistry = function(options: ParserRegistryOptions = {}): ParserRegistryInstance {
  const registry = new (ParserRegistry as any)(options) as ParserRegistryInstance

  // Built-in parsers (customParsers in options can override these)
  const tsParser = createTypeScriptParser({ language: 'typescript' })
  registry.register('typescript', tsParser)
  registry.register('javascript', tsParser)
  registry.register('python', createPythonParser())
  registry.register('go', createGoParser())
  registry.register('java', createJavaParser())
  registry.register('rust', createRustParser())
  registry.register('csharp', createCSharpParser())
  registry.register('ruby', createRubyParser())
  registry.register('kotlin', createKotlinParser())
  registry.register('sql', createSqlParser())

  return registry
}
