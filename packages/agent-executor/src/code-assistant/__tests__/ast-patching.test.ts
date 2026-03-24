/**
 * AST-based Patching Tests
 * Tests surgical AST edits with validation
 */

import { createAstValidator } from '../parsers/create-ast-validator';
import { createTypeScriptParser } from '../parsers/create-typescript-parser';

describe('AST-based Patching', () => {
  describe('Import Addition', () => {
    it('should add import to beginning of file', async () => {
      const sourceCode = `
export function main() {
  return 42;
}
      `.trim();

      const parser = createTypeScriptParser();
      const ast = await parser.parse(sourceCode);

      const newAst = parser.addImport(ast, "import { helper } from './utils';");
      const output = parser.print(newAst);

      expect(output).toContain("import { helper } from './utils'");
      expect(output).toContain('export function main()');
    });

    it('should insert import after existing imports', async () => {
      const sourceCode = `
import { existingA } from './a';
import { existingB } from './b';

export function main() {
  return 42;
}
      `.trim();

      const parser = createTypeScriptParser();
      const ast = await parser.parse(sourceCode);

      const newAst = parser.addImport(ast, "import { newImport } from './c';");
      const output = parser.print(newAst);

      const lines = output.split('\n');
      const importLines = lines.filter(l => l.includes('import'));
      
      expect(importLines.length).toBe(3);
      expect(importLines[2]).toContain('newImport');
    });
  });

  describe('Function Wrapping', () => {
    it('should wrap function with wrapper code', async () => {
      const sourceCode = `
export function calculate(x: number): number {
  return x * 2;
}
      `.trim();

      const wrapperCode = `
export function calculate(x: number): number {
  console.log('Before calculate');
  const result = __original_calculate(x);
  console.log('After calculate');
  return result;
}
      `.trim();

      const parser = createTypeScriptParser();
      const ast = await parser.parse(sourceCode);

      const newAst = parser.wrapFunction(ast, 'calculate', wrapperCode);
      const output = parser.print(newAst);

      expect(output).toContain('__original_calculate');
      expect(output).toContain('console.log');
    });
  });

  describe('AST Validation', () => {
    it('should validate syntactically correct code', () => {
      const validCode = `
export function test() {
  return 42;
}
      `.trim();

      const validator = createAstValidator();
      const result = validator.validateAstPatch(validCode,'test.ts');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect syntax errors', () => {
      const invalidCode = `
export function test() {
  return 42
}
      `.trim(); // Missing semicolon (not an error in TS, but shows the concept)

      const validator = createAstValidator();
      const result = validator.validateAstPatch(invalidCode, 'test.ts');

      // TypeScript is lenient with semicolons, so this should still be valid
      // Let's use actual syntax error
      const actuallyInvalidCode = `
export function test( {
  return 42;
}
      `.trim(); // Missing closing paren

      const result2 = validator.validateAstPatch(actuallyInvalidCode, 'test.ts');
      expect(result2.valid).toBe(false);
      expect(result2.errors.length).toBeGreaterThan(0);
    });

    it('should validate after AST transformation', async () => {
      const sourceCode = `
export function main() {
  return 42;
}
      `.trim();

      const parser = createTypeScriptParser();
      const ast = await parser.parse(sourceCode);
      const newAst = parser.addImport(ast, "import { helper } from './utils';");
      const output = parser.print(newAst);

      const validator = createAstValidator();
      const result = validator.validateAstPatch(output, 'test.ts');

      expect(result.valid).toBe(true);
    });
  });
});
