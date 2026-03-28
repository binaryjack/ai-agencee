/**
 * Type definitions for CSharpParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed C# file. */
export type CSharpAST = {
  lines:       string[]
  definitions: CSharpDef[]
  imports:     CSharpRawImport[]
}

export type CSharpDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // "ClassName.MethodName" for members
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // true if public or protected
  ownerType?:  string           // set for members inside a type declaration
}

export type CSharpRawImport = {
  specifier: string             // e.g. "System.Collections.Generic", "MyApp.Services"
  isStatic:  boolean
  isStdlib:  boolean            // starts with System. or Microsoft.
}

export type CSharpParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<CSharpAST>
  extractSymbols(ast: CSharpAST): Promise<Symbol[]>
  extractImports(ast: CSharpAST): Promise<Import[]>
  extractExports(ast: CSharpAST): Promise<Export[]>
}
