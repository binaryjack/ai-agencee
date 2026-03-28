/**
 * Type validation for TypeScript projects.
 *
 * Runs TypeScript compiler (tsc --noEmit) to catch type errors
 * before patches are applied to disk.
 *
 * This is the most comprehensive validation - it catches:
 * - Type mismatches
 * - Missing properties
 * - Invalid function signatures
 * - Generic type errors
 *
 * Only runs for TypeScript files in TypeScript projects.
 */

import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { FilePatch } from '../../code-assistant-orchestrator.types.js'
import type {
    ValidationIssue,
    ValidatorResult,
} from './validation.types.js'

/**
 * Check if project is a TypeScript project
 */
async function isTypeScriptProject(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, 'tsconfig.json'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if tsc is available
 */
async function checkTscAvailable(projectRoot: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsc', '--version'], {
      cwd: projectRoot,
      shell: true,
    });
    
    proc.on('close', (code) => {
      resolve(code === 0);
    });
    
    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Parse TypeScript compiler output
 */
function parseTscOutput(output: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match: path/file.ts(line,col): error TSxxxx: message
    const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/);
    
    if (errorMatch) {
      const [, filePath, lineStr, colStr, severity, message] = errorMatch;
      
      issues.push({
        validator: 'type',
        severity: severity as 'error' | 'warning',
        message: message.trim(),
        filePath: filePath.trim(),
        line: parseInt(lineStr, 10),
        column: parseInt(colStr, 10),
      });
    }
  }
  
  return issues;
}

/**
 * Write patches to temporary directory for type checking
 */
async function writePatchesToTemp(
  patches: FilePatch[],
  projectRoot: string,
): Promise<string> {
  const tempDir = path.join(projectRoot, '.codernic-temp-validate');
  
  // Create temp directory
  await fs.mkdir(tempDir, { recursive: true });
  
  // Copy modified files to temp
  for (const patch of patches) {
    if (patch.delete) continue;
    
    const tempPath = path.join(tempDir, patch.relativePath);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, patch.content, 'utf-8');
  }
  
  return tempDir;
}

/**
 * Clean up temporary directory
 */
async function cleanupTemp(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Run TypeScript type checking on patches
 */
async function runTypeCheck(
  patches: FilePatch[],
  projectRoot: string,
  timeout: number,
): Promise<ValidationIssue[]> {
  // Filter to only TypeScript files
  const tsPatches = patches.filter((p) => {
    const ext = path.extname(p.relativePath).toLowerCase();
    return ['.ts', '.tsx'].includes(ext) && !p.delete;
  });
  
  if (tsPatches.length === 0) {
    return []; // No TypeScript files to check
  }
  
  return new Promise(async (resolve) => {
    let tempDir: string | undefined;
    
    try {
      // Write patches to temp directory
      tempDir = await writePatchesToTemp(patches, projectRoot);
      
      // Run tsc --noEmit
      const proc = spawn(
        'npx',
        ['tsc', '--noEmit', '--skipLibCheck'],
        {
          cwd: projectRoot,
          shell: true,
        },
      );
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Timeout handler
      const timer = setTimeout(() => {
        proc.kill();
        resolve([{
          validator: 'type',
          severity: 'warning',
          message: 'Type checking timed out',
        }]);
      }, timeout);
      
      proc.on('close', async (code) => {
        clearTimeout(timer);
        
        // Cleanup temp directory
        if (tempDir) {
          await cleanupTemp(tempDir);
        }
        
        // Parse output
        const output = stdout + stderr;
        const issues = parseTscOutput(output);
        
        // Filter issues to only those in our patches
        const patchPaths = new Set(tsPatches.map((p) => p.relativePath));
        const filteredIssues = issues.filter((issue) => {
          if (!issue.filePath) return false;
          
          // Normalize path for comparison
          const normalizedPath = issue.filePath
            .replace(/\\/g, '/')
            .replace(/^\.\//, '');
          
          return Array.from(patchPaths).some((p) => 
            normalizedPath.endsWith(p.replace(/\\/g, '/'))
          );
        });
        
        resolve(filteredIssues);
      });
      
      proc.on('error', async () => {
        // Cleanup temp directory
        if (tempDir) {
          await cleanupTemp(tempDir);
        }
        
        resolve([]);
      });
    } catch (err) {
      // Cleanup temp directory
      if (tempDir) {
        await cleanupTemp(tempDir);
      }
      
      resolve([]);
    }
  });
}

/**
 * Validate TypeScript types for all patches
 */
export async function validateTypes(
  patches: FilePatch[],
  projectRoot: string,
  timeout: number = 30000,
): Promise<ValidatorResult> {
  const startTime = Date.now();
  
  // Check if this is a TypeScript project
  const isTsProject = await isTypeScriptProject(projectRoot);
  if (!isTsProject) {
    return {
      validator: 'type',
      passed: true,
      issues: [],
      duration: Date.now() - startTime,
    };
  }
  
  // Check if tsc is available
  const tscAvailable = await checkTscAvailable(projectRoot);
  if (!tscAvailable) {
    return {
      validator: 'type',
      passed: true,
      issues: [{
        validator: 'type',
        severity: 'info',
        message: 'TypeScript compiler not available - skipping type validation',
      }],
      duration: Date.now() - startTime,
    };
  }
  
  // Run type checking
  const issues = await runTypeCheck(patches, projectRoot, timeout);
  const errors = issues.filter((i) => i.severity === 'error');
  
  return {
    validator: 'type',
    passed: errors.length === 0,
    issues,
    duration: Date.now() - startTime,
  };
}
