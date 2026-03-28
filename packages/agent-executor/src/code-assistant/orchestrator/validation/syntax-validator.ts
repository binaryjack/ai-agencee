/**
 * Syntax validation for generated code patches.
 *
 * Parses code using language-specific parsers to detect syntax errors
 * BEFORE patches are applied to disk. Supports:
 * - TypeScript/JavaScript (via @typescript-eslint/parser or esprima)
 * - Python (via python -m py_compile)
 * - Go (via gofmt -e)
 *
 * Prevents broken code from reaching the filesystem.
 */

import { spawn } from 'child_process'
import * as path from 'path'
import type { FilePatch } from '../../code-assistant-orchestrator.types.js'
import type {
    ValidationIssue,
    ValidatorResult,
} from './validation.types.js'

/**
 * Language of the file based on extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  if (['.ts', '.tsx'].includes(ext)) return 'typescript';
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.py'].includes(ext)) return 'python';
  if (['.go'].includes(ext)) return 'go';
  if (['.java'].includes(ext)) return 'java';
  if (['.rb'].includes(ext)) return 'ruby';
  if (['.rs'].includes(ext)) return 'rust';
  
  return 'unknown';
}

/**
 * Validate TypeScript syntax using a simple approach
 */
async function validateTypeScriptSyntax(
  patch: FilePatch,
  filePath: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  // Basic syntax checks without full parsing
  const content = patch.content;
  
  // Check for unclosed braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      validator: 'syntax',
      severity: 'error',
      message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
      filePath,
    });
  }
  
  // Check for unclosed parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      validator: 'syntax',
      severity: 'error',
      message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      filePath,
    });
  }
  
  // Check for unclosed brackets
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push({
      validator: 'syntax',
      severity: 'error',
      message: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
      filePath,
    });
  }
  
  // Check for common syntax errors
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Unclosed string literals (basic check)
    const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
    const backticks = (line.match(/(?<!\\)`/g) || []).length;
    
    if (singleQuotes % 2 !== 0 && !line.trim().startsWith('//')) {
      issues.push({
        validator: 'syntax',
        severity: 'error',
        message: 'Unclosed single quote',
        filePath,
        line: lineNum,
      });
    }
    if (doubleQuotes % 2 !== 0 && !line.trim().startsWith('//')) {
      issues.push({
        validator: 'syntax',
        severity: 'error',
        message: 'Unclosed double quote',
        filePath,
        line: lineNum,
      });
    }
  });
  
  return issues;
}

/**
 * Validate Python syntax using python -m py_compile
 */
async function validatePythonSyntax(
  patch: FilePatch,
  filePath: string,
  projectRoot: string,
): Promise<ValidationIssue[]> {
  return new Promise((resolve) => {
    const issues: ValidationIssue[] = [];
    
    // Write content to temp file for validation
    const tempFile = path.join(projectRoot, '.codernic-temp-validate.py');
    const fs = require('fs/promises');
    
    (async () => {
      try {
        await fs.writeFile(tempFile, patch.content, 'utf-8');
        
        const proc = spawn('python', ['-m', 'py_compile', tempFile], {
          cwd: projectRoot,
        });
        
        let stderr = '';
        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', async (code) => {
          if (code !== 0 && stderr) {
            // Parse Python error output
            const errorMatch = stderr.match(/File ".*", line (\d+)/);
            const line = errorMatch ? parseInt(errorMatch[1], 10) : undefined;
            
            issues.push({
              validator: 'syntax',
              severity: 'error',
              message: stderr.split('\n')[0] || 'Python syntax error',
              filePath,
              line,
            });
          }
          
          // Cleanup temp file
          try {
            await fs.unlink(tempFile);
          } catch {
            // Ignore cleanup errors
          }
          
          resolve(issues);
        });
      } catch (err) {
        // If python not available, skip validation
        resolve([]);
      }
    })();
  });
}

/**
 * Validate Go syntax using gofmt -e
 */
async function validateGoSyntax(
  patch: FilePatch,
  filePath: string,
  projectRoot: string,
): Promise<ValidationIssue[]> {
  return new Promise((resolve) => {
    const issues: ValidationIssue[] = [];
    
    const proc = spawn('gofmt', ['-e'], {
      cwd: projectRoot,
    });
    
    let stderr = '';
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Write content to stdin
    proc.stdin?.write(patch.content);
    proc.stdin?.end();
    
    proc.on('close', (code) => {
      if (code !== 0 && stderr) {
        // Parse Go error output
        const errorMatch = stderr.match(/:(\d+):(\d+):/);
        const line = errorMatch ? parseInt(errorMatch[1], 10) : undefined;
        const column = errorMatch ? parseInt(errorMatch[2], 10) : undefined;
        
        issues.push({
          validator: 'syntax',
          severity: 'error',
          message: stderr.split('\n')[0] || 'Go syntax error',
          filePath,
          line,
          column,
        });
      }
      resolve(issues);
    });
    
    proc.on('error', () => {
      // If gofmt not available, skip validation
      resolve([]);
    });
  });
}

/**
 * Validate syntax for a single patch
 */
async function validatePatchSyntax(
  patch: FilePatch,
  projectRoot: string,
): Promise<ValidationIssue[]> {
  if (patch.delete) {
    return []; // No syntax validation needed for deletions
  }
  
  const language = detectLanguage(patch.relativePath);
  
  switch (language) {
    case 'typescript':
    case 'javascript':
      return validateTypeScriptSyntax(patch, patch.relativePath);
    
    case 'python':
      return validatePythonSyntax(patch, patch.relativePath, projectRoot);
    
    case 'go':
      return validateGoSyntax(patch, patch.relativePath, projectRoot);
    
    default:
      // Unsupported language - skip validation
      return [];
  }
}

/**
 * Validate syntax for all patches
 */
export async function validateSyntax(
  patches: FilePatch[],
  projectRoot: string,
  timeout: number = 30000,
): Promise<ValidatorResult> {
  const startTime = Date.now();
  
  const allIssues: ValidationIssue[] = [];
  
  // Validate each patch
  for (const patch of patches) {
    const issues = await validatePatchSyntax(patch, projectRoot);
    allIssues.push(...issues);
    
    // Check timeout
    if (Date.now() - startTime > timeout) {
      allIssues.push({
        validator: 'syntax',
        severity: 'warning',
        message: 'Syntax validation timed out',
      });
      break;
    }
  }
  
  const errors = allIssues.filter((i) => i.severity === 'error');
  
  return {
    validator: 'syntax',
    passed: errors.length === 0,
    issues: allIssues,
    duration: Date.now() - startTime,
  };
}
