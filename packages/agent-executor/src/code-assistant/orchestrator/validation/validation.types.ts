/**
 * Type definitions for the validation layer.
 *
 * Validates LLM-generated code BEFORE applying patches to disk:
 * - Syntax: Parse code for syntax errors
 * - Imports: Check all imports exist or suggest alternatives
 * - Types: Run type-checking for TypeScript projects
 *
 * Philosophy: Catch hallucinations early to prevent broken code from
 * reaching the filesystem, reducing human correction burden.
 */

/**
 * Severity of a validation issue
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Single validation issue detected in code
 */
export interface ValidationIssue {
  /** Type of validator that found this issue */
  validator: 'syntax' | 'import' | 'type' | 'general';
  
  /** Severity level */
  severity: ValidationSeverity;
  
  /** Human-readable error message */
  message: string;
  
  /** File path where issue was found (relative to project root) */
  filePath?: string;
  
  /** Line number (1-indexed) */
  line?: number;
  
  /** Column number (1-indexed) */
  column?: number;
  
  /** Suggested fix or alternative */
  suggestion?: string;
}

/**
 * Result of running a single validator
 */
export interface ValidatorResult {
  /** Validator name */
  validator: string;
  
  /** Whether validation passed (no errors) */
  passed: boolean;
  
  /** Issues found (errors, warnings, info) */
  issues: ValidationIssue[];
  
  /** Time taken to run validator (ms) */
  duration: number;
}

/**
 * Overall validation result for all patches
 */
export interface ValidationResult {
  /** Whether all validations passed (no errors) */
  passed: boolean;
  
  /** Results from individual validators */
  validators: ValidatorResult[];
  
  /** Total errors across all validators */
  totalErrors: number;
  
  /** Total warnings across all validators */
  totalWarnings: number;
  
  /** Total validation time (ms) */
  duration: number;
}

/**
 * Configuration for validation layer
 */
export interface ValidationConfig {
  /** Skip syntax validation */
  skipSyntax?: boolean;
  
  /** Skip import validation */
  skipImports?: boolean;
  
  /** Skip type checking */
  skipTypes?: boolean;
  
  /** Treat warnings as errors (fail validation) */
  strictMode?: boolean;
  
  /** Timeout for validation (ms) - default 30000 */
  timeout?: number;
  
  /** Project root directory for resolving imports */
  projectRoot?: string;
}
