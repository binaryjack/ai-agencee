/**
 * C# Parser – line-based scanner
 *
 * Extracts: classes, interfaces, structs, enums, records, methods, properties, fields.
 *
 * Export rule: public or protected access modifier present.
 * Docstrings: /// <summary> XML doc lines directly above the declaration.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { CSharpAST, CSharpDef, CSharpParserInstance, CSharpRawImport } from './csharp-parser.types'
import type { ParserOptions } from './parser-protocol.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

const TYPE_DECL_RE  = /^(?:(?:public|protected|private|internal|abstract|sealed|static|partial|readonly)\s+)*(?:(class|interface|struct|enum|record))\s+(\w+)/
const METHOD_RE     = /^(?:(?:public|protected|private|internal|static|virtual|override|abstract|sealed|async|new|extern)\s+)*(?:[\w<>\[\],?\s.]+\s+)?(\w+)\s*\(/
const PROP_RE       = /^(?:(?:public|protected|private|internal|static|virtual|override|abstract)\s+)+[\w<>\[\],?\s.]+\s+(\w+)\s*\{/
const FIELD_RE      = /^(?:(?:public|protected|private|internal|static|readonly|const|volatile)\s+)+[\w<>\[\],?.]+\s+(\w+)\s*(?:=|;)/
const USING_RE      = /^using\s+(?:(static)\s+)?([^;=\n]+?)\s*;/
const ACCESS_RE     = /\b(public|protected)\b/
const XML_TAG_RE    = /<[^>]+>/g

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function stripCSharpComments(lines: string[]): string[] {
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

function collectCSharpSignature(lines: string[], startIdx: number): string {
  const parts: string[] = []
  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const t = lines[i].trim()
    parts.push(t)
    if (t.endsWith('{') || t.endsWith(';')) break
  }
  return parts.join(' ').replace(/\s*\{$/, '').trim()
}

/**
 * Extract /// XML doc comment lines above the declaration.
 * Strips XML tags to get plain text.
 */
function extractCSharpDocstring(rawLines: string[], declIdx: number): string | undefined {
  const parts: string[] = []
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = rawLines[i].trim()
    if (t.startsWith('///')) {
      const text = t.slice(3).trim().replace(XML_TAG_RE, '').trim()
      if (text) parts.unshift(text)
    } else if (t.startsWith('[')) {
      continue  // skip attributes like [HttpGet], [Obsolete]
    } else {
      break
    }
  }
  return parts.length > 0 ? parts.join('\n') : undefined
}

function findCSharpBlockEnd(lines: string[], startIdx: number): number {
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

function isCSharpExported(line: string): boolean {
  return ACCESS_RE.test(line)
}

function isCSharpStdlib(specifier: string): boolean {
  return specifier.startsWith('System.') || specifier.startsWith('Microsoft.') ||
         specifier === 'System' || specifier === 'Microsoft'
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildCSharpAST(content: string): CSharpAST {
  const rawLines   = content.split('\n')
  const lines      = stripCSharpComments(rawLines)
  const definitions: CSharpDef[]       = []
  const imports:     CSharpRawImport[] = []

  // Stack of enclosing type names for member display names
  const typeStack: Array<{ name: string; endLine: number }> = []

  let i = 0
  while (i < lines.length) {
    // Pop finished types off the stack
    while (typeStack.length > 0 && i >= typeStack[typeStack.length - 1].endLine) {
      typeStack.pop()
    }

    const trimmed = lines[i].trim()
    if (trimmed === '') { i++; continue }

    // ── using directive ───────────────────────────────────────────────────────
    const um = USING_RE.exec(trimmed)
    if (um) {
      const isStatic  = um[1] === 'static'
      const specifier = um[2].trim()
      // skip `using var =` alias assignments
      if (!specifier.includes('=')) {
        imports.push({ specifier, isStatic, isStdlib: isCSharpStdlib(specifier) })
      }
      i++
      continue
    }

    // ── Type declaration (class / interface / struct / enum / record) ─────────
    const tm = TYPE_DECL_RE.exec(trimmed)
    if (tm) {
      const keyword  = tm[1]
      const name     = tm[2]
      const lineEnd  = findCSharpBlockEnd(lines, i)
      const owner    = typeStack.length > 0 ? typeStack[typeStack.length - 1].name : undefined
      const displayName = owner ? `${owner}.${name}` : name
      definitions.push({
        kind:       keyword === 'interface' ? 'interface' : keyword === 'enum' ? 'type' : 'class',
        name,
        displayName,
        lineStart:  i + 1,
        lineEnd,
        signature:  collectCSharpSignature(lines, i),
        docstring:  extractCSharpDocstring(rawLines, i),
        isExported: isCSharpExported(trimmed),
        ownerType:  owner,
      })
      typeStack.push({ name, endLine: lineEnd })
      i++
      continue
    }

    if (typeStack.length > 0) {
      const owner = typeStack[typeStack.length - 1].name

      // ── Property (before method — has { get; set; } body on same level) ─────
      const pp = PROP_RE.exec(trimmed)
      if (pp && !TYPE_DECL_RE.test(trimmed)) {
        const name    = pp[1]
        const lineEnd = findCSharpBlockEnd(lines, i)
        definitions.push({
          kind:       'variable',
          name,
          displayName: `${owner}.${name}`,
          lineStart:  i + 1,
          lineEnd,
          signature:  collectCSharpSignature(lines, i),
          docstring:  extractCSharpDocstring(rawLines, i),
          isExported: isCSharpExported(trimmed),
          ownerType:  owner,
        })
        i = lineEnd
        continue
      }

      // ── Method ───────────────────────────────────────────────────────────────
      const CONTROL_FLOW = /^(?:if|else|for|foreach|while|switch|catch|finally|using|lock|do)\b/
      const mm = METHOD_RE.exec(trimmed)
      if (mm && !CONTROL_FLOW.test(trimmed) && !TYPE_DECL_RE.test(trimmed)) {
        const name    = mm[1]
        const lineEnd = trimmed.endsWith(';') ? i + 1 : findCSharpBlockEnd(lines, i)
        definitions.push({
          kind:       'function',
          name,
          displayName: `${owner}.${name}`,
          lineStart:  i + 1,
          lineEnd,
          signature:  collectCSharpSignature(lines, i),
          docstring:  extractCSharpDocstring(rawLines, i),
          isExported: isCSharpExported(trimmed),
          ownerType:  owner,
        })
        i = trimmed.endsWith(';') ? i + 1 : lineEnd
        continue
      }

      // ── Field ────────────────────────────────────────────────────────────────
      const fm = FIELD_RE.exec(trimmed)
      if (fm && !TYPE_DECL_RE.test(trimmed)) {
        const name = fm[1]
        definitions.push({
          kind:       'variable',
          name,
          displayName: `${owner}.${name}`,
          lineStart:  i + 1,
          lineEnd:    i + 1,
          signature:  trimmed.replace(/\s*=.*$/, '').replace(/;$/, '').trim(),
          docstring:  extractCSharpDocstring(rawLines, i),
          isExported: isCSharpExported(trimmed),
          ownerType:  owner,
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

export const CSharpParser = function(this: CSharpParserInstance) {} as unknown as new () => CSharpParserInstance

CSharpParser.prototype.parse = async function(
  this: CSharpParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<CSharpAST> {
  return buildCSharpAST(content)
}

CSharpParser.prototype.extractSymbols = async function(
  this: CSharpParserInstance,
  ast: CSharpAST
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

CSharpParser.prototype.extractImports = async function(
  this: CSharpParserInstance,
  ast: CSharpAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      (imp.isStdlib ? 'builtin' : 'npm') as Import['type'],
    names:     [],
  }))
}

CSharpParser.prototype.extractExports = async function(
  this: CSharpParserInstance,
  ast: CSharpAST
): Promise<Export[]> {
  return ast.definitions
    .filter(d => d.isExported)
    .map(d => ({
      name: d.displayName,
      kind: d.kind,
    }))
}
