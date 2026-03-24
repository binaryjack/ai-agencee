/**
 * Result Merger Tests
 */

import { createResultMerger } from './create-result-merger'
import type { SearchResult } from './result-merger.types'

describe('ResultMerger', () => {
  let merger: ReturnType<typeof createResultMerger>

  beforeEach(() => {
    merger = createResultMerger(10)
  })

  describe('deduplication', () => {
    it('should deduplicate by name + file_path', () => {
      const result1: SearchResult = {
        name: 'testFunc',
        kind: 'function',
        signature: 'function testFunc(): void',
        file_path: 'src/test.ts',
        line_start: 10,
        score: 0.8,
        source: 'fts'
      }

      const result2: SearchResult = {
        name: 'testFunc',
        kind: 'function',
        signature: 'function testFunc(): void',
        file_path: 'src/test.ts',
        line_start: 10,
        score: 0.6,
        source: 'semantic'
      }

      merger.add(result1)
      merger.add(result2)

      const results = merger.getResults()
      expect(results).toHaveLength(1)
      expect(results[0].score).toBe(0.8) // Kept higher score
    })

    it('should keep results with different file paths', () => {
      merger.add({
        name: 'testFunc',
        kind: 'function',
        signature: null,
        file_path: 'src/test1.ts',
        line_start: 10
      })

      merger.add({
        name: 'testFunc',
        kind: 'function',
        signature: null,
        file_path: 'src/test2.ts',
        line_start: 20
      })

      expect(merger.getResults()).toHaveLength(2)
    })

    it('should keep results with different names', () => {
      merger.add({
        name: 'func1',
        kind: 'function',
        signature: null,
        file_path: 'src/test.ts',
        line_start: 10
      })

      merger.add({
        name: 'func2',
        kind: 'function',
        signature: null,
        file_path: 'src/test.ts',
        line_start: 20
      })

      expect(merger.getResults()).toHaveLength(2)
    })
  })

  describe('score-based merging', () => {
    it('should keep result with higher score on collision', () => {
      const lowScore: SearchResult = {
        name: 'conflictFunc',
        kind: 'function',
        signature: null,
        file_path: 'src/conflict.ts',
        line_start: 10,
        score: 0.3,
        source: 'fts'
      }

      const highScore: SearchResult = {
        name: 'conflictFunc',
        kind: 'function',
        signature: null,
        file_path: 'src/conflict.ts',
        line_start: 10,
        score: 0.9,
        source: 'semantic'
      }

      merger.add(lowScore)
      merger.add(highScore)

      const results = merger.getResults()
      expect(results[0].score).toBe(0.9)
      expect(results[0].source).toBe('semantic')
    })

    it('should sort results by score descending', () => {
      merger.add({ name: 'a', kind: 'function', signature: null, file_path: 'a.ts', line_start: 1, score: 0.5 })
      merger.add({ name: 'b', kind: 'function', signature: null, file_path: 'b.ts', line_start: 1, score: 0.9 })
      merger.add({ name: 'c', kind: 'function', signature: null, file_path: 'c.ts', line_start: 1, score: 0.2 })

      const results = merger.getResults()
      expect(results.map(r => r.name)).toEqual(['b', 'a', 'c'])
      expect(results.map(r => r.score)).toEqual([0.9, 0.5, 0.2])
    })

    it('should handle results without scores', () => {
      merger.add({ name: 'noScore', kind: 'function', signature: null, file_path: 'test.ts', line_start: 1 })
      merger.add({ name: 'withScore', kind: 'function', signature: null, file_path: 'test2.ts', line_start: 1, score: 0.8 })

      const results = merger.getResults()
      expect(results[0].name).toBe('withScore') // Scored results come first
    })
  })

  describe('batch operations', () => {
    it('should add many results at once', () => {
      const batch: SearchResult[] = [
        { name: 'func1', kind: 'function', signature: null, file_path: 'a.ts', line_start: 1 },
        { name: 'func2', kind: 'function', signature: null, file_path: 'b.ts', line_start: 1 },
        { name: 'func3', kind: 'function', signature: null, file_path: 'c.ts', line_start: 1 }
      ]

      merger.addMany(batch)

      expect(merger.getResults()).toHaveLength(3)
    })
  })

  describe('max results limit', () => {
    it('should limit results to maxResults', () => {
      const smallMerger = createResultMerger(3)

      for (let i = 0; i < 10; i++) {
        smallMerger.add({
          name: `func${i}`,
          kind: 'function',
          signature: null,
          file_path: `file${i}.ts`,
          line_start: 1,
          score: i / 10
        })
      }

      const results = smallMerger.getResults()
      expect(results).toHaveLength(3)
      // Should keep top 3 by score
      expect(results.map(r => r.name)).toEqual(['func9', 'func8', 'func7'])
    })
  })

  describe('clear', () => {
    it('should clear all results', () => {
      merger.add({ name: 'test', kind: 'function', signature: null, file_path: 'test.ts', line_start: 1 })
      expect(merger.getResults()).toHaveLength(1)

      merger.clear()
      expect(merger.getResults()).toHaveLength(0)
    })
  })
})
