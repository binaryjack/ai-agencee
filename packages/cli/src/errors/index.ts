/**
 * Custom Error Classes
 * Replaces generic Error and process.exit() calls
 * 
 * Phase 1.5: Foundation - Error Handling
 */

/**
 * Base CLI error with error codes and context
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

// ==========================================================================
// File System Errors
// ==========================================================================

export class FileNotFoundError extends CliError {
  constructor(filePath: string) {
    super(
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND',
      { filePath }
    );
  }
}

export class FileReadError extends CliError {
  constructor(filePath: string, options?: ErrorOptions) {
    super(
      `Failed to read file: ${filePath}`,
      'FILE_READ_ERROR',
      { filePath, cause: options?.cause }
    );
  }
}

export class FileWriteError extends CliError {
  constructor(filePath: string, options?: ErrorOptions) {
    super(
      `Failed to write file: ${filePath}`,
      'FILE_WRITE_ERROR',
      { filePath, cause: options?.cause }
    );
  }
}

export class DirectoryNotFoundError extends CliError {
  constructor(dirPath: string) {
    super(
      `Directory not found: ${dirPath}`,
      'DIRECTORY_NOT_FOUND',
      { dirPath }
    );
  }
}

// ==========================================================================
// Validation Errors
// ==========================================================================

export class ValidationError extends CliError {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { errors }
    );
  }
}

export class InvalidDagError extends ValidationError {
  constructor(reason: string, errors: string[] = []) {
    super(
      `Invalid DAG: ${reason}`,
      errors
    );
    this.code = 'INVALID_DAG';
  }
}

export class JsonParseError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(
      message,
      'JSON_PARSE_ERROR',
      { cause: options?.cause }
    );
  }
}

// ==========================================================================
// Template Errors
// ==========================================================================

export class TemplateNotFoundError extends CliError {
  constructor(templateId: string) {
    super(
      `Template not found: ${templateId}`,
      'TEMPLATE_NOT_FOUND',
      { templateId }
    );
  }
}

export class TemplateInstallError extends CliError {
  constructor(templateId: string, reason: string, options?: ErrorOptions) {
    super(
      `Failed to install template '${templateId}': ${reason}`,
      'TEMPLATE_INSTALL_ERROR',
      { templateId, reason, cause: options?.cause }
    );
  }
}

// ==========================================================================
// Provider Errors
// ==========================================================================

export class ProviderNotFoundError extends CliError {
  constructor(providerName: string, availableProviders: string[]) {
    super(
      `Unknown provider: ${providerName}. Available: ${availableProviders.join(', ')}`,
      'PROVIDER_NOT_FOUND',
      { providerName, availableProviders }
    );
  }
}

export class ApiKeyMissingError extends CliError {
  constructor(providerName: string, envVarName: string) {
    super(
      `API key missing for ${providerName}. Set ${envVarName} environment variable.`,
      'API_KEY_MISSING',
      { providerName, envVarName }
    );
  }
}

export class LlmRequestError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(
      `LLM request failed: ${message}`,
      'LLM_REQUEST_ERROR',
      { cause: options?.cause }
    );
  }
}

// ==========================================================================
// User Interaction Errors
// ==========================================================================

export class UserCancelledError extends CliError {
  constructor(operation: string) {
    super(
      `Operation cancelled by user: ${operation}`,
      'USER_CANCELLED',
      { operation }
    );
  }
}

export class SetupCancelledError extends UserCancelledError {
  constructor() {
    super('setup');
    this.code = 'SETUP_CANCELLED';
  }
}

// ==========================================================================
// Configuration Errors
// ==========================================================================

export class ConfigurationError extends CliError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      `Configuration error: ${message}`,
      'CONFIGURATION_ERROR',
      context
    );
  }
}

export class MissingDependencyError extends CliError {
  constructor(dependency: string, installCommand?: string) {
    super(
      `Missing dependency: ${dependency}${installCommand ? `. Install with: ${installCommand}` : ''}`,
      'MISSING_DEPENDENCY',
      { dependency, installCommand }
    );
  }
}

// ==========================================================================
// Execution Errors
// ==========================================================================

export class ExecutionError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(
      `Execution failed: ${message}`,
      'EXECUTION_ERROR',
      { cause: options?.cause }
    );
  }
}

export class TimeoutError extends CliError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      'TIMEOUT_ERROR',
      { operation, timeoutMs }
    );
  }
}

// ==========================================================================
// Error Utilities
// ==========================================================================

/**
 * Check if an error is a CliError
 */
export function isCliError(error: unknown): error is CliError {
  return error instanceof CliError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isCliError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Check if error should exit with specific code
 */
export function getExitCode(error: unknown): number {
  if (isCliError(error)) {
    switch (error.code) {
      case 'USER_CANCELLED':
      case 'SETUP_CANCELLED':
        return 0; // User choice, not an error
      case 'VALIDATION_ERROR':
      case 'INVALID_DAG':
        return 2; // Validation failure
      case 'FILE_NOT_FOUND':
      case 'DIRECTORY_NOT_FOUND':
        return 3; // File system error
      case 'API_KEY_MISSING':
      case 'CONFIGURATION_ERROR':
        return 4; // Configuration error
      default:
        return 1; // General error
    }
  }
  return 1; // General error for unknown types
}
