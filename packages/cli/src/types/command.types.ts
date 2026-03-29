/**
 * CLI Command Type Definitions
 * 
 * Phase 1.4: Foundation - Core Types
 */

/**
 * Common command options shared across all commands
 */
export interface BaseCommandOptions {
  /** Enable verbose output */
  verbose?: boolean;
  
  /** Skip confirmation prompts */
  yes?: boolean;
  
  /** Output format (json, text, etc.) */
  format?: 'json' | 'text' | 'yaml';
}

/**
 * Compose command options
 */
export interface ComposeOptions extends BaseCommandOptions {
  /** Natural language description of workflow */
  description: string;
  
  /** Output file path */
  output?: string;
  
  /** LLM provider to use */
  provider?: string;
  
  /** Path to model router config */
  modelRouterConfig?: string;
  
  /** Skip approval prompt */
  skipApproval?: boolean;
}

/**
 * Setup command options
 */
export interface SetupOptions extends BaseCommandOptions {
  /** LLM provider */
  provider?: string;
  
  /** Use case template */
  useCase?: string;
  
  /** Force overwrite existing files */
  force?: boolean;
}

/**
 * Demo command options
 */
export interface DemoOptions extends BaseCommandOptions {
  /** Demo scenario to run */
  scenario?: string;
  
  /** Enable interactive mode */
  interactive?: boolean;
}

/**
 * Template command options
 */
export interface TemplateOptions extends BaseCommandOptions {
  /** Template ID */
  templateId?: string;
  
  /** Output directory */
  output?: string;
  
  /** Target directory for template installation */
  dir?: string;
  
  /** Custom name for the template */
  name?: string;
  
  /** Force overwrite existing files without prompting */
  force?: boolean;
}

/**
 * Code command options (search, index, etc.)
 */
export interface CodeOptions extends BaseCommandOptions {
  /** Search query */
  query?: string;
  
  /** Search limit */
  limit?: number;
  
  /** Embedding provider */
  provider?: 'openai' | 'ollama';
  
  /** Incremental mode */
  incremental?: boolean;
}
