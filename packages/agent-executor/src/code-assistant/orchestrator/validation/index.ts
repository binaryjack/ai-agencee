/**
 * Validation orchestrator - coordinates all validators.
 *
 * Runs syntax, import, and type validation in parallel for speed.
 * Returns aggregated results with total errors/warnings.
 *
 * Validation prevents LLM hallucinations and syntax errors from
 * reaching the filesystem, reducing human correction burden.
 */

import type { FilePatch } from '../../code-assistant-orchestrator.types.js';
import type {
  ValidationConfig,
  ValidationResult,
  ValidatorResult,
} from './validation.types.js';
import { validateSyntax } from './syntax-validator.js';
import { validateImports } from './import-validator.js';
import { validateTypes } from './type-validator.js';

/**
 * Run all validators in parallel
 */
export async function validatePatches(
  patches: FilePatch[],
  config: ValidationConfig,
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  const {
    skipSyntax = false,
    skipImports = false,
    skipTypes = false,
    strictMode = false,
    timeout = 30000,
    projectRoot = process.cwd(),
  } = config;
  
  // Run validators in parallel
  const validators: Promise<ValidatorResult>[] = [];
  
  if (!skipSyntax) {
    validators.push(validateSyntax(patches, projectRoot, timeout));
  }
  
  if (!skipImports) {
    validators.push(validateImports(patches, projectRoot, timeout));
  }
  
  if (!skipTypes) {
    validators.push(validateTypes(patches, projectRoot, timeout));
  }
  
  // Wait for all validators to complete
  const results = await Promise.all(validators);
  
  // Aggregate results
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const result of results) {
    totalErrors += result.issues.filter((i) => i.severity === 'error').length;
    totalWarnings += result.issues.filter((i) => i.severity === 'warning').length;
  }
  
  // In strict mode, treat warnings as errors
  const passed = strictMode
    ? totalErrors === 0 && totalWarnings === 0
    : totalErrors === 0;
  
  return {
    passed,
    validators: results,
    totalErrors,
    totalWarnings,
    duration: Date.now() - startTime,
  };
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.passed) {
    return `✓ Validation passed (${result.duration}ms)`;
  }
  
  const lines: string[] = [];
  lines.push(`✗ Validation failed: ${result.totalErrors} errors, ${result.totalWarnings} warnings`);
  lines.push('');
  
  for (const validator of result.validators) {
    if (validator.issues.length === 0) continue;
    
    lines.push(`${validator.validator.toUpperCase()}:`);
    
    for (const issue of validator.issues) {
      const location = issue.filePath
        ? `${issue.filePath}${issue.line ? `:${issue.line}` : ''}${issue.column ? `:${issue.column}` : ''}`
        : '';
      
      const icon = issue.severity === 'error' ? '✗' : '⚠';
      const msg = location ? `${icon} ${location}: ${issue.message}` : `${icon} ${issue.message}`;
      
      lines.push(`  ${msg}`);
      
      if (issue.suggestion) {
        lines.push(`    → Suggestion: ${issue.suggestion}`);
      }
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}
