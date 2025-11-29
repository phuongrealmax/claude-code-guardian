// src/core/logger.ts

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// ═══════════════════════════════════════════════════════════════
//                      LOG TYPES
// ═══════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file?: string;
  maxFileSize?: number;
  format?: 'json' | 'text' | 'pretty';
  colors?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      LOGGER CLASS
// ═══════════════════════════════════════════════════════════════

export class Logger {
  private config: LoggerConfig;
  private context?: string;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 100;

  private static levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  };

  private static levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    silent: '',
  };

  private static levelIcons: Record<LogLevel, string> = {
    debug: '[D]',
    info: '[I]',
    warn: '[W]',
    error: '[E]',
    silent: '',
  };

  constructor(levelOrConfig: LogLevel | LoggerConfig = 'info', context?: string) {
    if (typeof levelOrConfig === 'string') {
      this.config = {
        level: levelOrConfig,
        console: true,
        colors: true,
        format: 'pretty',
      };
    } else {
      this.config = {
        console: true,
        colors: true,
        format: 'pretty',
        ...levelOrConfig,
      };
    }

    this.context = context;

    // Ensure log directory exists
    if (this.config.file) {
      const dir = dirname(this.config.file);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    const childLogger = new Logger(this.config, childContext);
    return childLogger;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown): void {
    let data: unknown;
    let stack: string | undefined;

    if (error instanceof Error) {
      data = { message: error.message, name: error.name };
      stack = error.stack;
    } else {
      data = error;
    }

    this.log('error', message, data, stack);
  }

  /**
   * Log with timing
   */
  time(label: string): () => void {
    const start = Date.now();
    this.debug(`[${label}] Started`);

    return () => {
      const duration = Date.now() - start;
      this.debug(`[${label}] Completed in ${duration}ms`);
    };
  }

  /**
   * Log a group of related messages
   */
  group(label: string, fn: () => void): void {
    this.info(`-- ${label}`);
    fn();
    this.info(`-- ${label} complete`);
  }

  /**
   * Log a table (for debugging)
   */
  table(data: Record<string, unknown>[] | Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }

  /**
   * Get recent log entries
   */
  getBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private log(level: LogLevel, message: string, data?: unknown, stack?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      data,
      stack,
    };

    // Add to buffer
    this.addToBuffer(entry);

    // Output to console
    if (this.config.console) {
      this.outputToConsole(entry);
    }

    // Output to file
    if (this.config.file) {
      this.outputToFile(entry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levelPriority[level] >= Logger.levelPriority[this.config.level];
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const { format, colors } = this.config;

    if (format === 'json') {
      console.log(JSON.stringify(entry));
      return;
    }

    const timestamp = entry.timestamp.toISOString().slice(11, 23);
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const icon = Logger.levelIcons[entry.level];

    let output: string;

    if (format === 'pretty' && colors) {
      const color = Logger.levelColors[entry.level];
      const reset = '\x1b[0m';
      const gray = '\x1b[90m';

      output = `${gray}${timestamp}${reset} ${color}${icon} ${levelStr}${reset} ${contextStr} ${entry.message}`;
    } else {
      output = `${timestamp} ${icon} ${levelStr} ${contextStr} ${entry.message}`;
    }

    // Choose console method based on level
    switch (entry.level) {
      case 'error':
        console.error(output);
        if (entry.stack) console.error(entry.stack);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }

    // Log data if present
    if (entry.data !== undefined) {
      if (typeof entry.data === 'object') {
        console.log('  ', entry.data);
      } else {
        console.log(`   Data: ${entry.data}`);
      }
    }
  }

  private outputToFile(entry: LogEntry): void {
    if (!this.config.file) return;

    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    }) + '\n';

    try {
      appendFileSync(this.config.file, line);
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//                      SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let globalLogger: Logger | null = null;

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('info');
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

// ═══════════════════════════════════════════════════════════════
//                      UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a scoped logger for a module
 */
export function createModuleLogger(moduleName: string, level?: LogLevel): Logger {
  return new Logger(level || 'info', moduleName);
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * Truncate long strings for logging
 */
export function truncate(str: string, maxLength: number = 200): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
