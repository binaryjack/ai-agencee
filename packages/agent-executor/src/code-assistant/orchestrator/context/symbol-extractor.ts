/**
 * Symbol extraction from code files
 * 
 * Extracts functions, classes, types, imports from various languages
 * using regex patterns (fast) instead of AST parsing (slow).
 */

import type { CodeSymbol } from './context.types.js';

/**
 * Extract symbols from TypeScript/JavaScript code
 */
export function extractTypeScriptSymbols(code: string, filePath: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = code.split('\n');
  
  // Pattern: export function name(...) or function name(...)
  const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  
  // Pattern: export class Name or class Name
  const classPattern = /(?:export\s+)?class\s+(\w+)/g;
  
  // Pattern: export interface Name or interface Name
  const interfacePattern = /(?:export\s+)?interface\s+(\w+)/g;
  
  // Pattern: export type Name = or type Name =
  const typePattern = /(?:export\s+)?type\s+(\w+)\s*=/g;
  
  // Pattern: export const name = or const name =
  const constPattern = /(?:export\s+)?const\s+(\w+)\s*=/g;
  
  // Pattern: export enum Name or enum Name
  const enumPattern = /(?:export\s+)?enum\s+(\w+)/g;
  
  // Pattern: import { ... } from '...' or import * as name from '...'
  const importPattern = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  
  // Find all function declarations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Functions
    let match = functionPattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      // Find function end (simple heuristic: next line that starts with })
      let endLine = lineNum;
      let braceCount = 0;
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        
        if (braceCount === 0 && j > i) {
          endLine = j + 1;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'function',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
        isExported,
      });
      
      match = functionPattern.exec(line);
    }
    
    // Classes
    match = classPattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      // Find class end
      let endLine = lineNum;
      let braceCount = 0;
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        
        if (braceCount === 0 && j > i) {
          endLine = j + 1;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'class',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
        isExported,
      });
      
      match = classPattern.exec(line);
    }
    
    // Interfaces
    match = interfacePattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      // Find interface end
      let endLine = lineNum;
      let braceCount = 0;
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        
        if (braceCount === 0 && j > i) {
          endLine = j + 1;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'interface',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
        isExported,
      });
      
      match = interfacePattern.exec(line);
    }
    
    // Types
    match = typePattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      symbols.push({
        name,
        type: 'type',
        filePath,
        startLine: lineNum,
        endLine: lineNum,
        code: line,
        isExported,
      });
      
      match = typePattern.exec(line);
    }
    
    // Constants
    match = constPattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      symbols.push({
        name,
        type: 'constant',
        filePath,
        startLine: lineNum,
        endLine: lineNum,
        code: line,
        isExported,
      });
      
      match = constPattern.exec(line);
    }
    
    // Enums
    match = enumPattern.exec(line);
    while (match) {
      const name = match[1];
      const isExported = match[0].includes('export');
      
      // Find enum end
      let endLine = lineNum;
      let braceCount = 0;
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        
        if (braceCount === 0 && j > i) {
          endLine = j + 1;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'enum',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
        isExported,
      });
      
      match = enumPattern.exec(line);
    }
    
    // Imports
    match = importPattern.exec(line);
    while (match) {
      const modulePath = match[1];
      
      symbols.push({
        name: modulePath,
        type: 'import',
        filePath,
        startLine: lineNum,
        endLine: lineNum,
        code: line,
      });
      
      match = importPattern.exec(line);
    }
  }
  
  return symbols;
}

/**
 * Extract symbols from Python code
 */
export function extractPythonSymbols(code: string, filePath: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = code.split('\n');
  
  // Pattern: def function_name(...):
  const functionPattern = /^(\s*)def\s+(\w+)\s*\(/;
  
  // Pattern: class ClassName:
  const classPattern = /^(\s*)class\s+(\w+)/;
  
  // Pattern: from ... import ... or import ...
  const importPattern = /^(?:from\s+(\S+)\s+)?import\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Functions
    const funcMatch = functionPattern.exec(line);
    if (funcMatch) {
      const indent = funcMatch[1];
      const name = funcMatch[2];
      
      // Find function end (next line with same or less indentation)
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.trim() && !nextLine.startsWith(indent + ' ') && !nextLine.startsWith(indent + '\t')) {
          endLine = j;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'function',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
      });
    }
    
    // Classes
    const classMatch = classPattern.exec(line);
    if (classMatch) {
      const indent = classMatch[1];
      const name = classMatch[2];
      
      // Find class end
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.trim() && !nextLine.startsWith(indent + ' ') && !nextLine.startsWith(indent + '\t')) {
          endLine = j;
          break;
        }
      }
      
      symbols.push({
        name,
        type: 'class',
        filePath,
        startLine: lineNum,
        endLine,
        code: lines.slice(i, endLine).join('\n'),
      });
    }
    
    // Imports
    const importMatch = importPattern.exec(line);
    if (importMatch) {
      const modulePath = importMatch[1] || importMatch[2];
      
      symbols.push({
        name: modulePath,
        type: 'import',
        filePath,
        startLine: lineNum,
        endLine: lineNum,
        code: line,
      });
    }
  }
  
  return symbols;
}

/**
 * Extract symbols from any supported language
 */
export function extractSymbols(code: string, filePath: string, language?: string): CodeSymbol[] {
  // Auto-detect language from file extension
  if (!language) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      language = 'typescript';
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      language = 'javascript';
    } else if (filePath.endsWith('.py')) {
      language = 'python';
    } else {
      // Unsupported language
      return [];
    }
  }
  
  switch (language.toLowerCase()) {
    case 'typescript':
    case 'javascript':
      return extractTypeScriptSymbols(code, filePath);
    
    case 'python':
      return extractPythonSymbols(code, filePath);
    
    default:
      return [];
  }
}

/**
 * Estimate token count for code
 * Simple heuristic: ~4 characters per token
 */
export function estimateTokens(code: string): number {
  return Math.ceil(code.length / 4);
}
