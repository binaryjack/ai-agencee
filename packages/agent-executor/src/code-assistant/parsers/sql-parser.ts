/**
 * SQL Parser – line-based scanner (generic / multi-dialect)
 *
 * Supports T-SQL, PL/SQL, PL/pgSQL, DB2 SQL — one scanner covers all dialects
 * because CREATE DDL syntax is largely uniform.
 *
 * Extracts:
 *   - CREATE [OR REPLACE] PROCEDURE / FUNCTION / VIEW / TABLE / TRIGGER
 *   - CREATE TYPE / PACKAGE [BODY] / SEQUENCE
 *   - DROP is deliberately ignored (not a definition)
 *
 * "Imports" (dependencies) are extracted as:
 *   - Tables and views referenced via FROM / JOIN
 *   - Stored procedures invoked via EXEC / EXECUTE / CALL
 *
 * Export rule: always true — all DDL objects are schema-level.
 * Docstrings: -- comment lines immediately above the CREATE statement,
 *             or /* ... *\/ block comment above it.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'
import type { SqlAST, SqlDef, SqlParserInstance, SqlRawImport } from './sql-parser.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes  (all case-insensitive via .exec on lowercased copy)
// ──────────────────────────────────────────────────────────────────────────────

// CREATE [OR REPLACE] <objectType> [schema.]name
const CREATE_RE    = /create\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(procedure|proc|function|func|view|table|trigger|type|package(?:\s+body)?|sequence)\s+([\w."[\]`]+(?:\.[\w."[\]`]+)?)/i
// FROM / JOIN references (capture the first non-keyword word after FROM/JOIN)
const FROM_JOIN_RE = /(?:from|join)\s+([\w."[\]`]+(?:\.[\w."[\]`]+)?)/gi
// EXEC / EXECUTE / CALL
const EXEC_RE      = /(?:exec(?:ute)?|call)\s+([\w."[\]`]+(?:\.[\w."[\]`]+)?)/gi

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Remove surrounding brackets/backticks/quotes used in SQL identifiers. */
function cleanIdent(raw: string): string {
  return raw.replace(/^["'`\[]|["`\]]$/g, '').replace(/\]\[/g, '.')
}

/** Map CREATE keyword variants to canonical object type. */
function canonicalType(keyword: string): SqlDef['objectType'] {
  const k = keyword.toLowerCase().replace(/\s+/g, ' ')
  if (k === 'proc' || k === 'procedure') return 'procedure'
  if (k === 'func' || k === 'function')  return 'function'
  if (k === 'view')                      return 'view'
  if (k === 'table')                     return 'table'
  if (k === 'trigger')                   return 'trigger'
  if (k === 'type')                      return 'type'
  if (k.startsWith('package'))           return 'package'
  if (k === 'sequence')                  return 'sequence'
  return 'procedure'
}

/** Map canonical object type to Symbol kind. */
function toSymbolKind(t: SqlDef['objectType']): SqlDef['kind'] {
  switch (t) {
    case 'function':  return 'function'
    case 'procedure': return 'function'
    case 'view':      return 'class'
    case 'table':     return 'class'
    case 'trigger':   return 'function'
    case 'type':      return 'type'
    case 'package':   return 'class'
    case 'sequence':  return 'variable'
  }
}

function stripSqlLineComment(line: string): string {
  const idx = line.indexOf('--')
  return idx === -1 ? line : line.slice(0, idx)
}

/**
 * Extract a doc-comment block immediately above the CREATE statement.
 * Accepts both -- line comments and /* ... *\/ block comments.
 */
function extractSqlDocstring(rawLines: string[], declIdx: number): string | undefined {
  const parts: string[] = []
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = rawLines[i].trim()
    if (t.startsWith('--')) {
      parts.unshift(t.slice(2).trim())
    } else if (t === '' || t.toUpperCase() === 'GO' || t === '/') {
      continue
    } else {
      break
    }
  }
  return parts.length > 0 ? parts.join('\n') : undefined
}

/**
 * Find the line index of the end of a SQL object body.
 * Handles T-SQL (GO batch separator), PL/SQL (/ on its own line),
 * and generic brace counting for BEGIN...END blocks.
 */
function findSqlBodyEnd(lines: string[], startIdx: number): number {
  let depth = 0
  let foundBegin = false

  for (let i = startIdx; i < lines.length; i++) {
    const stripped = stripSqlLineComment(lines[i]).trim().toUpperCase()

    // T-SQL batch separator
    if (stripped === 'GO') return i

    // PL/SQL statement terminator
    if (stripped === '/') return i + 1

    // BEGIN ... END depth tracking
    if (/\bBEGIN\b/.test(stripped)) { depth++; foundBegin = true }
    if (/\bEND\b/.test(stripped))   { depth--; if (foundBegin && depth <= 0) return i + 1 }
  }
  return lines.length
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildSqlAST(content: string): SqlAST {
  const rawLines   = content.split('\n')
  const definitions: SqlDef[]       = []
  const imports:     SqlRawImport[] = []

  // Track seen table references to avoid duplicates
  const seenRefs = new Set<string>()

  // Strip block comments for the scanning copy
  const cleanLines: string[] = []
  let inBlock = false
  for (const line of rawLines) {
    if (inBlock) {
      const end = line.indexOf('*/')
      if (end !== -1) { inBlock = false; cleanLines.push(line.slice(end + 2)) }
      else { cleanLines.push('') }
      continue
    }
    const start = line.indexOf('/*')
    if (start !== -1) {
      const end = line.indexOf('*/', start + 2)
      if (end !== -1) { cleanLines.push(line.slice(0, start) + line.slice(end + 2)) }
      else { inBlock = true; cleanLines.push(line.slice(0, start)) }
    } else {
      cleanLines.push(stripSqlLineComment(line))
    }
  }

  let i = 0
  while (i < cleanLines.length) {
    const trimmed = cleanLines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── CREATE statement ────────────────────────────────────────────────────
    const cm = CREATE_RE.exec(trimmed)
    if (cm) {
      const objectType = canonicalType(cm[1])
      const rawName    = cm[2]
      const name       = cleanIdent(rawName.split('.').pop() ?? rawName)
      const displayName = cleanIdent(rawName)
      const lineEnd    = findSqlBodyEnd(cleanLines, i + 1)

      // Extract FROM/JOIN refs and EXEC calls from the body
      const body = cleanLines.slice(i, lineEnd).join('\n')
      let fmMatch: RegExpExecArray | null
      FROM_JOIN_RE.lastIndex = 0
      while ((fmMatch = FROM_JOIN_RE.exec(body)) !== null) {
        const ref = cleanIdent(fmMatch[1])
        if (!seenRefs.has(ref)) {
          seenRefs.add(ref)
          imports.push({ specifier: ref, refType: 'table' })
        }
      }
      EXEC_RE.lastIndex = 0
      while ((fmMatch = EXEC_RE.exec(body)) !== null) {
        const ref = cleanIdent(fmMatch[1])
        if (!seenRefs.has(ref)) {
          seenRefs.add(ref)
          imports.push({ specifier: ref, refType: 'exec' })
        }
      }

      definitions.push({
        kind:        toSymbolKind(objectType),
        name,
        displayName,
        lineStart:   i + 1,
        lineEnd,
        signature:   trimmed.slice(0, 120),
        docstring:   extractSqlDocstring(rawLines, i),
        isExported:  true,
        objectType,
      })
      i = lineEnd
      continue
    }

    i++
  }

  return { lines: rawLines, definitions, imports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor + prototype methods
// ──────────────────────────────────────────────────────────────────────────────

export const SqlParser = function(this: SqlParserInstance) {} as unknown as new () => SqlParserInstance

SqlParser.prototype.parse = async function(
  this: SqlParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<SqlAST> {
  return buildSqlAST(content)
}

SqlParser.prototype.extractSymbols = async function(
  this: SqlParserInstance,
  ast: SqlAST
): Promise<Symbol[]> {
  const { lines } = ast
  return ast.definitions.map(d => {
    const charStart = lines.slice(0, d.lineStart - 1).reduce((s, l) => s + l.length + 1, 0)
    const charEnd   = lines.slice(0, d.lineEnd).reduce((s, l) => s + l.length + 1, 0)
    return {
      name:       d.displayName,
      kind:       d.kind,
      lineStart:  d.lineStart,
      lineEnd:    d.lineEnd,
      charStart,
      charEnd,
      signature:  d.signature,
      docstring:  d.docstring,
      isExported: d.isExported,
    }
  })
}

SqlParser.prototype.extractImports = async function(
  this: SqlParserInstance,
  ast: SqlAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      'local' as Import['type'],
    names:     [],
  }))
}

SqlParser.prototype.extractExports = async function(
  this: SqlParserInstance,
  ast: SqlAST
): Promise<Export[]> {
  return ast.definitions.map(d => ({
    name: d.displayName,
    kind: d.kind,
  }))
}
