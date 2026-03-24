/**
 * Graph-distance Ranking Tests
 * Tests transitive symbol discovery via call graph traversal
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createCodebaseIndexer } from '../indexer/create-codebase-indexer'
import { createGraphTraversal } from '../indexer/create-graph-traversal'
import { createParserRegistry } from '../parsers/create-parser-registry'
import { createCodebaseIndexStore } from '../storage/create-codebase-index-store'

describe('Graph-distance Ranking', () => {
  let testProjectRoot: string;
  let dbPath: string;
  let testCounter: number = 0;

  beforeEach(async () => {
    // Create unique test project directory for each test
    testCounter++;
    testProjectRoot = path.join(__dirname, `__graph_dist_test_${testCounter}__`);
    dbPath = path.join(testProjectRoot, '.agencee', 'code-index.db');
    
    await fs.mkdir(testProjectRoot, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test project after each test
    try {
      await fs.rm(testProjectRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Transitive Symbol Discovery', () => {
    it('should find symbols 1 hop away in call graph', async () => {
      // Create call chain: main -> helper -> utils
      const sourceCode = `
export function utils() {
  return 42;
}

export function helper() {
  return utils();
}

export function main() {
  return helper();
}
      `.trim();

      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        sourceCode
      );

      const indexStore = await createCodebaseIndexStore({
        dbPath,
        projectId: 'test-project'
      });
      await indexStore.initialize();

      const parserRegistry = createParserRegistry();
      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry
      });

      await indexer.indexProject({
        incremental: false,
        languages: ['typescript']
      });

      // Get symbol ID for 'main'
      const mainSymbol = await indexStore.query(
        `SELECT s.id FROM codebase_symbols s
         JOIN codebase_files f ON s.file_id = f.id
         WHERE s.name = 'main'
         LIMIT 1`,
        []
      ) as Array<{ id: number }>;

      expect(mainSymbol.length).toBe(1);

      // Traverse graph from 'main'
      const graphTraversal = createGraphTraversal(indexStore);
      const reachable = await graphTraversal.computeReachableSymbols(mainSymbol[0].id, 2);

      // Should find 'helper' (distance 1) and 'utils' (distance 2)
      expect(reachable.length).toBeGreaterThanOrEqual(1);
      
      const helperSymbol = reachable.find(r => r.name === 'helper');
      expect(helperSymbol).toBeDefined();
      expect(helperSymbol?.distance).toBe(1);

      await indexStore.close();
    });

    it('should compute distance-based scores correctly', async () => {
      const sourceCode = `
export function level0() {
  return level1();
}

export function level1() {
  return level2();
}

export function level2() {
  return 42;
}
      `.trim();

      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        sourceCode
      );

      const indexStore = await createCodebaseIndexStore({
        dbPath,
        projectId: 'test-project'
      });
      await indexStore.initialize();

      const parserRegistry = createParserRegistry();
      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry
      });

      await indexer.indexProject({
        incremental: false,
        languages: ['typescript']
      });

      // Get symbol ID for 'level0'
      const startSymbol = await indexStore.query(
        `SELECT s.id FROM codebase_symbols s
         WHERE s.name = 'level0'
         LIMIT 1`,
        []
      ) as Array<{ id: number }>;

      const graphTraversal = createGraphTraversal(indexStore);
      const reachable = await graphTraversal.computeReachableSymbols(startSymbol[0].id, 3);

      // Verify scores decay by distance
      const level1 = reachable.find(r => r.name === 'level1');
      const level2 = reachable.find(r => r.name === 'level2');

      if (level1 && level2) {
        expect(level1.score).toBeGreaterThan(level2.score);
        expect(level1.score).toBe(0.5); // 0.5^1
        expect(level2.score).toBe(0.25); // 0.5^2
      }

      await indexStore.close();
    });

    it('should handle circular dependencies', async () => {
      const sourceCode = `
export function a() {
  return b();
}

export function b() {
  return a();
}
      `.trim();

      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        sourceCode
      );

      const indexStore = await createCodebaseIndexStore({
        dbPath,
        projectId: 'test-project'
      });
      await indexStore.initialize();

      const parserRegistry = createParserRegistry();
      const indexer = createCodebaseIndexer({
        projectRoot: testProjectRoot,
        indexStore,
        parserRegistry
      });

      await indexer.indexProject({
        incremental: false,
        languages: ['typescript']
      });

      // Get symbol ID for 'a'
      const symbolA = await indexStore.query(
        `SELECT s.id FROM codebase_symbols s
         WHERE s.name = 'a'
         LIMIT 1`,
        []
      ) as Array<{ id: number }>;

      const graphTraversal = createGraphTraversal(indexStore);
      const reachable = await graphTraversal.computeReachableSymbols(symbolA[0].id, 5);

      // Should find 'b' and not loop infinitely
      expect(reachable.length).toBeGreaterThanOrEqual(1);
      const symbolB = reachable.find(r => r.name === 'b');
      expect(symbolB).toBeDefined();
      expect(symbolB?.distance).toBe(1);

      await indexStore.close();
    });
  });
});
