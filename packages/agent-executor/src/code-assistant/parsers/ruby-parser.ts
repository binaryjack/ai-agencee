/**
 * Ruby Parser – line-based scanner
 *
 * Extracts: classes, modules, instance methods (def), class methods (def self.),
 * constants (ALL_CAPS or CamelCase at top level).
 *
 * Export rule: method is private if a bare `private` or `protected` keyword
 * appeared after the class opening at the same nesting depth.
 * Docstrings: # comment lines immediately above the def/class/module keyword.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'
import type { RubyAST, RubyDef, RubyParserInstance, RubyRawImport } from './ruby-parser.types'

// ──────────────────────────────────────────────────────────────────────────────
// Regexes
// ──────────────────────────────────────────────────────────────────────────────

const CLASS_RE    = /^(?:class|module)\s+((?:\w+::)*\w+)/
const DEF_RE      = /^def\s+(self\.)?(\w+[?!]?)/
const REQUIRE_RE  = /^require(?:_relative)?\s+['"]([^'"]+)['"]/
const CONST_RE    = /^([A-Z]\w*)\s*=/
// Keywords that increase depth
const OPEN_RE     = /^(?:def|class|module|do|begin|if|unless|case|while|until|for)\b/
const END_RE      = /^end\b/
const ACCESS_RE   = /^(?:private|protected|public)\b/

// Well-known Ruby stdlib gems (no '/' and short names)
const STDLIB_SET = new Set([
  'json', 'yaml', 'csv', 'net/http', 'net/https', 'uri', 'cgi', 'time', 'date',
  'set', 'tempfile', 'pathname', 'fileutils', 'forwardable', 'singleton',
  'ostruct', 'struct', 'comparable', 'enumerable', 'logger', 'monitor',
  'digest', 'base64', 'zlib', 'open-uri', 'socket', 'resolv', 'io/console',
  'pp', 'benchmark', 'optparse', 'shellwords', 'erb', 'thread', 'mutex_m',
])

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Strip # comments from a line (but keep the structure for depth counting). */
function stripRubyComment(line: string): string {
  // Ruby strings can contain # — simple heuristic: strip from first # not inside quote
  let inSingle = false
  let inDouble = false
  let result = ''
  for (let j = 0; j < line.length; j++) {
    const ch = line[j]
    if (ch === "'" && !inDouble) { inSingle = !inSingle; result += ch; continue }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue }
    if (ch === '#' && !inSingle && !inDouble) break
    result += ch
  }
  return result
}

function extractRubyDocstring(rawLines: string[], declIdx: number): string | undefined {
  const parts: string[] = []
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = rawLines[i].trim()
    if (t.startsWith('#')) { parts.unshift(t.slice(1).trim()) }
    else if (t === '') { continue }
    else { break }
  }
  return parts.length > 0 ? parts.join('\n') : undefined
}

function isRubyStdlib(specifier: string): boolean {
  // No '/' at all → likely stdlib (e.g. 'json', 'set')
  // Or in the known set
  return STDLIB_SET.has(specifier) || (!specifier.includes('/') && !specifier.includes('-'))
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

function buildRubyAST(content: string): RubyAST {
  const rawLines   = content.split('\n')
  const definitions: RubyDef[]       = []
  const imports:     RubyRawImport[] = []

  // Stack: each entry = { name, depth, privateDepth }
  // privateDepth: depth at which `private` was declared (methods deeper than this are private)
  type ClassFrame = { name: string; depth: number; isPrivate: boolean }
  const classStack: ClassFrame[] = []
  let depth = 0

  let i = 0
  while (i < rawLines.length) {
    const raw     = rawLines[i]
    const trimmed = stripRubyComment(raw).trim()

    // ── require / require_relative ────────────────────────────────────────────
    const rm = REQUIRE_RE.exec(trimmed)
    if (rm) {
      imports.push({ specifier: rm[1], isStdlib: isRubyStdlib(rm[1]) })
      i++
      continue
    }

    // ── class / module ────────────────────────────────────────────────────────
    const cm = CLASS_RE.exec(trimmed)
    if (cm) {
      const name = cm[1]
      const owner = classStack.length > 0 ? classStack[classStack.length - 1].name : undefined
      const displayName = owner ? `${owner}::${name}` : name
      definitions.push({
        kind:          'class',
        name,
        displayName,
        lineStart:     i + 1,
        lineEnd:       i + 1,  // will not track end lines for classes (complex)
        signature:     trimmed,
        docstring:     extractRubyDocstring(rawLines, i),
        isExported:    true,
        ownerClass:    owner,
        isClassMethod: false,
      })
      depth++
      classStack.push({ name: displayName, depth, isPrivate: false })
      i++
      continue
    }

    // ── def ───────────────────────────────────────────────────────────────────
    const dm = DEF_RE.exec(trimmed)
    if (dm) {
      const isClassMethod = Boolean(dm[1])
      const name          = dm[2]
      const owner         = classStack.length > 0 ? classStack[classStack.length - 1].name : undefined
      const displayName   = owner
        ? (isClassMethod ? `${owner}.${name}` : `${owner}#${name}`)
        : name
      const frame         = classStack[classStack.length - 1]
      const isPrivate     = frame?.isPrivate ?? false
      definitions.push({
        kind:          'function',
        name,
        displayName,
        lineStart:     i + 1,
        lineEnd:       i + 1,
        signature:     trimmed,
        docstring:     extractRubyDocstring(rawLines, i),
        isExported:    !isPrivate,
        ownerClass:    owner,
        isClassMethod,
      })
      depth++  // def opens a new block
      i++
      continue
    }

    // ── end keyword ───────────────────────────────────────────────────────────
    if (END_RE.test(trimmed)) {
      const frame = classStack[classStack.length - 1]
      if (frame && depth === frame.depth) {
        classStack.pop()
      }
      depth = Math.max(0, depth - 1)
      i++
      continue
    }

    // ── access modifiers ─────────────────────────────────────────────────────
    const ac = ACCESS_RE.exec(trimmed)
    if (ac && classStack.length > 0) {
      const frame = classStack[classStack.length - 1]
      frame.isPrivate = ac[0] === 'private' || ac[0] === 'protected'
      i++
      continue
    }

    // ── depth tracking (do/begin/if/unless/case/while/until/for) ─────────────
    if (OPEN_RE.test(trimmed) && !DEF_RE.test(trimmed) && !CLASS_RE.test(trimmed)) {
      // Only increment for block-opening keywords not already handled
      if (/^(?:do|begin|if|unless|case|while|until|for)\b/.test(trimmed)) {
        depth++
      }
    }

    i++
  }

  return { lines: rawLines, definitions, imports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor + prototype methods
// ──────────────────────────────────────────────────────────────────────────────

export const RubyParser = function(this: RubyParserInstance) {} as unknown as new () => RubyParserInstance

RubyParser.prototype.parse = async function(
  this: RubyParserInstance,
  content: string,
  _context?: ParserOptions
): Promise<RubyAST> {
  return buildRubyAST(content)
}

RubyParser.prototype.extractSymbols = async function(
  this: RubyParserInstance,
  ast: RubyAST
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

RubyParser.prototype.extractImports = async function(
  this: RubyParserInstance,
  ast: RubyAST
): Promise<Import[]> {
  return ast.imports.map(imp => ({
    specifier: imp.specifier,
    type:      (imp.isStdlib ? 'builtin' : 'npm') as Import['type'],
    names:     [],
  }))
}

RubyParser.prototype.extractExports = async function(
  this: RubyParserInstance,
  ast: RubyAST
): Promise<Export[]> {
  return ast.definitions
    .filter(d => d.isExported)
    .map(d => ({
      name: d.displayName,
      kind: d.kind,
    }))
}
