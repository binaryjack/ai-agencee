/**
 * Type definitions for JavaParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed Java file. */
export type JavaAST = {
  lines:       string[]
  definitions: JavaDef[]
  imports:     JavaRawImport[]
}

export type JavaDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ClassName.methodName" for methods
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // true if public or protected
  ownerClass?: string           // set for methods/fields inside a class
}

export type JavaRawImport = {
  specifier:  string            // e.g. "java.util.List", "com.example.MyClass"
  isStatic:   boolean
  isStdlib:   boolean           // starts with java. or javax.
}

export type JavaParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<JavaAST>
  extractSymbols(ast: JavaAST): Promise<Symbol[]>
  extractImports(ast: JavaAST): Promise<Import[]>
  extractExports(ast: JavaAST): Promise<Export[]>
}
