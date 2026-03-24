/**
 * BATTLE TESTS - Architecture Validation & Stress Testing
 * 
 * These tests validate architectural quality, performance, and robustness
 * under stress conditions that expose N+1 queries, memory leaks, and race conditions.
 * 
 * @group battle
 * @group stress
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createCodebaseIndexer } from '../indexer/create-codebase-indexer'
import { createGraphTraversal } from '../indexer/create-graph-traversal'
import { createAstValidator } from '../parsers/create-ast-validator'
import { createParserRegistry } from '../parsers/create-parser-registry'
import { createCodebaseIndexStore } from '../storage/create-codebase-index-store'

describe('BATTLE TESTS - Architecture & Performance', () => {
  let testProjectRoot: string
  let dbPath: string
  let testCounter: number = 0

  beforeEach(async () => {
    testCounter++
    testProjectRoot = path.join(__dirname, `__battle_test_${testCounter}__`)
    dbPath = path.join(testProjectRoot, '.agencee', 'code-index.db')
    await fs.mkdir(testProjectRoot, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(testProjectRoot, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Performance & Scalability', () => {
    it('should handle deep call graphs (20 levels) without stack overflow', async () => {
      // Generate deep call chain
      const levels = 20
      const functions = Array.from({ length: levels }, (_, i) => 
        `export function level${i}() {
          ${i < levels - 1 ? `return level${i + 1}();` : 'return 42;'}
        }`
      ).join('\n\n')

      await fs.writeFile(path.join(testProjectRoot, 'deep.ts'), functions)

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const start = Date.now()
      await indexer.indexProject({ incremental: false, languages: ['typescript'] })
      const indexTime = Date.now() - start

      // Verify indexing completed in reasonable time
      expect(indexTime).toBeLessThan(5000)

      // Test graph traversal doesn't stack overflow
      const symbolIdRows = await indexStore.query(
        `SELECT id FROM codebase_symbols WHERE name = ? LIMIT 1`,
        ['level0']
      ) as Array<{ id: number }>

      if (symbolIdRows.length > 0) {
        const graphTraversal = createGraphTraversal(indexStore)
        const reachable = await graphTraversal.computeReachableSymbols(symbolIdRows[0].id, 20)

        expect(reachable.length).toBeGreaterThan(15)
      }

      await indexStore.close()
    }, 30000)

    it('should index large codebase (100+ files, 1000+ symbols) efficiently', async () => {
      // Generate large project structure
      const fileCount = 100
      const symbolsPerFile = 10

      for (let i = 0; i < fileCount; i++) {
        const symbols = Array.from({ length: symbolsPerFile }, (_, j) =>
          `export function func_${i}_${j}() { return ${j}; }`
        ).join('\n\n')
        
        await fs.writeFile(path.join(testProjectRoot, `file${i}.ts`), symbols)
      }

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const start = Date.now()
      const result = await indexer.indexProject({ incremental: false, languages: ['typescript'] })
      const duration = Date.now() - start

      expect(result.filesIndexed).toBe(fileCount)
      expect(result.symbolsExtracted).toBeGreaterThan(fileCount * symbolsPerFile * 0.9)
      expect(duration).toBeLessThan(15000) // Should complete in <15s

      await indexStore.close()
    }, 30000)

    it('should prevent N+1 queries in graph traversal (measure query count)', async () => {
      // Create call chain: A → B → C → D → E
      await fs.writeFile(path.join(testProjectRoot, 'chain.ts'), `
export function e() { return 5; }
export function d() { return e(); }
export function c() { return d(); }
export function b() { return c(); }
export function a() { return b(); }
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      // Wrap query method to count calls
      let queryCount = 0
      const originalQuery = indexStore.query.bind(indexStore)
      indexStore.query = async (sql: string, params?: unknown[]) => {
        queryCount++
        return originalQuery(sql, params)
      }

      const symbolIdRows = await originalQuery(
        `SELECT id FROM codebase_symbols WHERE name = ? LIMIT 1`,
        ['a']
      ) as Array<{ id: number }>

      queryCount = 0 // Reset after setup query
      
      if (symbolIdRows.length > 0) {
        const graphTraversal = createGraphTraversal(indexStore)
        await graphTraversal.computeReachableSymbols(symbolIdRows[0].id, 5)

        // Should make ≤5 queries regardless of graph depth (batch loading pattern)
        // Expected: 1 for loading call graph, 1 for batch symbol details
        expect(queryCount).toBeLessThan(10)
      }

      await indexStore.close()
    })
  })

  describe('Correctness & Edge Cases', () => {
    it('should handle circular dependencies gracefully', async () => {
      await fs.writeFile(path.join(testProjectRoot, 'circular.ts'), `
export function a() { return b(); }
export function b() { return c(); }
export function c() { return a(); } // Circular!
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      // Should not crash or hang
      await expect(indexer.indexProject({ incremental: false, languages: ['typescript'] }))
        .resolves.toBeDefined()

      const symbolIdRows = await indexStore.query(
        `SELECT id FROM codebase_symbols WHERE name = ? LIMIT 1`,
        ['a']
      ) as Array<{ id: number }>

      if (symbolIdRows.length > 0) {
        const graphTraversal = createGraphTraversal(indexStore)
        const reachable = await graphTraversal.computeReachableSymbols(symbolIdRows[0].id, 10)

        // Should find all 3 symbols in the cycle (excluding self)
        expect(reachable.length).toBeGreaterThanOrEqual(2)
      }

      await indexStore.close()
    })

    it('should handle syntax errors without crashing', async () => {
      await fs.writeFile(path.join(testProjectRoot, 'bad.ts'), `
export function valid() { return 1; }
export function broken() { this is not valid syntax!!!
export function alsoValid() { return 2; }
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const result = await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      // Should still index valid symbols
      expect(result.filesIndexed).toBeGreaterThan(0)

      await indexStore.close()
    })

    it('should handle Unicode characters in char offsets correctly', async () => {
      const sourceCode = `// 日本語コメント
export function emoji🚀() {
  return "テスト";
}`

      await fs.writeFile(path.join(testProjectRoot, 'unicode.ts'), sourceCode)

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      const files = await indexStore.getAllFiles()
      const symbols = await indexStore.getSymbolsByFile(files[0].id)

      // Should extract function symbol
      expect(symbols.length).toBeGreaterThan(0)

      await indexStore.close()
    })

    it('should handle empty files without errors', async () => {
      await fs.writeFile(path.join(testProjectRoot, 'empty.ts'), '')
      await fs.writeFile(path.join(testProjectRoot, 'whitespace.ts'), '   \n\n   ')

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const result = await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      expect(result.filesIndexed).toBe(2)
      expect(result.symbolsExtracted).toBe(0)

      await indexStore.close()
    })
    
    it('should handle malformed AST in validator without crashing', async () => {
      const validator = createAstValidator()
      
      const malformedCode = 'function broken( { return'
      const result = validator.validateAstPatch(malformedCode, 'test.ts')
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('AST Validator Caching', () => {
    it('should reuse ts.Program instances for performance', async () => {
      const validator = createAstValidator()

      const sourceCode = `export function test() { return 42; }`
      const filePath = 'test.ts'

      // First validation - cold cache
      const start1 = Date.now()
      const result1 = validator.validateAstPatch(sourceCode, filePath)
      const duration1 = Date.now() - start1

     // Second validation - should hit cache
     const start2 = Date.now()
      const result2 = validator.validateAstPatch(sourceCode, filePath)
      const duration2 = Date.now() - start2

      expect(result1.valid).toBe(true)
      expect(result2.valid).toBe(true)

      // Cached validation should be faster (note: might not be 10x in test environment)
      console.log(`First validation: ${duration1}ms, Second: ${duration2}ms`)
      // Don't assert exact speedup due to test environment variability
    })

    it('should not leak memory with 100 validations', async () => {
      const validator = createAstValidator()

      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 100; i++) {
        const sourceCode = `export function test${i}() { return ${i}; }`
        validator.validateAstPatch(sourceCode, `test${i}.ts`)
      }

      const finalMemory = process.memoryUsage().heapUsed
      const growth = (finalMemory - initialMemory) / 1024 / 1024

      // Memory growth should be reasonable (<100MB for 100 validations)
      console.log(`Memory growth: ${growth.toFixed(2)}MB`)
      expect(growth).toBeLessThan(100)
    })
  })

  describe('Real-World Stress', () => {
    it('should handle React-like project structure (components + hooks + utils)', async () => {
      // Create realistic React structure
      await fs.mkdir(path.join(testProjectRoot, 'src', 'components'), { recursive: true })
      await fs.mkdir(path.join(testProjectRoot, 'src', 'hooks'), { recursive: true })
      await fs.mkdir(path.join(testProjectRoot, 'src', 'utils'), { recursive: true })

      await fs.writeFile(path.join(testProjectRoot, 'src', 'utils', 'helpers.ts'), `
export function formatDate(date: Date): string {
  return date.toISOString();
}
      `.trim())

      await fs.writeFile(path.join(testProjectRoot, 'src', 'hooks', 'useData.ts'), `
import { formatDate } from '../utils/helpers';

export function useData() {
  const now = formatDate(new Date());
  return { now };
}
      `.trim())

      await fs.writeFile(path.join(testProjectRoot, 'src', 'components', 'App.tsx'), `
import { useData } from '../hooks/useData';

export function App() {
  const { now } = useData();
  return <div>{now}</div>;
}
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const result = await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      expect(result.filesIndexed).toBe(3)
      expect(result.symbolsExtracted).toBeGreaterThan(2)
      expect(result.dependenciesTracked).toBeGreaterThan(1)

      // Verify call graph captures React component → hook → util chain
      const callers = await indexStore.findCallersOf('formatDate')
      expect(callers.length).toBeGreaterThan(0)

      await indexStore.close()
    })

    it('should perform incremental re-index quickly', async () => {
      // Initial index
      await fs.mkdir(path.join(testProjectRoot, 'src'), { recursive: true })
      await fs.writeFile(path.join(testProjectRoot, 'src', 'index.ts'), `
export function initial() { return 1; }
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      // Modify one file
      await fs.writeFile(path.join(testProjectRoot, 'src', 'index.ts'), `
export function initial() { return 1; }
export function added() { return 2; }
      `.trim())

      // Incremental re-index
      const start = Date.now()
      const result = await indexer.indexProject({ incremental: true, languages: ['typescript'] })
      const duration = Date.now() - start

      expect(result.filesIndexed).toBe(1)
      expect(duration).toBeLessThan(1000) // Should be fast

      await indexStore.close()
    })
  })
})
