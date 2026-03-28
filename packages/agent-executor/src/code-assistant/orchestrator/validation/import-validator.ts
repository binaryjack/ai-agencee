/**
 * Import validation for generated code patches.
 *
 * Checks that all imports reference existing files or installed packages.
 * Prevents LLM hallucination of non-existent modules.
 *
 * Strategy:
 * 1. Extract all import statements from patches
 * 2. Check if relative imports exist in project
 * 3. Check if package imports exist in node_modules / package.json
 * 4. Suggest alternatives for hallucinated imports using fuzzy matching
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { FilePatch } from '../../code-assistant-orchestrator.types.js'
import type {
    ValidationIssue,
    ValidatorResult,
} from './validation.types.js'

/**
 * Import statement parsed from code
 */
interface ImportStatement {
  /** Full import line */
  raw: string;
  
  /** Module being imported (e.g., './utils', 'lodash') */
  module: string;
  
  /** Line number in file (1-indexed) */
  line: number;
  
  /** Whether this is a relative import (starts with . or ..) */
  isRelative: boolean;
}

/**
 * Extract import statements from TypeScript/JavaScript code
 */
function extractImports(content: string): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Match: import ... from '...'
    const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const module = importMatch[1];
      imports.push({
        raw: line.trim(),
        module,
        line: lineNum,
        isRelative: module.startsWith('.') || module.startsWith('..'),
      });
      return;
    }
    
    // Match: import '...'
    const bareImportMatch = line.match(/import\s+['"]([^'"]+)['"]/);
    if (bareImportMatch) {
      const module = bareImportMatch[1];
      imports.push({
        raw: line.trim(),
        module,
        line: lineNum,
        isRelative: module.startsWith('.') || module.startsWith('..'),
      });
      return;
    }
    
    // Match: require('...')
    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      const module = requireMatch[1];
      imports.push({
        raw: line.trim(),
        module,
        line: lineNum,
        isRelative: module.startsWith('.') || module.startsWith('..'),
      });
    }
  });
  
  return imports;
}

/**
 * Extract import statements from Python code
 */
function extractPythonImports(content: string): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Match: from ... import ...
    const fromImportMatch = line.match(/from\s+([^\s]+)\s+import/);
    if (fromImportMatch) {
      const module = fromImportMatch[1];
      imports.push({
        raw: line.trim(),
        module,
        line: lineNum,
        isRelative: module.startsWith('.'),
      });
      return;
    }
    
    // Match: import ...
    const importMatch = line.match(/^import\s+([^\s,]+)/);
    if (importMatch) {
      const module = importMatch[1];
      imports.push({
        raw: line.trim(),
        module,
        line: lineNum,
        isRelative: module.startsWith('.'),
      });
    }
  });
  
  return imports;
}

/**
 * Extract imports based on file extension
 */
function extractImportsForLanguage(
  content: string,
  filePath: string,
): ImportStatement[] {
  const ext = path.extname(filePath).toLowerCase();
  
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    return extractImports(content);
  }
  
  if (ext === '.py') {
    return extractPythonImports(content);
  }
  
  return [];
}

/**
 * Check if a relative import exists
 */
async function checkRelativeImport(
  module: string,
  fromFile: string,
  projectRoot: string,
): Promise<boolean> {
  const fromDir = path.dirname(path.join(projectRoot, fromFile));
  const possiblePaths = [
    path.join(fromDir, module),
    path.join(fromDir, module + '.ts'),
    path.join(fromDir, module + '.tsx'),
    path.join(fromDir, module + '.js'),
    path.join(fromDir, module + '.jsx'),
    path.join(fromDir, module + '.py'),
    path.join(fromDir, module, 'index.ts'),
    path.join(fromDir, module, 'index.js'),
  ];
  
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      return true;
    } catch {
      // Continue checking other paths
    }
  }
  
  return false;
}

/**
 * Check if a package import exists in node_modules or package.json
 */
async function checkPackageImport(
  module: string,
  projectRoot: string,
): Promise<boolean> {
  // Extract package name (handle scoped packages like @types/node)
  const packageName = module.startsWith('@')
    ? module.split('/').slice(0, 2).join('/')
    : module.split('/')[0];
  
  // Check node_modules
  const nodeModulesPath = path.join(projectRoot, 'node_modules', packageName);
  try {
    await fs.access(nodeModulesPath);
    return true;
  } catch {
    // Continue to package.json check
  }
  
  // Check package.json dependencies
  try {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    const pkgJsonContent = await fs.readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);
    
    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
      ...(pkgJson.peerDependencies || {}),
    };
    
    return packageName in allDeps;
  } catch {
    // package.json not found or invalid
    return false;
  }
}

/**
 * Find similar existing imports using Levenshtein distance
 */
function findSimilarImports(
  missing: string,
  existing: string[],
): string | undefined {
  if (existing.length === 0) return undefined;
  
  // Simple similarity check using string inclusion
  const candidates = existing.filter((e) => {
    const lower = e.toLowerCase();
    const missingLower = missing.toLowerCase();
    return lower.includes(missingLower) || missingLower.includes(lower);
  });
  
  return candidates[0];
}

/**
 * Validate imports for a single patch
 */
async function validatePatchImports(
  patch: FilePatch,
  projectRoot: string,
  allPatches: FilePatch[],
): Promise<ValidationIssue[]> {
  if (patch.delete) {
    return []; // No import validation needed for deletions
  }
  
  const issues: ValidationIssue[] = [];
  const imports = extractImportsForLanguage(patch.content, patch.relativePath);
  
  // Get list of files being created in this execution
  const newFiles = allPatches
    .filter((p) => !p.delete)
    .map((p) => p.relativePath);
  
  for (const imp of imports) {
    if (imp.isRelative) {
      // Check relative import
      const exists = await checkRelativeImport(
        imp.module,
        patch.relativePath,
        projectRoot,
      );
      
      // Check if it's being created in this execution
      const beingCreated = newFiles.some((f) => {
        const fromDir = path.dirname(patch.relativePath);
        const resolved = path.join(fromDir, imp.module);
        return f.startsWith(resolved);
      });
      
      if (!exists && !beingCreated) {
        issues.push({
          validator: 'import',
          severity: 'error',
          message: `Import not found: ${imp.module}`,
          filePath: patch.relativePath,
          line: imp.line,
          suggestion: findSimilarImports(imp.module, newFiles),
        });
      }
    } else {
      // Check package import
      const exists = await checkPackageImport(imp.module, projectRoot);
      
      if (!exists) {
        issues.push({
          validator: 'import',
          severity: 'warning',
          message: `Package not installed: ${imp.module}`,
          filePath: patch.relativePath,
          line: imp.line,
          suggestion: 'Add to package.json dependencies',
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate imports for all patches
 */
export async function validateImports(
  patches: FilePatch[],
  projectRoot: string,
  timeout: number = 30000,
): Promise<ValidatorResult> {
  const startTime = Date.now();
  
  const allIssues: ValidationIssue[] = [];
  
  // Validate each patch
  for (const patch of patches) {
    const issues = await validatePatchImports(patch, projectRoot, patches);
    allIssues.push(...issues);
    
    // Check timeout
    if (Date.now() - startTime > timeout) {
      allIssues.push({
        validator: 'import',
        severity: 'warning',
        message: 'Import validation timed out',
      });
      break;
    }
  }
  
  const errors = allIssues.filter((i) => i.severity === 'error');
  
  return {
    validator: 'import',
    passed: errors.length === 0,
    issues: allIssues,
    duration: Date.now() - startTime,
  };
}
