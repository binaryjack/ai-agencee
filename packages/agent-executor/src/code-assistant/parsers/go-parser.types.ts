/**
 * Type definitions for GoParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed Go file. */
export type GoAST = {
  lines:       string[]
  definitions: GoDef[]
  imports:     GoRawImport[]
}

export type GoDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ReceiverType.Name" for methods
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // true if first char is uppercase
  receiverType?: string         // set for methods
}

export type GoRawImport = {
  specifier: string             // e.g. "fmt", "github.com/some/lib"
  isStdlib:  boolean
}

export type GoParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<GoAST>
  extractSymbols(ast: GoAST): Promise<Symbol[]>
  extractImports(ast: GoAST): Promise<Import[]>
  extractExports(ast: GoAST): Promise<Export[]>
}
