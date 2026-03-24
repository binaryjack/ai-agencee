/**
 * Go Parser – line-based scanner
 *
 * Extracts: functions, methods (receiver funcs), structs, interfaces,
 * type aliases/definitions, variables, constants, and import blocks.
 *
 * Export rule: a Go identifier is exported if its first character is uppercase.
 * Docstrings: Go uses `//` comment lines directly preceding the declaration.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { GoAST, GoDef, GoParserInstance, GoRawImport } from './go-parser.types'
import type { ParserOptions } from './parser-protocol.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

// Matches: func (recv RecvType) Name( or func Name(
const FUNC_RE        = /^func\s+(?:\(\s*\w+\s+\*?(\w+)\s*\)\s+)?(\w+)\s*\(/
const TYPE_STRUCT_RE = /^type\s+(\w+)\s+struct\b/
const TYPE_IFACE_RE  = /^type\s+(\w+)\s+interface\b/
const TYPE_ALIAS_RE  = /^type\s+(\w+)\s*=/
const TYPE_NAMED_RE  = /^type\s+(\w+)\s+\w/
const VAR_RE         = /^(?:var|const)\s+(\w+)/
// Use RegExp constructor to avoid TypeScript lexer issues with `"` and `\(` inside regex literals
const IMP_SINGLE_RE  = new RegExp('^import\\s+"([^"]+)"')
const IMP_BLOCK_RE   = new RegExp('^import\\s*\\(')

// ──────────────────────────────────────────────────────────────────────────────
// Helpers – declared before use
// ──────────────────────────────────────────────────────────────────────────────

// Strip both // line-comments and /* block-comments */ from Go source, preserving line count.
function stripGoComments(lines: string[]): string[] {
  const out: string[] = []
  let inBlock = false

  for (const line of lines) {
    if (inBlock) {
      const end = line.indexOf('*/')
      if (end !== -1) { inBlock = false; out.push(line.slice(end + 2)) }
      else { out.push('') }
      continue
    }

    let result = ''
    let j = 0
    while (j < line.length) {
      if (line[j] === '/' && line[j + 1] === '/') break
      if (line[j] === '/' && line[j + 1] === '*') {
        const end = line.indexOf('*/', j + 2)
        if (end !== -1) { j = end + 2; continue }
        inBlock = true
        break
      }
      result += line[j++]
    }
    out.push(result)
  }
  return out
}

/** Collect the func signature up to the first `{` (stripped). */
function collectGoSignature(lines: string[], startIdx: number): string {
  const parts: string[] = []
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const t = lines[i].trim()
    parts.push(t)
    if (t.endsWith('{') || t === '{') break
  }
  return parts.join(' ').replace(/\s*\{$/, '').trim()
}

/**
 * Extract a `//` doc-comment block immediately above the declaration.
 * Uses rawLines (before comment stripping) for accuracy.
 */
function extractGoDocstring(rawLines: string[], declIdx: number): string | undefined {
  const parts: string[] = []
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = rawLines[i].trim()
    if (t.startsWith('//')) { parts.unshift(t.slice(2).trim()) }
    else { break }
  }
  return parts.length > 0 ? parts.join('\n') : undefined
}

/** Find the 1-indexed last line of a `{...}` block starting at or after `startIdx`. */
function findGoBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0
  let found = false
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i].trim()) {
      if (ch === '{') { depth++; found = true }
      else if (ch === '}') { depth--; if (found && depth === 0) return i + 1 }
    }
  }
  return lines.length
}

/** True if the Go identifier begins with an uppercase letter (exported). */
function isGoExported(name: string): boolean {
  return /^[A-Z]/.test(name)
}

/**
 * Stdlib heuristic: packages with no `.` in the first path segment are stdlib.
 * e.g. "fmt", "net/http" vs "github.com/user/repo".
 */
function isGoStdlib(specifier: string): boolean {
  return !specifier.split('/')[0].includes('.')
}

function classifyGoImport(specifier: string): 'builtin' | 'npm' {
  return isGoStdlib(specifier) ? 'builtin' : 'npm'
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildGoAST(content: string): GoAST {
  const rawLines   = content.split('\n')
  const lines      = stripGoComments(rawLines)
  const definitions: GoDef[]       = []
  const imports:     GoRawImport[] = []

  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── Import block ─────────────────────────────────────────────────────────
    if (IMP_BLOCK_RE.test(trimmed)) {
      i++
      while (i < lines.length) {
        const inner = lines[i].trim()
        if (inner === ')') break
        const m = inner.match(new RegExp('(?:\\w+\\s+)?"([^"]+)"'))
        if (m) imports.push({ specifier: m[1], isStdlib: isGoStdlib(m[1]) })
        i++
      }
      i++
      continue
    }

    // ── Single import ─────────────────────────────────────────────────────────
    const si = IMP_SINGLE_RE.exec(trimmed)
    if (si) {
      imports.push({ specifier: si[1], isStdlib: isGoStdlib(si[1]) })
      i++
      continue
    }

    // ── func ─────────────────────────────────────────────────────────────────
    const fm = FUNC_RE.exec(trimmed)
    if (fm) {
      const receiverType = fm[1] ?? undefined
      const name         = fm[2]
      const displayName  = receiverType ? `${receiverType}.${name}` : name
      const lineEnd      = findGoBlockEnd(lines, i)
      definitions.push({
        kind:         'function',
        name, displayName,
        lineStart:    i + 1,
        lineEnd,
        signature:    collectGoSignature(lines, i),
        docstring:    extractGoDocstring(rawLines, i),
        isExported:   isGoExported(name),
        receiverType,
      })
      i = lineEnd
      continue
    }

    // ── type … struct ─────────────────────────────────────────────────────────
    const sm = TYPE_STRUCT_RE.exec(trimmed)
    if (sm) {
      const name    = sm[1]
      const lineEnd = findGoBlockEnd(lines, i)
      definitions.push({
        kind: 'class', name, displayName: name,
        lineStart: i + 1, lineEnd,
        signature:  `type ${name} struct`,
        docstring:  extractGoDocstring(rawLines, i),
        isExported: isGoExported(name),
      })
      i = lineEnd
      continue
    }

    // ── type … interface ─────────────────────────────────────────────────────
    const ifm = TYPE_IFACE_RE.exec(trimmed)
    if (ifm) {
      const name    = ifm[1]
      const lineEnd = findGoBlockEnd(lines, i)
      definitions.push({
        kind: 'interface', name, displayName: name,
        lineStart: i + 1, lineEnd,
        signature:  `type ${name} interface`,
        docstring:  extractGoDocstring(rawLines, i),
        isExported: isGoExported(name),
      })
      i = lineEnd
      continue
    }

    // ── type alias / named type ───────────────────────────────────────────────
    const am = TYPE_ALIAS_RE.exec(trimmed) ?? TYPE_NAMED_RE.exec(trimmed)
    if (am && !TYPE_STRUCT_RE.test(trimmed) && !TYPE_IFACE_RE.test(trimmed)) {
      const name = am[1]
      definitions.push({
        kind: 'type', name, displayName: name,
        lineStart: i + 1, lineEnd: i + 1,
        signature:  trimmed,
        docstring:  extractGoDocstring(rawLines, i),
        isExported: isGoExported(name),
      })
      i++
      continue
    }

    // ── var / const ───────────────────────────────────────────────────────────
    const vm = VAR_RE.exec(trimmed)
    if (vm) {
      const name = vm[1]
      definitions.push({
        kind: 'variable', name, displayName: name,
        lineStart: i + 1, lineEnd: i + 1,
        signature:  trimmed,
        docstring:  extractGoDocstring(rawLines, i),
        isExported: isGoExported(name),
      })
      i++
      continue
    }

    i++
  }

  return { lines: rawLines, definitions, imports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor
// ──────────────────────────────────────────────────────────────────────────────

export const GoParser = function(this: GoParserInstance) {} as unknown as new () => GoParserInstance

GoParser.prototype.parse = async function(
  content: string,
  _context: ParserOptions = {}
): Promise<GoAST> {
  return buildGoAST(content)
}

GoParser.prototype.extractSymbols = async function(ast: GoAST): Promise<Symbol[]> {
  const { definitions, lines } = ast
  
  return definitions.map((def: GoDef) => {
    // Calculate character offsets from line positions
    const charStart = lines.slice(0, def.lineStart - 1).reduce((sum, line) => sum + line.length + 1, 0)
    const charEnd = lines.slice(0, def.lineEnd).reduce((sum, line) => sum + line.length + 1, 0)

    return {
      name:       def.displayName,
      kind:       def.kind,
      lineStart:  def.lineStart,
      lineEnd:    def.lineEnd,
      charStart,
      charEnd,
      signature:  def.signature,
      docstring:  def.docstring,
      isExported: def.isExported,
    }
  })
}

GoParser.prototype.extractImports = async function(ast: GoAST): Promise<Import[]> {
  return ast.imports.map((raw: GoRawImport) => ({
    specifier: raw.specifier,
    type:      (raw.isStdlib ? 'builtin' : classifyGoImport(raw.specifier)) as Import['type'],
    names:     [],
  }))
}

GoParser.prototype.extractExports = async function(ast: GoAST): Promise<Export[]> {
  return ast.definitions
    .filter((def: GoDef) => def.isExported)
    .map((def: GoDef) => ({
      name: def.displayName,
      kind: (def.kind === 'class' ? 'class'
           : def.kind === 'interface' ? 'interface'
           : def.kind === 'type' ? 'type'
           : 'function') as Export['kind'],
    }))
}
