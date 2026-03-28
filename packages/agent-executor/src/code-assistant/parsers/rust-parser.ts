/**
 * Rust Parser – line-based scanner
 *
 * Extracts: functions, methods (inside impl blocks), structs, enums, traits,
 * type aliases, constants, static items.
 *
 * Export rule: pub or pub(crate) modifier present.
 * Docstrings: /// comment lines directly above the declaration.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'
import type { RustAST, RustDef, RustParserInstance, RustRawImport } from './rust-parser.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

const FN_RE         = /^(pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+(\w+)/
const STRUCT_RE     = /^(pub(?:\([^)]*\))?\s+)?(?:derive\s+.*\s+)?struct\s+(\w+)/
const ENUM_RE       = /^(pub(?:\([^)]*\))?\s+)?enum\s+(\w+)/
const TRAIT_RE      = /^(pub(?:\([^)]*\))?\s+)?(?:unsafe\s+)?trait\s+(\w+)/
const IMPL_RE       = /^impl(?:<[^>]*>)?\s+(?:\w+\s+for\s+)?(\w+)/
const TYPE_RE       = /^(pub(?:\([^)]*\))?\s+)?type\s+(\w+)/
const CONST_RE      = /^(pub(?:\([^)]*\))?\s+)?(?:static|const)\s+(\w+)/
const USE_RE        = /^use\s+([^;]+);/

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function stripRustComments(lines: string[]): string[] {
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

function collectRustSignature(lines: string[], startIdx: number): string {
  const parts: string[] = []
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const t = lines[i].trim()
    parts.push(t)
    if (t.endsWith('{') || t.endsWith(';')) break
  }
  return parts.join(' ').replace(/\s*\{$/, '').trim()
}

/**
 * Extract /// doc-comment lines immediately above the declaration.
 * Uses rawLines for accuracy.
 */
function extractRustDocstring(rawLines: string[], declIdx: number): string | undefined {
  const parts: string[] = []
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = rawLines[i].trim()
    if (t.startsWith('///')) { parts.unshift(t.slice(3).trim()) }
    else if (t.startsWith('#[') || t === '') { continue }  // skip attributes and blanks
    else { break }
  }
  return parts.length > 0 ? parts.join('\n') : undefined
}

function findRustBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0
  let found = false
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; found = true }
      else if (ch === '}') { depth--; if (found && depth === 0) return i + 1 }
    }
  }
  return lines.length
}

function isRustExported(pubCapture: string | undefined): boolean {
  return Boolean(pubCapture)
}

function isRustStdlib(specifier: string): boolean {
  const root = specifier.split('::')[0]
  return root === 'std' || root === 'core' || root === 'alloc'
}

/**
 * Flatten a use tree like `std::collections::{HashMap, BTreeMap}` into
 * individual specifiers.
 */
function expandUse(raw: string): string[] {
  raw = raw.trim()
  // handle `use foo::{A, B, C}` braces
  const braceMatch = raw.match(/^(.*)::\{([^}]+)\}$/)
  if (braceMatch) {
    const prefix = braceMatch[1].trim()
    return braceMatch[2].split(',').map(s => `${prefix}::${s.trim()}`)
  }
  // handle `use foo::*`
  return [raw]
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildRustAST(content: string): RustAST {
  const rawLines   = content.split('\n')
  const lines      = stripRustComments(rawLines)
  const definitions: RustDef[]       = []
  const imports:     RustRawImport[] = []

  // Stack of active impl receiver types
  const implStack: Array<{ name: string; endLine: number }> = []

  let i = 0
  while (i < lines.length) {
    // Pop exhausted impl blocks
    while (implStack.length > 0 && i >= implStack[implStack.length - 1].endLine) {
      implStack.pop()
    }

    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── use statement ─────────────────────────────────────────────────────────
    const um = USE_RE.exec(trimmed)
    if (um) {
      for (const spec of expandUse(um[1])) {
        imports.push({ specifier: spec, isStdlib: isRustStdlib(spec) })
      }
      i++
      continue
    }

    // ── impl block ────────────────────────────────────────────────────────────
    const ib = IMPL_RE.exec(trimmed)
    if (ib && (trimmed.endsWith('{') || lines.slice(i, i + 3).join('').includes('{'))) {
      const typeName = ib[1]
      const lineEnd  = findRustBlockEnd(lines, i)
      implStack.push({ name: typeName, endLine: lineEnd })
      i++
      continue
    }

    // ── fn ────────────────────────────────────────────────────────────────────
    const fm = FN_RE.exec(trimmed)
    if (fm) {
      const pub         = fm[1]
      const name        = fm[2]
      const implType    = implStack.length > 0 ? implStack[implStack.length - 1].name : undefined
      const displayName = implType ? `${implType}.${name}` : name
      const lineEnd     = findRustBlockEnd(lines, i)
      definitions.push({
        kind: 'function', name, displayName,
        lineStart:  i + 1, lineEnd,
        signature:  collectRustSignature(lines, i),
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
        implType,
      })
      i = lineEnd
      continue
    }

    // ── struct ────────────────────────────────────────────────────────────────
    const sm = STRUCT_RE.exec(trimmed)
    if (sm) {
      const pub  = sm[1]
      const name = sm[2]
      const lineEnd = findRustBlockEnd(lines, i)
      definitions.push({
        kind: 'class', name, displayName: name,
        lineStart:  i + 1, lineEnd,
        signature:  `struct ${name}`,
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
      })
      i = lineEnd
      continue
    }

    // ── enum ──────────────────────────────────────────────────────────────────
    const em = ENUM_RE.exec(trimmed)
    if (em) {
      const pub  = em[1]
      const name = em[2]
      const lineEnd = findRustBlockEnd(lines, i)
      definitions.push({
        kind: 'type', name, displayName: name,
        lineStart:  i + 1, lineEnd,
        signature:  `enum ${name}`,
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
      })
      i = lineEnd
      continue
    }

    // ── trait ─────────────────────────────────────────────────────────────────
    const tr = TRAIT_RE.exec(trimmed)
    if (tr) {
      const pub  = tr[1]
      const name = tr[2]
      const lineEnd = findRustBlockEnd(lines, i)
      definitions.push({
        kind: 'interface', name, displayName: name,
        lineStart:  i + 1, lineEnd,
        signature:  `trait ${name}`,
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
      })
      i = lineEnd
      continue
    }

    // ── type alias ────────────────────────────────────────────────────────────
    const ta = TYPE_RE.exec(trimmed)
    if (ta) {
      const pub  = ta[1]
      const name = ta[2]
      definitions.push({
        kind: 'type', name, displayName: name,
        lineStart:  i + 1, lineEnd: i + 1,
        signature:  trimmed.replace(/;$/, '').trim(),
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
      })
      i++
      continue
    }

    // ── const / static ───────────────────────────────────────────────────────
    const cs = CONST_RE.exec(trimmed)
    if (cs) {
      const pub  = cs[1]
      const name = cs[2]
      definitions.push({
        kind: 'variable', name, displayName: name,
        lineStart:  i + 1, lineEnd: i + 1,
        signature:  trimmed.replace(/\s*=.*$/, '').trim(),
        docstring:  extractRustDocstring(rawLines, i),
        isExported: isRustExported(pub),
      })
      i++
      continue
    }

    i++
  }

  return { lines: rawLines, definitions, imports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor + prototype methods
// ──────────────────────────────────────────────────────────────────────────────

export const RustParser = function(this: RustParserInstance) {} as unknown as new () => RustParserInstance

RustParser.prototype.parse = async function(
  this: RustParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<RustAST> {
  return buildRustAST(content)
}

RustParser.prototype.extractSymbols = async function(
  this: RustParserInstance,
  ast: RustAST
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

RustParser.prototype.extractImports = async function(
  this: RustParserInstance,
  ast: RustAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      (imp.isStdlib ? 'builtin' : 'npm') as Import['type'],
    names:     [],
  }))
}

RustParser.prototype.extractExports = async function(
  this: RustParserInstance,
  ast: RustAST
): Promise<Export[]> {
  return ast.definitions
    .filter(d => d.isExported)
    .map(d => ({
      name: d.displayName,
      kind: d.kind,
    }))
}
