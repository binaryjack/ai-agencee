/**
 * Type definitions for KotlinParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed Kotlin file. */
export type KotlinAST = {
  lines:       string[]
  definitions: KotlinDef[]
  imports:     KotlinRawImport[]
}

export type KotlinDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ClassName.method" for members
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // true unless explicitly private or internal
  ownerClass?: string           // set for members inside a class/object
}

export type KotlinRawImport = {
  specifier: string             // e.g. "kotlin.collections.List", "io.ktor.server"
  isStdlib:  boolean            // starts with kotlin., java., javax., kotlinx.
}

export type KotlinParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<KotlinAST>
  extractSymbols(ast: KotlinAST): Promise<Symbol[]>
  extractImports(ast: KotlinAST): Promise<Import[]>
  extractExports(ast: KotlinAST): Promise<Export[]>
}
