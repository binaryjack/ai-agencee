/**
 * Unit tests for PythonParser
 */

import { createPythonParser } from './create-python-parser'
import type { PythonParserInstance } from './python-parser.types'

describe('PythonParser', () => {
  let parser: PythonParserInstance

  beforeEach(() => {
    parser = createPythonParser()
  })

  // ── extractSymbols ──────────────────────────────────────────────────────────

  describe('extractSymbols', () => {
    it('extracts a module-level function', async () => {
      const src = `
def greet(name: str) -> str:
    """Return a greeting."""
    return f"Hello, {name}"
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms).toHaveLength(1)
      expect(syms[0]).toMatchObject({
        name:       'greet',
        kind:       'function',
        isExported: true,
        docstring:  'Return a greeting.',
      })
    })

    it('marks private functions (underscore prefix) as not exported', async () => {
      const src = `
def _helper() -> None:
    pass
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms[0].isExported).toBe(false)
    })

    it('extracts an async function', async () => {
      const src = `
async def fetch_data(url: str) -> dict:
    """Fetch remote data."""
    pass
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms[0]).toMatchObject({ name: 'fetch_data', kind: 'function' })
    })

    it('extracts a class and its methods', async () => {
      const src = `
class Calculator:
    """A simple calculator."""

    def add(self, x: int, y: int) -> int:
        """Add two numbers."""
        return x + y

    def _reset(self) -> None:
        pass
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const classSymbol  = syms.find(s => s.kind === 'class')
      const addMethod    = syms.find(s => s.name === 'Calculator.add')
      const resetMethod  = syms.find(s => s.name.includes('_reset'))

      expect(classSymbol).toMatchObject({ name: 'Calculator', kind: 'class' })
      expect(addMethod).toMatchObject({ kind: 'method', isExported: true })
      expect(resetMethod?.isExported).toBe(false)
    })

    it('respects __all__ for export resolution', async () => {
      const src = `
def public_fn(): pass
def private_fn(): pass
__all__ = ['public_fn']
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const pub  = syms.find(s => s.name === 'public_fn')
      const priv = syms.find(s => s.name === 'private_fn')

      expect(pub?.isExported).toBe(true)
      expect(priv?.isExported).toBe(false)
    })

    it('extracts multi-line function signature', async () => {
      const src = `
def complex(
    arg1: int,
    arg2: str,
    arg3: bool = False,
) -> dict:
    pass
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms).toHaveLength(1)
      expect(syms[0].name).toBe('complex')
      expect(syms[0].signature).toContain('arg1')
      expect(syms[0].signature).toContain('arg3')
    })

    it('captures decorators in signature context', async () => {
      const src = `
@property
def value(self) -> int:
    return self._value
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms).toHaveLength(1)
      expect(syms[0].name).toBe('value')
    })

    it('extracts triple-quote docstring from a class', async () => {
      const src = `
class MyModel:
    """
    Data model for user accounts.
    Supports CRUD operations.
    """
    def get_id(self) -> int:
        return self._id
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const cls = syms.find(s => s.kind === 'class')
      expect(cls?.docstring).toContain('Data model for user accounts')
    })
  })

  // ── extractImports ──────────────────────────────────────────────────────────

  describe('extractImports', () => {
    it('extracts plain import statements', async () => {
      const src = `import os\nimport sys`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps.map(i => i.specifier)).toEqual(expect.arrayContaining(['os', 'sys']))
    })

    it('extracts from-import with multiple names', async () => {
      const src = `from pathlib import Path, PurePath`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps).toHaveLength(1)
      expect(imps[0].specifier).toBe('pathlib')
      expect(imps[0].names).toContain('Path')
      expect(imps[0].names).toContain('PurePath')
    })

    it('marks relative imports as local', async () => {
      const src = `from .utils import helper`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps[0].type).toBe('local')
    })

    it('marks stdlib modules as builtin', async () => {
      const src = `from os import path`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps[0].type).toBe('builtin')
    })
  })

  // ── extractExports ──────────────────────────────────────────────────────────

  describe('extractExports', () => {
    it('exports all non-private symbols when __all__ absent', async () => {
      const src = `
def public(): pass
def _private(): pass
class Public: pass
`
      const ast  = await parser.parse(src)
      const exps = await parser.extractExports(ast)

      expect(exps.map(e => e.name)).toContain('public')
      expect(exps.map(e => e.name)).toContain('Public')
      expect(exps.map(e => e.name)).not.toContain('_private')
    })

    it('uses __all__ exclusively when present', async () => {
      const src = `
def alpha(): pass
def beta(): pass
def gamma(): pass
__all__ = ['alpha', 'gamma']
`
      const ast  = await parser.parse(src)
      const exps = await parser.extractExports(ast)

      const names = exps.map(e => e.name)
      expect(names).toContain('alpha')
      expect(names).toContain('gamma')
      expect(names).not.toContain('beta')
    })
  })
})
