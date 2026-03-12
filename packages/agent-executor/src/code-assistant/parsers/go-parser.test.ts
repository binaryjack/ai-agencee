/**
 * Unit tests for GoParser
 */

import { createGoParser } from './create-go-parser'
import type { GoParserInstance } from './go-parser.types'

describe('GoParser', () => {
  let parser: GoParserInstance

  beforeEach(() => {
    parser = createGoParser()
  })

  // ── extractSymbols ──────────────────────────────────────────────────────────

  describe('extractSymbols', () => {
    it('extracts a top-level exported function', async () => {
      const src = `
package main

// NewServer creates a server instance.
func NewServer(addr string) *Server {
  return &Server{addr: addr}
}
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const fn = syms.find(s => s.name === 'NewServer')
      expect(fn).toMatchObject({
        kind:       'function',
        isExported: true,
        docstring:  'NewServer creates a server instance.',
      })
    })

    it('marks unexported (lowercase) functions as not exported', async () => {
      const src = `
package main
func helper() {}
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms[0].isExported).toBe(false)
    })

    it('extracts a method with receiver type', async () => {
      const src = `
package main
type Server struct{}
func (s *Server) Start() error {
  return nil
}
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const method = syms.find(s => s.name === 'Server.Start')
      expect(method).toMatchObject({ kind: 'function', isExported: true })
    })

    it('extracts a struct as kind class', async () => {
      const src = `
package models
// User holds user data.
type User struct {
  ID   int
  Name string
}
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const s = syms.find(s => s.name === 'User')
      expect(s).toMatchObject({ kind: 'class', isExported: true })
      expect(s?.docstring).toContain('User holds user data')
    })

    it('extracts an interface', async () => {
      const src = `
package io
type Reader interface {
  Read(p []byte) (n int, err error)
}
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      const iface = syms.find(s => s.name === 'Reader')
      expect(iface).toMatchObject({ kind: 'interface', isExported: true })
    })

    it('extracts a type alias and named type', async () => {
      const src = `
package main
type MyError = error
type RequestID string
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms.find(s => s.name === 'MyError')?.kind).toBe('type')
      expect(syms.find(s => s.name === 'RequestID')?.kind).toBe('type')
    })

    it('extracts top-level var and const', async () => {
      const src = `
package main
var MaxRetries = 3
const Version = "1.0.0"
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms.find(s => s.name === 'MaxRetries')?.kind).toBe('variable')
      expect(syms.find(s => s.name === 'Version')?.kind).toBe('variable')
    })

    it('strips line comments before parsing', async () => {
      const src = `
package main
// func FakeFunc() {}  ← this is a comment, should NOT be extracted
func RealFunc() int { return 42 }
`
      const ast  = await parser.parse(src)
      const syms = await parser.extractSymbols(ast)

      expect(syms.map(s => s.name)).not.toContain('FakeFunc')
      expect(syms.find(s => s.name === 'RealFunc')).toBeDefined()
    })
  })

  // ── extractImports ──────────────────────────────────────────────────────────

  describe('extractImports', () => {
    it('extracts a single import', async () => {
      const src = `import "fmt"`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps[0]).toMatchObject({ specifier: 'fmt', type: 'builtin' })
    })

    it('extracts an import block', async () => {
      const src = `
import (
  "fmt"
  "net/http"
  "github.com/pkg/errors"
)
`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps.map(i => i.specifier)).toContain('fmt')
      expect(imps.map(i => i.specifier)).toContain('net/http')
      expect(imps.map(i => i.specifier)).toContain('github.com/pkg/errors')
    })

    it('classifies third-party packages as npm', async () => {
      const src = `import "github.com/user/repo"`
      const ast  = await parser.parse(src)
      const imps = await parser.extractImports(ast)

      expect(imps[0].type).toBe('npm')
    })
  })

  // ── extractExports ──────────────────────────────────────────────────────────

  describe('extractExports', () => {
    it('only exports identifiers with uppercase first letter', async () => {
      const src = `
package main
func Exported() {}
func unexported() {}
type ExportedStruct struct{}
type unexportedStruct struct{}
`
      const ast  = await parser.parse(src)
      const exps = await parser.extractExports(ast)

      const names = exps.map(e => e.name)
      expect(names).toContain('Exported')
      expect(names).toContain('ExportedStruct')
      expect(names).not.toContain('unexported')
      expect(names).not.toContain('unexportedStruct')
    })
  })
})
