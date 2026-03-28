/**
 * Type definitions for RubyParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed Ruby file. */
export type RubyAST = {
  lines:       string[]
  definitions: RubyDef[]
  imports:     RubyRawImport[]
}

export type RubyDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ClassName#method" or "ClassName.method" for class methods
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // false if preceded by `private` or `protected` at same depth
  ownerClass?: string           // set for methods inside a class/module
  isClassMethod: boolean        // true for def self.name
}

export type RubyRawImport = {
  specifier: string             // e.g. "json", "net/http", "active_record"
  isStdlib:  boolean            // no slashes (e.g. "json", "set") or known stdlib names
}

export type RubyParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<RubyAST>
  extractSymbols(ast: RubyAST): Promise<Symbol[]>
  extractImports(ast: RubyAST): Promise<Import[]>
  extractExports(ast: RubyAST): Promise<Export[]>
}
