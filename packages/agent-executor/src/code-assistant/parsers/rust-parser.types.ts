/**
 * Type definitions for RustParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed Rust file. */
export type RustAST = {
  lines:       string[]
  definitions: RustDef[]
  imports:     RustRawImport[]
}

export type RustDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ImplType.method" for methods inside impl blocks
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // true if pub or pub(crate)
  implType?:   string           // set for methods inside impl blocks
}

export type RustRawImport = {
  specifier: string             // e.g. "std::collections::HashMap", "serde"
  isStdlib:  boolean            // starts with std:: or core:: or alloc::
}

export type RustParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<RustAST>
  extractSymbols(ast: RustAST): Promise<Symbol[]>
  extractImports(ast: RustAST): Promise<Import[]>
  extractExports(ast: RustAST): Promise<Export[]>
}
