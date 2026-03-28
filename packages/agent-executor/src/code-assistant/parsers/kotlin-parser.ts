/**
 * Kotlin Parser – line-based scanner
 *
 * Extracts: classes (data, sealed, abstract, open), interfaces, objects,
 * companion objects, enums, functions (top-level + member), type aliases,
 * properties (val/var).
 *
 * Export rule: NOT explicitly `private` or `internal` (Kotlin default = public).
 * Docstrings: KDoc /** ... *\/ block directly above the declaration.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { KotlinAST, KotlinDef, KotlinParserInstance, KotlinRawImport } from './kotlin-parser.types'
import type { ParserOptions } from './parser-protocol.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

const CLASS_RE    = /^(?:(?:public|private|protected|internal|abstract|open|sealed|data|inner|value|annotation|external)\s+)*(?:(class|interface|object|enum\s+class))\s+(\w+)/
const COMPANION_RE = /^companion\s+object(?:\s+(\w+))?/
const FUN_RE      = /^(?:(?:public|private|protected|internal|override|open|abstract|final|suspend|inline|infix|operator|tailrec|external|expect|actual)\s+)*fun\s+(?:<[^>]*>\s+)?(?:[\w.]+\.)?(\w+)\s*[(<]/
const TYPEALIAS_RE = /^(?:(?:public|private|protected|internal)\s+)?typealias\s+(\w+)/
const PROP_RE     = /^(?:(?:public|private|protected|internal|override|open|abstract|const|lateinit|inline)\s+)*(?:val|var)\s+(\w+)/
const IMPORT_RE   = /^import\s+([\w.*]+)/
const PRIVATE_RE  = /\b(?:private|internal)\b/

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function stripKotlinComments(lines: string[]): string[] {
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

function collectKotlinSignature(lines: string[], startIdx: number): string {
  const parts: string[] = []
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const t = lines[i].trim()
    parts.push(t)
    if (t.endsWith('{') || t.endsWith('=') || t.endsWith(')')) break
  }
  return parts.join(' ').replace(/\s*\{$/, '').trim()
}

/**
 * Extract KDoc /** ... *\/ block above declaration.
 * Strips * prefix from each line.
 */
function extractKotlinDocstring(rawLines: string[], declIdx: number): string | undefined {
  let i = declIdx - 1
  while (i >= 0 && rawLines[i].trim() === '') i--
  if (i < 0 || !rawLines[i].trim().endsWith('*/')) return undefined

  const endIdx = i
  while (i >= 0 && !rawLines[i].trim().startsWith('/**')) i--
  if (i < 0) return undefined

  const docLines: string[] = []
  for (let j = i; j <= endIdx; j++) {
    docLines.push(rawLines[j].trim().replace(/^\/\*\*|\*\/$|^\*\s?/, '').trim())
  }
  return docLines.filter(Boolean).join('\n')
}

function findKotlinBlockEnd(lines: string[], startIdx: number): number {
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

function isKotlinExported(line: string): boolean {
  return !PRIVATE_RE.test(line)
}

function isKotlinStdlib(specifier: string): boolean {
  const root = specifier.split('.')[0]
  return root === 'kotlin' || root === 'kotlinx' || root === 'java' || root === 'javax'
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildKotlinAST(content: string): KotlinAST {
  const rawLines   = content.split('\n')
  const lines      = stripKotlinComments(rawLines)
  const definitions: KotlinDef[]       = []
  const imports:     KotlinRawImport[] = []

  // Stack of enclosing class/object names for member display names
  const typeStack: Array<{ name: string; endLine: number }> = []

  let i = 0
  while (i < lines.length) {
    // Pop exhausted type blocks
    while (typeStack.length > 0 && i >= typeStack[typeStack.length - 1].endLine) {
      typeStack.pop()
    }

    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── import ────────────────────────────────────────────────────────────────
    const im = IMPORT_RE.exec(trimmed)
    if (im) {
      const specifier = im[1]
      imports.push({ specifier, isStdlib: isKotlinStdlib(specifier) })
      i++
      continue
    }

    // ── companion object ──────────────────────────────────────────────────────
    const co = COMPANION_RE.exec(trimmed)
    if (co) {
      const owner = typeStack.length > 0 ? typeStack[typeStack.length - 1].name : undefined
      const name  = co[1] ?? 'Companion'
      const displayName = owner ? `${owner}.${name}` : name
      const lineEnd = findKotlinBlockEnd(lines, i)
      typeStack.push({ name: displayName, endLine: lineEnd })
      i++
      continue
    }

    // ── class / interface / object / enum class ───────────────────────────────
    const cm = CLASS_RE.exec(trimmed)
    if (cm) {
      const keyword = cm[1].trim()
      const name    = cm[2]
      const owner   = typeStack.length > 0 ? typeStack[typeStack.length - 1].name : undefined
      const displayName = owner ? `${owner}.${name}` : name
      const lineEnd = findKotlinBlockEnd(lines, i)
      definitions.push({
        kind:        keyword.includes('interface') ? 'interface'
                   : keyword.includes('enum')     ? 'type'
                   : 'class',
        name,
        displayName,
        lineStart:  i + 1,
        lineEnd,
        signature:  collectKotlinSignature(lines, i),
        docstring:  extractKotlinDocstring(rawLines, i),
        isExported: isKotlinExported(trimmed),
        ownerClass: owner,
      })
      typeStack.push({ name: displayName, endLine: lineEnd })
      i++
      continue
    }

    // ── fun ───────────────────────────────────────────────────────────────────
    const fm = FUN_RE.exec(trimmed)
    if (fm) {
      const name       = fm[1]
      const owner      = typeStack.length > 0 ? typeStack[typeStack.length - 1].name : undefined
      const displayName = owner ? `${owner}.${name}` : name
      // Single-expression fun ends with = ...; block fun ends at matching }
      const isExprBody = trimmed.endsWith('=') || /=\s*\S/.test(trimmed)
      const lineEnd    = isExprBody ? i + 1 : findKotlinBlockEnd(lines, i)
      definitions.push({
        kind:       'function',
        name,
        displayName,
        lineStart:  i + 1,
        lineEnd,
        signature:  collectKotlinSignature(lines, i),
        docstring:  extractKotlinDocstring(rawLines, i),
        isExported: isKotlinExported(trimmed),
        ownerClass: owner,
      })
      i = isExprBody ? i + 1 : lineEnd
      continue
    }

    // ── typealias ─────────────────────────────────────────────────────────────
    const ta = TYPEALIAS_RE.exec(trimmed)
    if (ta) {
      const name = ta[1]
      definitions.push({
        kind:       'type',
        name,
        displayName: name,
        lineStart:  i + 1,
        lineEnd:    i + 1,
        signature:  trimmed,
        docstring:  extractKotlinDocstring(rawLines, i),
        isExported: isKotlinExported(trimmed),
      })
      i++
      continue
    }

    // ── val / var property ────────────────────────────────────────────────────
    const pp = PROP_RE.exec(trimmed)
    if (pp && typeStack.length > 0) {
      const name  = pp[1]
      const owner = typeStack[typeStack.length - 1].name
      const lineEnd = trimmed.includes('{') ? findKotlinBlockEnd(lines, i) : i + 1
      definitions.push({
        kind:       'variable',
        name,
        displayName: `${owner}.${name}`,
        lineStart:  i + 1,
        lineEnd,
        signature:  collectKotlinSignature(lines, i),
        docstring:  extractKotlinDocstring(rawLines, i),
        isExported: isKotlinExported(trimmed),
        ownerClass: owner,
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

export const KotlinParser = function(this: KotlinParserInstance) {} as unknown as new () => KotlinParserInstance

KotlinParser.prototype.parse = async function(
  this: KotlinParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<KotlinAST> {
  return buildKotlinAST(content)
}

KotlinParser.prototype.extractSymbols = async function(
  this: KotlinParserInstance,
  ast: KotlinAST
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

KotlinParser.prototype.extractImports = async function(
  this: KotlinParserInstance,
  ast: KotlinAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      (imp.isStdlib ? 'builtin' : 'npm') as Import['type'],
    names:     [],
  }))
}

KotlinParser.prototype.extractExports = async function(
  this: KotlinParserInstance,
  ast: KotlinAST
): Promise<Export[]> {
  return ast.definitions
    .filter(d => d.isExported)
    .map(d => ({
      name: d.displayName,
      kind: d.kind,
    }))
}
