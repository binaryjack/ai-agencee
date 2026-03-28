/**
 * Type definitions for SqlParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal AST representation for a parsed SQL file. */
export type SqlAST = {
  lines:       string[]
  definitions: SqlDef[]
  imports:     SqlRawImport[]
}

export type SqlDef = {
  kind:        'function' | 'class' | 'interface' | 'type' | 'variable'
  name:        string
  displayName: string           // schema-qualified name e.g. "dbo.GetUserById"
  lineStart:   number           // 1-indexed
  lineEnd:     number           // 1-indexed (best-effort)
  signature:   string
  docstring?:  string
  isExported:  boolean          // always true — DDL objects are schema-level public
  objectType:  'procedure' | 'function' | 'view' | 'table' | 'trigger' | 'type' | 'package' | 'sequence'
}

/** SQL "imports" = table/view references via FROM / JOIN / EXEC */
export type SqlRawImport = {
  specifier: string             // e.g. "dbo.Users", "public.orders"
  refType:   'table' | 'exec'  // FROM/JOIN reference vs EXEC/CALL
}

export type SqlParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<SqlAST>
  extractSymbols(ast: SqlAST): Promise<Symbol[]>
  extractImports(ast: SqlAST): Promise<Import[]>
  extractExports(ast: SqlAST): Promise<Export[]>
}
