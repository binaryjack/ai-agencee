/**
 * Logger Service
 * Replaces direct console.log/console.error calls with structured logging
 * 
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Namespacing for different modules
 * - Test mode for unit testing
 * - Colored output with chalk
 * - Context objects for structured data
 * 
 * Phase 1.3: Foundation - Logger Service
 */

import chalk from 'chalk';
import type { LogEntry, LoggerOptions, LogLevel } from './types.js';
import { LogLevel as LogLevelEnum } from './types.js';

/**
 * Main logger class
 */
export class Logger {
  private static globalTestMode = false;
  private static globalTestLogs: LogEntry[] = [];
  
  private minLevel: LogLevel;
  private namespace?: string;
  private testMode: boolean;
  
  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevelEnum.INFO;
    this.namespace = options.namespace;
    this.testMode = options.testMode ?? Logger.globalTestMode;
  }
  
  /**
   * Log debug message (only shown when minLevel is DEBUG)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevelEnum.DEBUG, message, context);
  }
  
  /**
   * Log info message (default level)
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevelEnum.INFO, message, context);
  }
  
  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevelEnum.WARN, message, context);
  }
  
  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevelEnum.ERROR, message, context);
  }
  
  /**
   * Log success message (green checkmark)
   */
  success(message: string, context?: Record<string, unknown>): void {
    const formatted = chalk.green(`✅ ${message}`);
    this.log(LogLevelEnum.INFO, formatted, context);
  }
  
  /**
   * Create a child logger with a namespace
   */
  child(namespace: string): Logger {
    return new Logger({
      minLevel: this.minLevel,
      namespace: this.namespace ? `${this.namespace}:${namespace}` : namespace,
      testMode: this.testMode,
    });
  }
  
  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.minLevel) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      message: this.namespace ? `[${this.namespace}] ${message}` : message,
      timestamp: new Date(),
      namespace: this.namespace,
      context,
    };
    
    // Test mode: capture logs
    if (this.testMode || Logger.globalTestMode) {
      Logger.globalTestLogs.push(entry);
      return;
    }
    
    // Production mode: output to console
    this.output(entry);
  }
  
  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    const prefix = this.getPrefix(entry.level);
    const message = prefix ? `${prefix} ${entry.message}` : entry.message;
    
    switch (entry.level) {
      case LogLevelEnum.ERROR:
        console.error(message);
        break;
      case LogLevelEnum.WARN:
        console.warn(message);
        break;
      default:
        console.log(message);
    }
    
    // Output context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(chalk.dim(JSON.stringify(entry.context, null, 2)));
    }
  }
  
  /**
   * Get colored prefix for log level
   */
  private getPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevelEnum.DEBUG:
        return chalk.gray('[DEBUG]');
      case LogLevelEnum.INFO:
        return chalk.blue('[INFO]');
      case LogLevelEnum.WARN:
        return chalk.yellow('[WARN]');
      case LogLevelEnum.ERROR:
        return chalk.red('[ERROR]');
      default:
        return '';
    }
  }
  
  // ==========================================================================
  // Static test utilities
  // ==========================================================================
  
  /**
   * Enable test mode globally (all loggers capture instead of output)
   */
  static setTestMode(enabled: boolean): void {
    Logger.globalTestMode = enabled;
    if (!enabled) {
      Logger.globalTestLogs = [];
    }
  }
  
  /**
   * Get captured logs (when in test mode)
   */
  static getTestLogs(): LogEntry[] {
    return Logger.globalTestLogs;
  }
  
  /**
   * Clear captured test logs
   */
  static clearTestLogs(): void {
    Logger.globalTestLogs = [];
  }
  
  /**
   * Get logs by level
   */
  static getTestLogsByLevel(level: LogLevel): LogEntry[] {
    return Logger.globalTestLogs.filter(entry => entry.level === level);
  }
  
  /**
   * Check if a message was logged
   */
  static hasLogMessage(substring: string): boolean {
    return Logger.globalTestLogs.some(entry => entry.message.includes(substring));
  }
}

/**
 * Global default logger instance
 */
export const logger = new Logger();

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string, options: Omit<LoggerOptions, 'namespace'> = {}): Logger {
  return new Logger({ ...options, namespace });
}
