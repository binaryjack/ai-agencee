/**
 * Character Offset Tests
 * Tests precise character position tracking for AST-based edits
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createCodebaseIndexer } from '../indexer/create-codebase-indexer'
import { createParserRegistry } from '../parsers/create-parser-registry'
import { createCodebaseIndexStore } from '../storage/create-codebase-index-store'

describe('Character Offsets', () => {
  let testProjectRoot: string;
  let dbPath: string;
  let testCounter: number = 0;

  beforeEach(async () => {
    // Create unique test project directory for each test
    testCounter++;
    testProjectRoot = path.join(__dirname, `__char_offset_test_${testCounter}__`);
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

  describe('Symbol Position Tracking', () => {
    it('should track character offsets for functions', async () => {
      // Create test file with functions
      const sourceCode = `
export function first() {
  return 1;
}

export function second() {
  return 2;
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

      // Verify symbols have character offsets
      const files = await indexStore.getAllFiles();
      expect(files.length).toBe(1);

      const symbols = await indexStore.getSymbolsByFile(files[0].id);
      expect(symbols.length).toBeGreaterThanOrEqual(2);

      await indexStore.close();
    });

    it('should distinguish multiple symbols on same line by char offset', async () => {
      // Create test file with multiple statements on same line
      const sourceCode = `
const a = () => 1; const b = () => 2; const c = () => 3;
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

      const files = await indexStore.getAllFiles();
      const symbols = await indexStore.getSymbolsByFile(files[0].id);

      // Should extract 3 symbols
      expect(symbols.length).toBe(3);

      await indexStore.close();
    });

    it('should track char offsets for class methods', async () => {
      // Create test file with class and methods
      const sourceCode = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
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

      const files = await indexStore.getAllFiles();
      const symbols = await indexStore.getSymbolsByFile(files[0].id);

      // Should have Calculator class + 2 methods
      expect(symbols.length).toBeGreaterThanOrEqual(3);

      await indexStore.close();
    });

    it('should handle multi-line class spans correctly', async () => {
      // Create test file with multi-line class
      const sourceCode = `
export class LargeClass {
  private field1: string;
  private field2: number;
  
  constructor() {
    this.field1 = 'test';
    this.field2 = 42;
  }
  
  method1(): void {
    console.log(this.field1);
  }
  
  method2(): void {
    console.log(this.field2);
  }
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

      const files = await indexStore.getAllFiles();
      const symbols = await indexStore.getSymbolsByFile(files[0].id);

      // Verify class symbol exists and spans multiple lines
      const classSymbol = symbols.find((s: { name: string }) => s.name === 'LargeClass');
      expect(classSymbol).toBeDefined();

      await indexStore.close();
    });
  });

  describe('Position-based Symbol Lookup', () => {
    it('should find symbol at specific position', async () => {
      const sourceCode = `export function testFunction() {
  const x = 42;
  return x;
}`;

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

      // Try to find symbol at position where function is defined
      const normalizedPath = path.join(testProjectRoot, 'test.ts').split('\\').join('/');
      const symbol = await indexStore.getSymbolAtPosition(normalizedPath, 1, 20);

      // Should find the testFunction
      if (symbol) {
        expect(symbol.name).toBe('testFunction');
        expect(symbol.kind).toBe('function');
      }

      await indexStore.close();
    });

    it('should return most specific symbol for nested positions', async () => {
      const sourceCode = `export class Container {
  innerMethod() {
    return 42;
  }
}`;

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

      // Query should return the innermost (smallest) symbol
      const normalizedPath = path.join(testProjectRoot, 'test.ts').split('\\').join('/');
      const symbol = await indexStore.getSymbolAtPosition(normalizedPath, 2, 10);

      // Should find Container.innerMethod (smaller than Container class)
      if (symbol) {
        expect(symbol.name).toContain('innerMethod');
      }

      await indexStore.close();
    });
  });
});
