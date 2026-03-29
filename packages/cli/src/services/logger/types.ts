/**
 * Logger Type Definitions
 * 
 * Phase 1.3: Foundation - Logger Service
 */

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  namespace?: string;
  context?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  minLevel?: LogLevel;
  
  /** Namespace for this logger (e.g., 'setup', 'compose') */
  namespace?: string;
  
  /** Enable test mode (captures logs instead of outputting) */
  testMode?: boolean;
  
  /** Custom output function (defaults to console) */
  output?: (entry: LogEntry) => void;
}

/**
 * Logger transport interface
 */
export interface LoggerTransport {
  log(entry: LogEntry): void;
}
