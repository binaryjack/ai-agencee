/**
 * Python Parser – line-based AST scanner
 *
 * Extracts: classes, functions (sync/async), methods (inside classes),
 * module-level imports, from-imports, and `__all__` for export resolution.
 *
 * Design: zero native dependencies; handles nested classes, multi-line
 * signatures, triple-quoted docstrings, and decorator annotations.
 */

import type { Export, Import, Symbol } from '../indexer/codebase-indexer.types'
import type { ParserOptions } from './parser-protocol.types'
import type { PythonAST, PythonDef, PythonParserInstance, PythonRawImport } from './python-parser.types'

// ──────────────────────────────────────────────────────────────────────────────
// Public constructor
// ──────────────────────────────────────────────────────────────────────────────

export const PythonParser = function(this: PythonParserInstance) {} as unknown as new () => PythonParserInstance

PythonParser.prototype.parse = async function(
  content: string,
  _context: ParserOptions = {}
): Promise<PythonAST> {
  return buildPythonAST(content)
}

PythonParser.prototype.extractSymbols = async function(ast: PythonAST): Promise<Symbol[]> {
  const { definitions, allExports } = ast
  const hasAll = allExports.length > 0

  return definitions.map(def => {
    const baseName = def.name.includes('.') ? def.name.split('.').pop()! : def.name
    const isExported = hasAll
      ? allExports.includes(baseName)
      : !baseName.startsWith('_')

    return {
      name:       def.displayName,
      kind:       def.kind as Symbol['kind'],
      lineStart:  def.lineStart,
      lineEnd:    def.lineEnd,
      signature:  def.signature,
      docstring:  def.docstring,
      isExported,
    }
  })
}

PythonParser.prototype.extractImports = async function(ast: PythonAST): Promise<Import[]> {
  return ast.imports.map(raw => ({
    specifier: raw.from ?? raw.names[0] ?? '',
    type:      raw.isLocal ? 'local' : classifyPythonModule(raw.from ?? raw.names[0] ?? ''),
    names:     raw.from ? raw.names : [],
  }))
}

PythonParser.prototype.extractExports = async function(ast: PythonAST): Promise<Export[]> {
  const { definitions, allExports } = ast
  const hasAll = allExports.length > 0

  return definitions
    .filter(def => {
      const baseName = def.name.includes('.') ? def.name.split('.').pop()! : def.name
      return hasAll ? allExports.includes(baseName) : !baseName.startsWith('_')
    })
    .map(def => ({
      name: def.displayName,
      kind: def.kind === 'method' ? 'function' : (def.kind as Export['kind']),
    }))
}

// ──────────────────────────────────────────────────────────────────────────────
// Core parser
// ──────────────────────────────────────────────────────────────────────────────

const DEF_RE   = /^(?:(async)\s+)?def\s+(\w+)\s*(\(.*)?/
const CLASS_RE = /^class\s+(\w+)/
const IMP_RE   = /^import\s+(.+)/
const FROM_RE  = /^from\s+(\S+)\s+import\s+(.+)/
const ALL_RE   = /^__all__\s*=\s*\[([^\]]*)\]/

function buildPythonAST(content: string): PythonAST {
  const lines       = content.split('\n')
  const definitions: PythonDef[]       = []
  const imports:     PythonRawImport[] = []
  const allExports:  string[]          = []

  // Class nesting stack – each entry: { name, indent }
  const classStack: { name: string; indent: number }[] = []
  let pendingDecorators: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trimStart()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const rawIndent = line.length - trimmed.length

    // Pop class stack entries that the current line has de-dented past
    while (classStack.length > 0 && rawIndent <= classStack[classStack.length - 1].indent) {
      classStack.pop()
    }

    // ── Decorator ────────────────────────────────────────────────────────────
    if (trimmed.startsWith('@')) {
      pendingDecorators.push(trimmed.slice(1).split('(')[0].trim())
      continue
    }

    // ── class ─────────────────────────────────────────────────────────────────
    const cm = CLASS_RE.exec(trimmed)
    if (cm) {
      const name      = cm[1]
      const docstring = extractFollowingDocstring(lines, i)

      definitions.push({
        kind:        'class',
        name,
        displayName: name,
        lineStart:   i + 1,
        lineEnd:     findBlockEnd(lines, i, rawIndent),
        indent:      rawIndent,
        isAsync:     false,
        decorators:  [...pendingDecorators],
        signature:   `class ${trimmed.replace(/^class\s+/, '').replace(/:.*$/, '').trim()}`,
        docstring,
      })

      classStack.push({ name, indent: rawIndent })
      pendingDecorators = []
      continue
    }

    // ── def / async def ───────────────────────────────────────────────────────
    const dm = DEF_RE.exec(trimmed)
    if (dm) {
      const isAsync    = !!dm[1]
      const name       = dm[2]
      const parentClass = classStack.length > 0 ? classStack[classStack.length - 1].name : undefined

      // Collect full signature lines until we see a closing ')' + ':'
      const { sigLine, nextIdx } = collectSignature(lines, i, trimmed)
      const docstring = extractFollowingDocstring(lines, nextIdx)

      const displayName = parentClass ? `${parentClass}.${name}` : name
      const kind        = parentClass ? 'method' as const : 'function' as const

      definitions.push({
        kind,
        name,
        displayName,
        lineStart:  i + 1,
        lineEnd:    findBlockEnd(lines, nextIdx, rawIndent),
        indent:     rawIndent,
        isAsync,
        decorators: [...pendingDecorators],
        signature:  sigLine,
        docstring,
        parentClass,
      })

      pendingDecorators = []
      i = nextIdx  // skip lines consumed by multi-line signature
      continue
    }

    // ── import ────────────────────────────────────────────────────────────────
    if (rawIndent === 0) {
      const im = IMP_RE.exec(trimmed)
      if (im) {
        const parts = im[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim())
        for (const specifier of parts) {
          imports.push({ from: null, names: [specifier], isLocal: false })
        }
        continue
      }

      const fm = FROM_RE.exec(trimmed)
      if (fm) {
        const from  = fm[1]
        const names = fm[2] === '*'
          ? ['*']
          : fm[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim())
        imports.push({ from, names, isLocal: from.startsWith('.') })
        continue
      }

      const am = ALL_RE.exec(trimmed)
      if (am) {
        const found = am[1].match(/['"](\w+)['"]/g)?.map(s => s.slice(1, -1)) ?? []
        allExports.push(...found)
      }
    }
  }

  return { lines, definitions, imports, allExports }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Collects lines of a `def` signature until the parameter list closes.
 * Returns the normalised signature string and the (0-indexed) last consumed line.
 */
function collectSignature(lines: string[], startIdx: number, firstTrimmed: string): {
  sigLine:  string
  nextIdx:  number
} {
  let acc     = firstTrimmed
  let j       = startIdx
  let depth   = (acc.match(/\(/g) ?? []).length - (acc.match(/\)/g) ?? []).length

  while (depth > 0 && j + 1 < lines.length) {
    j++
    const t   = lines[j].trim()
    acc      += ' ' + t
    depth    += (t.match(/\(/g) ?? []).length - (t.match(/\)/g) ?? []).length
  }

  // Strip trailing body separator
  const sigLine = acc.replace(/\s*:\s*$/, '').trim()
  return { sigLine, nextIdx: j }
}

/**
 * Reads triple-quoted docstring immediately following a `def`/`class` header.
 * The header ends at `afterLine` (0-indexed); looks at lines[afterLine + 1].
 */
function extractFollowingDocstring(lines: string[], afterLine: number): string | undefined {
  const firstBody = lines[afterLine + 1]?.trim() ?? ''
  const delim     = firstBody.startsWith('"""') ? '"""'
                  : firstBody.startsWith("'''") ? "'''"
                  : null
  if (!delim) return undefined

  const content = firstBody.slice(3)  // strip opening triple-quote

  // Single-line docstring: `"""text"""`
  if (content.endsWith(delim)) return content.slice(0, -3).trim()

  const parts: string[] = [content]
  for (let i = afterLine + 2; i < lines.length; i++) {
    const l = lines[i].trim()
    if (l.endsWith(delim)) {
      const last = l.endsWith(delim) ? l.slice(0, -3).trim() : l
      if (last) parts.push(last)
      break
    }
    parts.push(l)
  }
  return parts.join('\n').trim() || undefined
}

/**
 * Estimates the last line of a block by finding the next de-dented (non-empty) line.
 */
function findBlockEnd(lines: string[], startIdx: number, blockIndent: number): number {
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l       = lines[i]
    const trimmed = l.trimStart()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const indent  = l.length - trimmed.length
    if (indent <= blockIndent) return i  // 1-indexed = i (points to line after block)
  }
  return lines.length
}

/** Detect whether a Python module specifier is a stdlib built-in. */
function classifyPythonModule(name: string): 'local' | 'npm' | 'builtin' {
  if (name.startsWith('.')) return 'local'
  return PYTHON_BUILTINS.has(name.split('.')[0]) ? 'builtin' : 'npm'
}

const PYTHON_BUILTINS = new Set([
  'abc', 'ast', 'asyncio', 'builtins', 'collections', 'contextlib', 'copy',
  'dataclasses', 'datetime', 'enum', 'functools', 'glob', 'hashlib', 'http',
  'importlib', 'inspect', 'io', 'itertools', 'json', 'logging', 'math', 'os',
  'pathlib', 'pickle', 'platform', 'pprint', 're', 'shutil', 'socket',
  'sqlite3', 'ssl', 'stat', 'string', 'struct', 'subprocess', 'sys',
  'tempfile', 'threading', 'time', 'traceback', 'types', 'typing', 'unittest',
  'urllib', 'uuid', 'warnings', 'weakref', 'xml', 'zipfile',
])
