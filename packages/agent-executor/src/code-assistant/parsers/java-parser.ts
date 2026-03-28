/**
 * Java Parser – line-based scanner
 *
 * Extracts: classes, interfaces, enums, records, methods, fields.
 *
 * Export rule: public or protected access modifier present.
 * Docstrings: Javadoc /** ... *\/ block directly above the declaration.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { JavaAST, JavaDef, JavaParserInstance, JavaRawImport } from './java-parser.types'
import type { ParserOptions } from './parser-protocol.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

const TYPE_DECL_RE  = /^(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed)\s+)*(?:(class|interface|enum|record|@interface))\s+(\w+)/
const METHOD_RE     = /^(?:(?:public|protected|private|static|final|synchronized|abstract|native|default|override)\s+)*(?:[\w<>\[\],.?\s]+\s+)?(\w+)\s*\(/
const FIELD_RE      = /^(?:(?:public|protected|private|static|final|transient|volatile)\s+)+[\w<>\[\],?\s]+\s+(\w+)\s*(?:=|;)/
const IMPORT_RE     = /^import\s+(static\s+)?([\w.]+(?:\.\*)?)\s*;/
const ACCESS_RE     = /\b(public|protected)\b/

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function stripJavaComments(lines: string[]): string[] {
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

function collectJavaSignature(lines: string[], startIdx: number): string {
  const parts: string[] = []
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const t = lines[i].trim()
    parts.push(t)
    if (t.endsWith('{') || t.endsWith(';')) break
  }
  return parts.join(' ').replace(/\s*\{$/, '').trim()
}

function extractJavaDocstring(rawLines: string[], declIdx: number): string | undefined {
  // Walk backward to find ending */ of a Javadoc block
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

function findJavaBlockEnd(lines: string[], startIdx: number): number {
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

function isJavaExported(line: string): boolean {
  return ACCESS_RE.test(line)
}

function isJavaStdlib(specifier: string): boolean {
  return specifier.startsWith('java.') || specifier.startsWith('javax.')
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildJavaAST(content: string): JavaAST {
  const rawLines   = content.split('\n')
  const lines      = stripJavaComments(rawLines)
  const definitions: JavaDef[]       = []
  const imports:     JavaRawImport[] = []

  // Stack of enclosing class names for method display names
  const classStack: Array<{ name: string; endLine: number }> = []

  let i = 0
  while (i < lines.length) {
    // Pop finished classes off the stack
    while (classStack.length > 0 && i >= classStack[classStack.length - 1].endLine) {
      classStack.pop()
    }

    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── Import ────────────────────────────────────────────────────────────────
    const im = IMPORT_RE.exec(trimmed)
    if (im) {
      const isStatic  = Boolean(im[1])
      const specifier = im[2]
      imports.push({ specifier, isStatic, isStdlib: isJavaStdlib(specifier) })
      i++
      continue
    }

    // ── Type declaration (class / interface / enum / record) ──────────────────
    const tm = TYPE_DECL_RE.exec(trimmed)
    if (tm) {
      const keyword  = tm[1]
      const name     = tm[2]
      const lineEnd  = findJavaBlockEnd(lines, i)
      const owner    = classStack.length > 0 ? classStack[classStack.length - 1].name : undefined
      const displayName = owner ? `${owner}.${name}` : name
      definitions.push({
        kind:       keyword === 'interface' ? 'interface' : keyword === 'enum' ? 'type' : 'class',
        name,
        displayName,
        lineStart:  i + 1,
        lineEnd,
        signature:  collectJavaSignature(lines, i),
        docstring:  extractJavaDocstring(rawLines, i),
        isExported: isJavaExported(trimmed),
        ownerClass: owner,
      })
      classStack.push({ name, endLine: lineEnd })
      i++
      continue
    }

    // ── Method ─────────────────────────────────────────────────────────────────
    // Only match methods inside a class (classStack non-empty)
    if (classStack.length > 0) {
      const mm = METHOD_RE.exec(trimmed)
      // Exclude keywords that could false-match (if, for, while, switch, catch)
      const CONTROL_FLOW = /^(?:if|for|while|switch|catch|else|return|throw|new)\b/
      if (mm && !CONTROL_FLOW.test(trimmed) && !TYPE_DECL_RE.test(trimmed)) {
        const name        = mm[1]
        const owner       = classStack[classStack.length - 1].name
        const displayName = `${owner}.${name}`
        const lineEnd     = trimmed.endsWith(';') ? i + 1 : findJavaBlockEnd(lines, i)
        definitions.push({
          kind:       'function',
          name,
          displayName,
          lineStart:  i + 1,
          lineEnd,
          signature:  collectJavaSignature(lines, i),
          docstring:  extractJavaDocstring(rawLines, i),
          isExported: isJavaExported(trimmed),
          ownerClass: owner,
        })
        i = trimmed.endsWith(';') ? i + 1 : lineEnd
        continue
      }

      // ── Field ───────────────────────────────────────────────────────────────
      const fm = FIELD_RE.exec(trimmed)
      if (fm && !TYPE_DECL_RE.test(trimmed)) {
        const name  = fm[1]
        const owner = classStack[classStack.length - 1].name
        definitions.push({
          kind:       'variable',
          name,
          displayName: `${owner}.${name}`,
          lineStart:  i + 1,
          lineEnd:    i + 1,
          signature:  trimmed.replace(/\s*=.*$/, '').trim(),
          docstring:  extractJavaDocstring(rawLines, i),
          isExported: isJavaExported(trimmed),
          ownerClass: owner,
        })
        i++
        continue
      }
    }

    i++
  }

  return { lines: rawLines, definitions, imports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor + prototype methods
// ──────────────────────────────────────────────────────────────────────────────

export const JavaParser = function(this: JavaParserInstance) {} as unknown as new () => JavaParserInstance

JavaParser.prototype.parse = async function(
  this: JavaParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<JavaAST> {
  return buildJavaAST(content)
}

JavaParser.prototype.extractSymbols = async function(
  this: JavaParserInstance,
  ast: JavaAST
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

JavaParser.prototype.extractImports = async function(
  this: JavaParserInstance,
  ast: JavaAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      (imp.isStdlib ? 'builtin' : 'npm') as Import['type'],
    names:     [],
  }))
}

JavaParser.prototype.extractExports = async function(
  this: JavaParserInstance,
  ast: JavaAST
): Promise<Export[]> {
  return ast.definitions
    .filter(d => d.isExported)
    .map(d => ({
      name: d.displayName,
      kind: d.kind,
    }))
}
