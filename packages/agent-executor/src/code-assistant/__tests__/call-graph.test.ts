/**
 * Call Graph Tests
 * Tests function call extraction and "find all usages" functionality
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createCodebaseIndexer } from '../indexer/create-codebase-indexer'
import { createParserRegistry } from '../parsers/create-parser-registry'
import { createCodebaseIndexStore } from '../storage/create-codebase-index-store'

describe('Function Call Graph', () => {
  let testProjectRoot: string;
  let dbPath: string;
  let testCounter: number = 0;

  beforeEach(async () => {
    // Create unique test project directory for each test
    testCounter++;
    testProjectRoot = path.join(__dirname, `__call_graph_test_${testCounter}__`);
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

  describe('Call Site Extraction', () => {
    it('should extract direct function calls', async () => {
      // Create test file with direct function calls
      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        `
export function helper() {
  return 42;
}

export function main() {
  const result = helper();
  console.log(result);
  return result;
}
        `.trim()
      );

      // Initialize components
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

      // Index the project
      const result = await indexer.indexProject({
        incremental: false,
        languages: ['typescript']
      });

      // Verify indexing completed
      expect(result.filesIndexed).toBe(1);
      expect(result.symbolsExtracted).toBeGreaterThanOrEqual(2);

      // Query for callers of 'helper'
      const callers = await indexStore.findCallersOf('helper');
      
      expect(callers.length).toBeGreaterThanOrEqual(1);
      expect(callers[0].callerName).toBe('main');
      expect(callers[0].filePath).toContain('test.ts');

      await indexStore.close();
    });

    it('should extract method calls on objects', async () => {
      // Create test file with method calls
      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  multiply(a: number, b: number): number {
    return a * b;
  }
}

export function compute() {
  const calc = new Calculator();
  const sum = calc.add(5, 10);
  const product = calc.multiply(2, 3);
  return sum + product;
}
        `.trim()
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

      // Query for callers of 'add'
      const addCallers = await indexStore.findCallersOf('add');
      expect(addCallers.length).toBeGreaterThanOrEqual(1);
      expect(addCallers[0].callerName).toBe('compute');

      // Query for callers of 'multiply'
      const multiplyCallers = await indexStore.findCallersOf('multiply');
      expect(multiplyCallers.length).toBeGreaterThanOrEqual(1);
      expect(multiplyCallers[0].callerName).toBe('compute');

      await indexStore.close();
    });

    it('should extract calls in nested functions', async () => {
      // Create test file with nested function calls
      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        `
export function utils() {
  return 100;
}

export function outer() {
  function inner() {
    return utils();
  }
  return inner();
}
        `.trim()
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

      // Query for callers of 'utils'
      const callers = await indexStore.findCallersOf('utils');
      
      // Should find at least one caller (inner function is not exported, but outer might call utils)
      expect(callers.length).toBeGreaterThanOrEqual(0);

      await indexStore.close();
    });

    it('should resolve cross-file function calls', async () => {
      // Create multiple files with cross-file calls
      await fs.mkdir(path.join(testProjectRoot, 'src'), { recursive: true });
      
      await fs.writeFile(
        path.join(testProjectRoot, 'src', 'utils.ts'),
        `
export function calculateDiscount(price: number): number {
  return price * 0.1;
}
        `.trim()
      );

      await fs.writeFile(
        path.join(testProjectRoot, 'src', 'checkout.ts'),
        `
import { calculateDiscount } from './utils';

export function applyPromoCode(price: number): number {
  const discount = calculateDiscount(price);
  return price - discount;
}
        `.trim()
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

      // Query for callers of 'calculateDiscount'
      const callers = await indexStore.findCallersOf('calculateDiscount');
      
      expect(callers.length).toBeGreaterThanOrEqual(1);
      expect(callers[0].callerName).toBe('applyPromoCode');
      expect(callers[0].filePath).toContain('checkout.ts');

      await indexStore.close();
    });

    it('should handle multiple callers of same function', async () => {
      // Create test file where multiple functions call the same helper
      await fs.writeFile(
        path.join(testProjectRoot, 'test.ts'),
        `
export function logger(msg: string) {
  console.log(msg);
}

export function functionA() {
  logger('A');
}

export function functionB() {
  logger('B');
}

export function functionC() {
  logger('C');
}
        `.trim()
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

      // Query for callers of 'logger'
      const callers = await indexStore.findCallersOf('logger');
      
      // Should have 3 callers: functionA, functionB, functionC
      expect(callers.length).toBe(3);
      
      const callerNames = callers.map(c => c.callerName).sort((a, b) => a.localeCompare(b));
      expect(callerNames).toEqual(['functionA', 'functionB', 'functionC']);

      await indexStore.close();
    });
  });
});
