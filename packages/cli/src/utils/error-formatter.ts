/**
 * Rich error formatting — Phase 1.5
 * 
 * Provides contextual, actionable error messages with:
 * - Error categories and codes
 * - Clear problem descriptions
 * - Suggested fixes
 * - Documentation links
 * - Pretty terminal formatting
 * 
 * Philosophy: "Errors should guide, not block"
 */

/**
 * ANSI color codes for terminal formatting
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const chalk = {
  red: (text: string) => `${COLORS.red}${text}${COLORS.reset}`,
  cyan: (text: string) => `${COLORS.cyan}${text}${COLORS.reset}`,
  blue: (text: string) => `${COLORS.blue}${text}${COLORS.reset}`,
  gray: (text: string) => `${COLORS.gray}${text}${COLORS.reset}`,
  bold: (text: string) => `${COLORS.bold}${text}${COLORS.reset}`,
};

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  CONFIG = 'CONFIG',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  RUNTIME = 'RUNTIME',
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
}

/**
 * Well-known error codes with context
 */
export interface ErrorCode {
  code: string;
  category: ErrorCategory;
  title: string;
  message: string;
  suggestions: string[];
  docsUrl?: string;
}

/**
 * Registry of known error patterns
 */
const ERROR_CODES: Record<string, ErrorCode> = {
  'MISSING_API_KEY': {
    code: 'E001',
    category: ErrorCategory.AUTH,
    title: 'Missing API Key',
    message: 'No API key found for the selected provider',
    suggestions: [
      'Add your API key to .env file',
      'For Anthropic: ANTHROPIC_API_KEY=your-key-here',
      'For OpenAI: OPENAI_API_KEY=your-key-here',
      'Get API keys from: https://console.anthropic.com or https://platform.openai.com',
      'Alternatively, run "ai-kit demo" to test with mock provider (free)',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee#api-keys',
  },
  'INVALID_DAG_JSON': {
    code: 'E002',
    category: ErrorCategory.VALIDATION,
    title: 'Invalid DAG JSON',
    message: 'DAG file contains invalid JSON syntax',
    suggestions: [
      'Check for missing commas, brackets, or quotes',
      'Use a JSON validator (e.g., jsonlint.com)',
      'Run "ai-kit check" to validate DAG structure',
      'View example DAGs in agents/examples/',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee#dag-format',
  },
  'DAG_FILE_NOT_FOUND': {
    code: 'E003',
    category: ErrorCategory.FILE_SYSTEM,
    title: 'DAG File Not Found',
    message: 'Could not locate the specified DAG file',
    suggestions: [
      'Check file path (relative to project root)',
      'Ensure file exists: agents/dag.json',
      'Run "ai-kit init" to scaffold project structure',
      'Run "ai-kit setup" for guided configuration',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee#getting-started',
  },
  'PROJECT_ROOT_NOT_FOUND': {
    code: 'E004',
    category: ErrorCategory.FILE_SYSTEM,
    title: 'Project Root Not Found',
    message: 'Could not detect project root directory',
    suggestions: [
      'Ensure you are in a valid project directory',
      'Project must contain agents/ or .agents/ directory',
      'Run "ai-kit init" to initialize project',
      'Or specify project root: --project /path/to/project',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee#project-structure',
  },
  'AGENT_FILE_NOT_FOUND': {
    code: 'E005',
    category: ErrorCategory.FILE_SYSTEM,
    title: 'Agent File Not Found',
    message: 'Referenced agent configuration file does not exist',
    suggestions: [
      'Check agentFile path in DAG (relative to agents/ directory)',
      'Ensure agent JSON file exists',
      'Run "ai-kit agent:list" to see available agents',
      'Create agent file or fix reference in DAG',
    ],
  },
  'INVALID_AGENT_CONFIG': {
    code: 'E006',
    category: ErrorCategory.VALIDATION,
    title: 'Invalid Agent Configuration',
    message: 'Agent configuration file is malformed or missing required fields',
    suggestions: [
      'Validate JSON syntax',
      'Ensure required fields: name, description, checks[]',
      'Check agent schema documentation',
      'View example agents in agents/examples/',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee/blob/main/schemas/agent.schema.json',
  },
  'BUDGET_EXCEEDED': {
    code: 'E007',
    category: ErrorCategory.RUNTIME,
    title: 'Budget Cap Exceeded',
    message: 'Execution stopped due to budget limit',
    suggestions: [
      'Increase budget cap: --budget 10',
      'Optimize DAG to reduce LLM calls',
      'Use more efficient model families (e.g., haiku instead of opus)',
      'Check agents for unnecessary LLM invocations',
    ],
  },
  'PROVIDER_ERROR': {
    code: 'E008',
    category: ErrorCategory.NETWORK,
    title: 'LLM Provider Error',
    message: 'Failed to communicate with LLM provider API',
    suggestions: [
      'Check internet connection',
      'Verify API key is valid (not expired)',
      'Check provider status page',
      'Retry in a few moments (may be rate limited)',
      'For testing, use "ai-kit demo" with mock provider',
    ],
  },
  'INVALID_MODEL_ROUTER': {
    code: 'E009',
    category: ErrorCategory.CONFIG,
    title: 'Invalid Model Router',
    message: 'Model router configuration is invalid or missing',
    suggestions: [
      'Check agents/model-router.json exists',
      'Validate JSON syntax',
      'Ensure at least one provider is configured',
      'Run "ai-kit doctor" to diagnose issues',
      'Run "ai-kit setup" to reconfigure',
    ],
  },
  'PERMISSION_DENIED': {
    code: 'E010',
    category: ErrorCategory.PERMISSION,
    title: 'Permission Denied',
    message: 'Insufficient permissions to perform operation',
    suggestions: [
      'Check file/directory permissions',
      'Run with appropriate user privileges',
      'Ensure write access to project directory',
    ],
  },
};

/**
 * Rich error context
 */
export interface RichError {
  category: ErrorCategory;
  code?: string;
  title: string;
  message: string;
  suggestions: string[];
  docsUrl?: string;
  cause?: Error | unknown;
  context?: Record<string, any>;
}

/**
 * Create a rich error from a known error code
 */
export function createError(
  errorCodeKey: keyof typeof ERROR_CODES,
  additionalContext?: Record<string, any>
): RichError {
  const errorDef = ERROR_CODES[errorCodeKey];
  return {
    category: errorDef.category,
    code: errorDef.code,
    title: errorDef.title,
    message: errorDef.message,
    suggestions: errorDef.suggestions,
    docsUrl: errorDef.docsUrl,
    context: additionalContext,
  };
}

/**
 * Create a rich error from an unknown/generic error
 */
export function enrichError(
  err: Error | unknown,
  category: ErrorCategory = ErrorCategory.RUNTIME,
  suggestions: string[] = []
): RichError {
  const errMsg = err instanceof Error ? err.message : String(err);
  
  // Try to match known error patterns
  if (errMsg.includes('ENOENT') || errMsg.includes('not found')) {
    if (errMsg.includes('dag.json') || errMsg.includes('.dag.json')) {
      return { ...createError('DAG_FILE_NOT_FOUND'), cause: err };
    }
    if (errMsg.includes('agent') || errMsg.includes('.json')) {
      return { ...createError('AGENT_FILE_NOT_FOUND'), cause: err };
    }
    return {
      category: ErrorCategory.FILE_SYSTEM,
      code: 'E003',
      title: 'File Not Found',
      message: errMsg,
      suggestions: [
        'Check file path and ensure file exists',
        'Verify file name spelling',
        'Check file permissions',
      ],
      cause: err,
    };
  }

  if (errMsg.includes('Unexpected token') || errMsg.includes('JSON')) {
    return { ...createError('INVALID_DAG_JSON'), cause: err };
  }

  if (errMsg.includes('API key') || errMsg.includes('authentication')) {
    return { ...createError('MISSING_API_KEY'), cause: err };
  }

  if (errMsg.includes('Project root not found')) {
    return { ...createError('PROJECT_ROOT_NOT_FOUND'), cause: err };
  }

  if (errMsg.includes('budget') || errMsg.includes('Budget')) {
    return { ...createError('BUDGET_EXCEEDED'), cause: err };
  }

  if (errMsg.includes('EACCES') || errMsg.includes('permission')) {
    return { ...createError('PERMISSION_DENIED'), cause: err };
  }

  // Generic error
  return {
    category,
    title: 'Error',
    message: errMsg,
    suggestions: suggestions.length > 0 ? suggestions : [
      'Check error message for details',
      'Run "ai-kit doctor" to diagnose issues',
      'See documentation for troubleshooting',
    ],
    docsUrl: 'https://github.com/binaryjack/ai-agencee#troubleshooting',
    cause: err,
  };
}

/**
 * Format a rich error for terminal display
 */
export function formatError(error: RichError, options: { verbose?: boolean } = {}): string {
  const lines: string[] = [];

  // Header with error code
  const codePrefix = error.code ? `[${error.code}] ` : '';
  lines.push('');
  lines.push(chalk.red(`╔${'═'.repeat(58)}╗`));
  lines.push(chalk.red(`║  ❌  ${codePrefix}${error.title.padEnd(58 - codePrefix.length - 6)}║`));
  lines.push(chalk.red(`╚${'═'.repeat(58)}╝`));
  lines.push('');

  // Error message
  lines.push(chalk.bold('Problem:'));
  lines.push(`  ${error.message}`);
  lines.push('');

  // Context (if provided)
  if (error.context && Object.keys(error.context).length > 0) {
    lines.push(chalk.bold('Context:'));
    for (const [key, value] of Object.entries(error.context)) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push('');
  }

  // Suggestions
  if (error.suggestions.length > 0) {
    lines.push(chalk.bold('Suggestions:'));
    error.suggestions.forEach((suggestion, i) => {
      lines.push(chalk.cyan(`  ${i + 1}. ${suggestion}`));
    });
    lines.push('');
  }

  // Documentation link
  if (error.docsUrl) {
    lines.push(chalk.bold('Documentation:'));
    lines.push(chalk.blue(`  📚 ${error.docsUrl}`));
    lines.push('');
  }

  // Verbose: show cause stack trace
  if (options.verbose && error.cause instanceof Error && error.cause.stack) {
    lines.push(chalk.bold('Stack Trace:'));
    lines.push(chalk.gray(error.cause.stack));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Print a rich error to console and exit
 */
export function exitWithError(error: RichError, options: { verbose?: boolean; exitCode?: number } = {}): never {
  console.error(formatError(error, options));
  process.exit(options.exitCode ?? 1);
}

/**
 * Convenience function to handle unknown errors
 */
export function handleError(
  err: Error | unknown,
  options: {
    category?: ErrorCategory;
    suggestions?: string[];
    verbose?: boolean;
    exitCode?: number;
  } = {}
): never {
  const richError = enrichError(err, options.category, options.suggestions);
  exitWithError(richError, { verbose: options.verbose, exitCode: options.exitCode });
}

/**
 * Wrap async function with rich error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    category?: ErrorCategory;
    suggestions?: string[];
    verbose?: boolean;
  } = {}
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      handleError(err, options);
    }
  }) as T;
}
