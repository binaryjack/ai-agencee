/**
 * Type definitions for PythonParser
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'

/** Internal representation of a parsed Python file, passed between parse() and extract*(). */
export type PythonAST = {
  /** Raw source lines (1-indexed access via lines[lineNumber - 1]). */
  lines:       string[]
  definitions: PythonDef[]
  imports:     PythonRawImport[]
  /** Names listed in `__all__`, empty if not defined. */
  allExports:  string[]
}

export type PythonDef = {
  kind:        'class' | 'function' | 'method'
  name:        string          // bare name, e.g. "my_func"
  displayName: string          // "ClassName.my_func" for methods, bare otherwise
  lineStart:   number          // 1-indexed
  lineEnd:     number          // 1-indexed (best-effort)
  indent:      number          // column offset of the `def`/`class` keyword
  isAsync:     boolean
  decorators:  string[]
  signature:   string          // full def/class line (normalized whitespace)
  docstring?:  string
  parentClass?: string         // name of enclosing class, if any
}

export type PythonRawImport = {
  from:    string | null       // null for `import X` style
  names:   string[]
  isLocal: boolean             // true if from-module starts with '.'
}

export type PythonParserInstance = {
  parse(content: string, context?: ParserOptions): Promise<PythonAST>
  extractSymbols(ast: PythonAST): Promise<Symbol[]>
  extractImports(ast: PythonAST): Promise<Import[]>
  extractExports(ast: PythonAST): Promise<Export[]>
}
