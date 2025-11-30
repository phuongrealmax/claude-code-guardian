// src/core/index.ts

export * from './types.js';
export * from './event-bus.js';
// Logger - explicit exports to avoid truncate conflict with string-utils
export {
  Logger,
  LogLevel,
  LogEntry,
  LoggerConfig,
  getGlobalLogger,
  setGlobalLogger,
  createModuleLogger,
  formatError,
} from './logger.js';
export * from './config-manager.js';
export * from './state-manager.js';

// Utils (includes truncate from string-utils)
export * from './utils/index.js';
