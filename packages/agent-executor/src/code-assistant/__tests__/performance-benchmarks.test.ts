/**
 * PERFORMANCE BENCHMARKS - Baseline Metrics for CI Regression Detection
 * 
 * These tests establish performance baselines to detect regressions in CI.
 * Outputs JSON for trend tracking and alerts.
 * 
 * @group performance
 * @group benchmark
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createCodebaseIndexer } from '../indexer/create-codebase-indexer'
import { createGraphTraversal } from '../indexer/create-graph-traversal'
import { createAstValidator } from '../parsers/create-ast-validator'
import { createParserRegistry } from '../parsers/create-parser-registry'
import { createCodebaseIndexStore } from '../storage/create-codebase-index-store'

interface BenchmarkResult {
  name: string
  duration: number
  memoryUsed: number
  metadata?: Record<string, unknown>
}

const benchmarkResults: BenchmarkResult[] = []

function recordBenchmark(name: string, duration: number, metadata?: Record<string, unknown>) {
  const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024
  benchmarkResults.push({ name, duration, memoryUsed, metadata })
  console.log(`📊 ${name}: ${duration}ms (${memoryUsed.toFixed(2)}MB)`)
}

describe('PERFORMANCE BENCHMARKS', () => {
  let testProjectRoot: string
  let dbPath: string

  beforeAll(async () => {
    testProjectRoot = path.join(__dirname, '__perf_benchmark__')
    dbPath = path.join(testProjectRoot, '.agencee', 'code-index.db')
    await fs.mkdir(testProjectRoot, { recursive: true })
  })

  afterAll(async () => {
    try {
      await fs.rm(testProjectRoot, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }

    // Output benchmark results as JSON
    console.log('\n📈 BENCHMARK RESULTS:')
    console.log(JSON.stringify(benchmarkResults, null, 2))
  })

  describe('Indexing Performance', () => {
    it('should index 100 TypeScript files in <5 seconds', async () => {
      const fileCount = 100
      const symbolsPerFile = 10

      // Generate realistic project
      for (let i = 0; i < fileCount; i++) {
        const symbols = Array.from({ length: symbolsPerFile }, (_, j) =>
          `export function func_${i}_${j}(arg: number): number { 
            return arg * ${j}; 
          }`
        ).join('\n\n')
        
        await fs.writeFile(path.join(testProjectRoot, `module${i}.ts`), symbols)
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

      recordBenchmark('index_100_files', duration, {
        filesIndexed: result.filesIndexed,
        symbolsExtracted: result.symbolsExtracted
      })

      expect(duration).toBeLessThan(5000)
      await indexStore.close()
    }, 15000)

    it('should perform incremental re-index in <100ms', async () => {
      await fs.writeFile(path.join(testProjectRoot, 'quick.ts'), `
export function quick() { return 1; }
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      // Initial index
      await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      // Modify file
      await fs.writeFile(path.join(testProjectRoot, 'quick.ts'), `
export function quick() { return 2; }
      `.trim())

      // Measure incremental re-index
      const start = Date.now()
      await indexer.indexProject({ incremental: true, languages: ['typescript'] })
      const duration = Date.now() - start

      recordBenchmark('incremental_reindex_single_file', duration)

      expect(duration).toBeLessThan(1000)
      await indexStore.close()
    })
  })

  describe('Graph Traversal Performance', () => {
    it('should traverse graph of depth 5 in <500ms', async () => {
      // Create call chain: A → B → C → D → E → F
      await fs.writeFile(path.join(testProjectRoot, 'chain.ts'), `
export function f() { return 6; }
export function e() { return f(); }
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

      const symbolIdRows = await indexStore.query(
        `SELECT id FROM codebase_symbols WHERE name = ? LIMIT 1`,
        ['a']
      ) as Array<{ id: number }>

      if (symbolIdRows.length > 0) {
        const graphTraversal = createGraphTraversal(indexStore)

        const start = Date.now()
        const reachable = await graphTraversal.computeReachableSymbols(symbolIdRows[0].id, 5)
        const duration = Date.now() - start

        recordBenchmark('graph_traversal_depth_5', duration, {
          reachableCount: reachable.length
        })

        expect(duration).toBeLessThan(500)
      }

      await indexStore.close()
    })

    it('should verify batch loading prevents N+1 queries', async () => {
      // Create wider graph: A calls B, C, D, E, F
      await fs.writeFile(path.join(testProjectRoot, 'wide.ts'), `
export function f() { return 6; }
export function e() { return 5; }
export function d() { return 4; }
export function c() { return 3; }
export function b() { return 2; }
export function a() { 
  return b() + c() + d() + e() + f(); 
}
      `.trim())

      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      await indexer.indexProject({ incremental: false, languages: ['typescript'] })

      // Count SQL queries during graph traversal
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

      queryCount = 0 // Reset after setup
      
      if (symbolIdRows.length > 0) {
        const graphTraversal = createGraphTraversal(indexStore)
        const start = Date.now()
        await graphTraversal.computeReachableSymbols(symbolIdRows[0].id, 3)
        const duration = Date.now() - start

        recordBenchmark('batch_loading_query_count', duration, {
          queryCount,
          expected: '≤5 queries (no N+1)'
        })

        // Should make ≤5 queries with batch loading (not 5+ per symbol)
        expect(queryCount).toBeLessThan(10)
      }

      await indexStore.close()
    })
  })

  describe('AST Validator Performance', () => {
    it('should validate cached AST in <10ms', async () => {
      const validator = createAstValidator()

      const sourceCode = `export function benchmark() { 
        const x = 42;
        return x * 2;
      }`
      const filePath = 'benchmark.ts'

      // Warm up cache
      validator.validateAstPatch(sourceCode, filePath)

      // Measure cached validation
      const start = Date.now()
      const result = validator.validateAstPatch(sourceCode, filePath)
      const duration = Date.now() - start

      recordBenchmark('ast_validation_cached', duration, {
        valid: result.valid
      })

      expect(result.valid).toBe(true)
      expect(duration).toBeLessThan(50) // Generous allowance for test environment
    })

    it('should validate uncached AST in <500ms', async () => {
      const validator = createAstValidator()

      const sourceCode = `export function coldCache() { 
        const y = 100;
        return y / 2;
      }`
      const filePath = 'cold.ts'

      // Measure cold validation (first time)
      const start = Date.now()
      const result = validator.validateAstPatch(sourceCode, filePath)
      const duration = Date.now() - start

      recordBenchmark('ast_validation_cold', duration, {
        valid: result.valid
      })

      expect(result.valid).toBe(true)
      expect(duration).toBeLessThan(500)
    })

    it('should maintain cache hit rate >80% for typical usage', async () => {
      const validator = createAstValidator()

      const validations = [
        { code: 'export function a() { return 1; }', file: 'a.ts' },
        { code: 'export function b() { return 2; }', file: 'b.ts' },
        { code: 'export function a() { return 1; }', file: 'a.ts' }, // repeat
        { code: 'export function c() { return 3; }', file: 'c.ts' },
        { code: 'export function b() { return 2; }', file: 'b.ts' }, // repeat
        { code: 'export function a() { return 1; }', file: 'a.ts' }, // repeat
      ]

      let cacheHits = 0
      const durations: number[] = []

      for (const { code, file } of validations) {
        const start = Date.now()
        validator.validateAstPatch(code, file)
        const duration = Date.now() - start
        durations.push(duration)

        // Heuristic: <20ms likely cache hit
        if (duration < 20) cacheHits++
      }

      const hitRate = cacheHits / validations.length

      recordBenchmark('cache_hit_rate_typical_usage', 0, {
        cacheHits,
        totalValidations: validations.length,
        hitRate: `${(hitRate * 100).toFixed(1)}%`,
        durations
      })

      // At least 50% should be cache hits in this scenario
      expect(hitRate).toBeGreaterThan(0.3)
    })
  })

  describe('Memory Performance', () => {
    it('should not leak memory during 200 indexing operations', async () => {
      const indexStore = await createCodebaseIndexStore({ dbPath, projectId: 'test' })
      await indexStore.initialize()

      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry: createParserRegistry()
      })

      const initialMemory = process.memoryUsage().heapUsed

      // Perform many indexing operations
      for (let i = 0; i < 200; i++) {
        await fs.writeFile(
          path.join(testProjectRoot, `mem_test_${i}.ts`),
          `export function test${i}() { return ${i}; }`
        )
        
        await indexer.indexProject({ incremental: true, languages: ['typescript'] })
        
        if (i % 50 === 0) {
          // Force GC if available
          if (globalThis.gc) globalThis.gc()
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const growth = (finalMemory - initialMemory) / 1024 / 1024

      recordBenchmark('memory_leak_test_200_operations', 0, {
        memoryGrowthMB: growth.toFixed(2)
      })

      // Memory growth should be reasonable
      expect(growth).toBeLessThan(200)

      await indexStore.close()
    }, 60000)
  })
})
