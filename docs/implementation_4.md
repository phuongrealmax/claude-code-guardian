## CORE INFRASTRUCTURE IMPLEMENTATION

---

### 1. CORE ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  EventBus   │  │   Logger    │  │   Config    │             │
│  │             │  │             │  │   Manager   │             │
│  │ • emit()    │  │ • info()    │  │             │             │
│  │ • on()      │  │ • warn()    │  │ • load()    │             │
│  │ • off()     │  │ • error()   │  │ • get()     │             │
│  │ • once()    │  │ • debug()   │  │ • set()     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │    State    │                               │
│                   │   Manager   │                               │
│                   │             │                               │
│                   │ • session   │                               │
│                   │ • tasks     │                               │
│                   │ • memory    │                               │
│                   └─────────────┘                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     UTILITIES                               ││
│  │  • TokenEstimator  • CodeAnalyzer  • FileUtils  • PortUtils ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. EVENT BUS

```typescript
// src/core/event-bus.ts

import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════
//                      EVENT TYPES
// ═══════════════════════════════════════════════════════════════

export type CCGEventType = 
  // Session events
  | 'session:start'
  | 'session:end'
  | 'session:pause'
  | 'session:resume'
  // Task events
  | 'task:create'
  | 'task:start'
  | 'task:progress'
  | 'task:complete'
  | 'task:fail'
  | 'task:pause'
  // Guard events
  | 'guard:warning'
  | 'guard:block'
  | 'guard:pass'
  // Resource events
  | 'resource:warning'
  | 'resource:critical'
  | 'resource:checkpoint'
  // Test events
  | 'test:start'
  | 'test:complete'
  | 'test:fail'
  // Memory events
  | 'memory:store'
  | 'memory:recall'
  | 'memory:forget'
  // Process events
  | 'process:spawn'
  | 'process:kill'
  | 'process:port-conflict'
  // Document events
  | 'document:create'
  | 'document:update'
  | 'document:register';

export interface CCGEvent<T = unknown> {
  type: CCGEventType;
  timestamp: Date;
  data?: T;
  source?: string;
  sessionId?: string;
}

export type EventHandler<T = unknown> = (event: CCGEvent<T>) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  eventType: CCGEventType | '*';
  handler: EventHandler;
  once: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      EVENT BUS CLASS
// ═══════════════════════════════════════════════════════════════

export class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: CCGEvent[] = [];
  private maxHistorySize: number = 1000;
  private subscriptionCounter: number = 0;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Allow many listeners
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = unknown>(event: CCGEvent<T>): void {
    // Ensure timestamp
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Add to history
    this.addToHistory(event);

    // Emit to specific type listeners
    this.emitter.emit(event.type, event);

    // Emit to wildcard listeners
    this.emitter.emit('*', event);
  }

  /**
   * Subscribe to events of a specific type
   */
  on<T = unknown>(eventType: CCGEventType | '*', handler: EventHandler<T>): string {
    const id = this.generateSubscriptionId();
    
    const subscription: EventSubscription = {
      id,
      eventType,
      handler: handler as EventHandler,
      once: false,
    };

    this.subscriptions.set(id, subscription);
    this.emitter.on(eventType, handler);

    return id;
  }

  /**
   * Subscribe to a single occurrence of an event
   */
  once<T = unknown>(eventType: CCGEventType | '*', handler: EventHandler<T>): string {
    const id = this.generateSubscriptionId();
    
    const wrappedHandler = (event: CCGEvent<T>) => {
      handler(event);
      this.off(id);
    };

    const subscription: EventSubscription = {
      id,
      eventType,
      handler: wrappedHandler as EventHandler,
      once: true,
    };

    this.subscriptions.set(id, subscription);
    this.emitter.once(eventType, wrappedHandler);

    return id;
  }

  /**
   * Unsubscribe from events
   */
  off(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return false;
    }

    this.emitter.off(subscription.eventType, subscription.handler);
    this.subscriptions.delete(subscriptionId);
    
    return true;
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListeners(eventType?: CCGEventType): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
      
      // Clean up subscriptions map
      for (const [id, sub] of this.subscriptions.entries()) {
        if (sub.eventType === eventType) {
          this.subscriptions.delete(id);
        }
      }
    } else {
      this.emitter.removeAllListeners();
      this.subscriptions.clear();
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    eventType?: CCGEventType;
    since?: Date;
    limit?: number;
  }): CCGEvent[] {
    let events = [...this.eventHistory];

    if (filter?.eventType) {
      events = events.filter(e => e.type === filter.eventType);
    }

    if (filter?.since) {
      events = events.filter(e => e.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(eventType?: CCGEventType): number {
    if (eventType) {
      return this.emitter.listenerCount(eventType);
    }
    
    return this.subscriptions.size;
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  waitFor<T = unknown>(
    eventType: CCGEventType,
    timeout?: number,
    predicate?: (event: CCGEvent<T>) => boolean
  ): Promise<CCGEvent<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (event: CCGEvent<T>) => {
        if (!predicate || predicate(event)) {
          if (timeoutId) clearTimeout(timeoutId);
          this.emitter.off(eventType, handler);
          resolve(event);
        }
      };

      this.emitter.on(eventType, handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.emitter.off(eventType, handler);
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }

  /**
   * Create a typed event emitter helper
   */
  createTypedEmitter<T>(eventType: CCGEventType) {
    return {
      emit: (data: T, source?: string) => {
        this.emit<T>({
          type: eventType,
          timestamp: new Date(),
          data,
          source,
        });
      },
      on: (handler: EventHandler<T>) => this.on(eventType, handler),
      once: (handler: EventHandler<T>) => this.once(eventType, handler),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private generateSubscriptionId(): string {
    return `sub_${++this.subscriptionCounter}_${Date.now()}`;
  }

  private addToHistory(event: CCGEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//                      SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let globalEventBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function resetGlobalEventBus(): void {
  if (globalEventBus) {
    globalEventBus.removeAllListeners();
    globalEventBus.clearHistory();
  }
  globalEventBus = null;
}
```

---

### 3. LOGGER

```typescript
// src/core/logger.ts

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

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
    debug: '🔍',
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
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
    this.info(`┌─ ${label}`);
    fn();
    this.info(`└─ ${label} complete`);
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
```

---

### 4. CONFIG MANAGER

```typescript
// src/core/config-manager.ts

import { readFileSync, writeFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import { CCGConfig, ModulesConfig } from './types.js';
import { Logger } from './logger.js';
import { EventBus } from './event-bus.js';

// ═══════════════════════════════════════════════════════════════
//                      DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG: CCGConfig = {
  version: '1.0.0',
  project: {
    name: '',
    type: 'typescript-node',
    root: '.',
  },
  modules: {
    memory: {
      enabled: true,
      maxItems: 100,
      autoSave: true,
      persistPath: '.ccg/memory.db',
      compressionEnabled: true,
    },
    guard: {
      enabled: true,
      strictMode: true,
      rules: {
        blockFakeTests: true,
        blockDisabledFeatures: true,
        blockEmptyCatch: true,
        blockEmojiInCode: true,
        blockSwallowedExceptions: true,
      },
    },
    process: {
      enabled: true,
      ports: {
        dev: 3000,
        api: 8080,
        test: 9000,
      },
      autoKillOnConflict: true,
      trackSpawnedProcesses: true,
    },
    resource: {
      enabled: true,
      checkpoints: {
        auto: true,
        thresholds: [50, 70, 85, 95],
        maxCheckpoints: 10,
        compressOld: true,
      },
      warningThreshold: 70,
      pauseThreshold: 95,
    },
    testing: {
      enabled: true,
      autoRun: false,
      testCommand: 'npm test',
      browser: {
        enabled: true,
        headless: true,
        captureConsole: true,
        captureNetwork: true,
        screenshotOnError: true,
      },
      cleanup: {
        autoCleanTestData: true,
        testDataPrefix: 'test_',
        testDataLocations: ['tmp', 'test-data', '.test'],
      },
    },
    documents: {
      enabled: true,
      locations: {
        readme: 'README.md',
        docs: 'docs',
        api: 'docs/api',
        specs: 'docs/specs',
      },
      updateInsteadOfCreate: true,
      namingConvention: 'kebab-case',
    },
    workflow: {
      enabled: true,
      autoTrackTasks: true,
      requireTaskForLargeChanges: false,
      largeChangeThreshold: 100,
    },
  },
  notifications: {
    showInline: true,
    showStatusBar: true,
    verbosity: 'normal',
    sound: {
      enabled: false,
      criticalOnly: true,
    },
  },
  conventions: {
    fileNaming: 'kebab-case',
    variableNaming: 'camelCase',
    componentNaming: 'PascalCase',
    noEmoji: true,
    noUnicode: true,
  },
};

// ═══════════════════════════════════════════════════════════════
//                      CONFIG MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class ConfigManager {
  private config: CCGConfig;
  private configPath: string;
  private logger: Logger;
  private eventBus?: EventBus;
  private watchers: Set<string> = new Set();
  private changeCallbacks: Set<(config: CCGConfig) => void> = new Set();

  constructor(
    projectRoot: string = process.cwd(),
    logger?: Logger,
    eventBus?: EventBus
  ) {
    this.configPath = join(projectRoot, '.ccg', 'config.json');
    this.config = { ...DEFAULT_CONFIG };
    this.logger = logger || new Logger('info', 'ConfigManager');
    this.eventBus = eventBus;
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<CCGConfig> {
    if (!existsSync(this.configPath)) {
      this.logger.info('No config file found, using defaults');
      return this.config;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const fileConfig = JSON.parse(content);

      // Deep merge with defaults
      this.config = this.deepMerge(DEFAULT_CONFIG, fileConfig);

      this.logger.info('Configuration loaded successfully');
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load config, using defaults', error);
      return this.config;
    }
  }

  /**
   * Save configuration to file
   */
  async save(): Promise<void> {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );

      this.logger.info('Configuration saved');
    } catch (error) {
      this.logger.error('Failed to save config', error);
      throw error;
    }
  }

  /**
   * Get entire configuration
   */
  getAll(): CCGConfig {
    return { ...this.config };
  }

  /**
   * Get configuration value by path
   */
  get<T = unknown>(path: string): T | undefined {
    const parts = path.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as T;
  }

  /**
   * Set configuration value by path
   */
  set<T>(path: string, value: T): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];
    current[lastPart] = value;

    // Notify listeners
    this.notifyChange();

    this.logger.debug(`Config updated: ${path}`, { oldValue, newValue: value });
  }

  /**
   * Get module configuration
   */
  getModuleConfig<K extends keyof ModulesConfig>(moduleName: K): ModulesConfig[K] {
    return this.config.modules[moduleName];
  }

  /**
   * Check if a module is enabled
   */
  isModuleEnabled(moduleName: keyof ModulesConfig): boolean {
    const moduleConfig = this.config.modules[moduleName];
    return moduleConfig?.enabled ?? false;
  }

  /**
   * Enable/disable a module
   */
  setModuleEnabled(moduleName: keyof ModulesConfig, enabled: boolean): void {
    if (this.config.modules[moduleName]) {
      (this.config.modules[moduleName] as { enabled: boolean }).enabled = enabled;
      this.notifyChange();
    }
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: (config: CCGConfig) => void): () => void {
    this.changeCallbacks.add(callback);

    // Set up file watcher if not already watching
    if (this.watchers.size === 0 && existsSync(this.configPath)) {
      watchFile(this.configPath, { interval: 1000 }, () => {
        this.logger.debug('Config file changed, reloading');
        this.load().then(() => this.notifyChange());
      });
      this.watchers.add(this.configPath);
    }

    // Return unsubscribe function
    return () => {
      this.changeCallbacks.delete(callback);
      
      if (this.changeCallbacks.size === 0 && this.watchers.has(this.configPath)) {
        unwatchFile(this.configPath);
        this.watchers.delete(this.configPath);
      }
    };
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!this.config.version) {
      errors.push('Missing version');
    }

    // Validate module configs
    for (const [name, moduleConfig] of Object.entries(this.config.modules)) {
      if (typeof moduleConfig.enabled !== 'boolean') {
        errors.push(`Module ${name}: missing 'enabled' field`);
      }
    }

    // Validate resource thresholds
    if (this.config.modules.resource.warningThreshold >= this.config.modules.resource.pauseThreshold) {
      errors.push('Warning threshold must be less than pause threshold');
    }

    // Validate checkpoint thresholds are sorted
    const thresholds = this.config.modules.resource.checkpoints.thresholds;
    for (let i = 1; i < thresholds.length; i++) {
      if (thresholds[i] <= thresholds[i - 1]) {
        errors.push('Checkpoint thresholds must be in ascending order');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.notifyChange();
    this.logger.info('Configuration reset to defaults');
  }

  /**
   * Export configuration as JSON string
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  import(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString);
      this.config = this.deepMerge(DEFAULT_CONFIG, imported);
      this.notifyChange();
      this.logger.info('Configuration imported');
    } catch (error) {
      this.logger.error('Failed to import config', error);
      throw new Error('Invalid configuration JSON');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as object,
          sourceValue as object
        ) as T[keyof T];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[keyof T];
      }
    }

    return result;
  }

  private notifyChange(): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(this.config);
      } catch (error) {
        this.logger.error('Config change callback error', error);
      }
    }

    // Emit event if event bus available
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'session:resume', // Using existing type, could add config:change
        timestamp: new Date(),
        data: { config: this.config },
        source: 'ConfigManager',
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//                      CONFIG SCHEMA (for validation)
// ═══════════════════════════════════════════════════════════════

export const CONFIG_SCHEMA = {
  type: 'object',
  required: ['version', 'modules'],
  properties: {
    version: { type: 'string' },
    project: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['typescript-react', 'typescript-node', 'javascript', 'python', 'other'] },
        root: { type: 'string' },
      },
    },
    modules: {
      type: 'object',
      properties: {
        memory: { type: 'object', required: ['enabled'] },
        guard: { type: 'object', required: ['enabled'] },
        process: { type: 'object', required: ['enabled'] },
        resource: { type: 'object', required: ['enabled'] },
        testing: { type: 'object', required: ['enabled'] },
        documents: { type: 'object', required: ['enabled'] },
        workflow: { type: 'object', required: ['enabled'] },
      },
    },
  },
};
```

---

### 5. STATE MANAGER

```typescript
// src/core/state-manager.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuid } from 'uuid';
import { Logger } from './logger.js';
import { EventBus } from './event-bus.js';

// ═══════════════════════════════════════════════════════════════
//                      STATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface Session {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  projectPath: string;
  status: SessionStatus;
  tokenUsage: TokenUsage;
  currentTaskId?: string;
  metadata: Record<string, unknown>;
}

export type SessionStatus = 'active' | 'paused' | 'ended';

export interface TokenUsage {
  used: number;
  estimated: number;
  percentage: number;
  lastUpdated: Date;
}

export interface GlobalState {
  session?: Session;
  lastSessionId?: string;
  installId: string;
  firstRun: boolean;
  stats: SessionStats;
}

export interface SessionStats {
  totalSessions: number;
  totalTasksCompleted: number;
  totalFilesModified: number;
  totalTestsRun: number;
  totalGuardBlocks: number;
  totalCheckpoints: number;
}

// ═══════════════════════════════════════════════════════════════
//                      STATE MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class StateManager {
  private state: GlobalState;
  private statePath: string;
  private logger: Logger;
  private eventBus?: EventBus;
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(
    projectRoot: string = process.cwd(),
    logger?: Logger,
    eventBus?: EventBus
  ) {
    this.statePath = join(projectRoot, '.ccg', 'state.json');
    this.logger = logger || new Logger('info', 'StateManager');
    this.eventBus = eventBus;

    // Initialize with defaults
    this.state = this.getDefaultState();

    // Load existing state
    this.load();

    // Start auto-save
    this.startAutoSave();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new session
   */
  createSession(projectPath?: string): Session {
    const session: Session = {
      id: uuid(),
      startedAt: new Date(),
      projectPath: projectPath || process.cwd(),
      status: 'active',
      tokenUsage: {
        used: 0,
        estimated: 200000,
        percentage: 0,
        lastUpdated: new Date(),
      },
      metadata: {},
    };

    this.state.session = session;
    this.state.lastSessionId = session.id;
    this.state.stats.totalSessions++;

    // Mark first run as done
    if (this.state.firstRun) {
      this.state.firstRun = false;
    }

    this.save();
    this.logger.info(`Session created: ${session.id}`);

    return session;
  }

  /**
   * Set session data
   */
  setSession(sessionData: Partial<Session>): void {
    if (!this.state.session) {
      this.createSession(sessionData.projectPath);
    }

    this.state.session = {
      ...this.state.session!,
      ...sessionData,
    };

    this.save();
  }

  /**
   * Get current session
   */
  getSession(): Session | undefined {
    return this.state.session;
  }

  /**
   * End current session
   */
  endSession(): Session | undefined {
    if (!this.state.session) {
      return undefined;
    }

    this.state.session.status = 'ended';
    this.state.session.endedAt = new Date();

    const session = { ...this.state.session };

    // Keep reference but clear current
    this.state.lastSessionId = session.id;
    this.state.session = undefined;

    this.save();
    this.logger.info(`Session ended: ${session.id}`);

    return session;
  }

  /**
   * Pause current session
   */
  pauseSession(): void {
    if (this.state.session) {
      this.state.session.status = 'paused';
      this.save();
    }
  }

  /**
   * Resume current session
   */
  resumeSession(): void {
    if (this.state.session && this.state.session.status === 'paused') {
      this.state.session.status = 'active';
      this.save();
    }
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.state.session?.status === 'active';
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update token usage
   */
  updateTokenUsage(used: number, estimated?: number): TokenUsage | undefined {
    if (!this.state.session) {
      return undefined;
    }

    this.state.session.tokenUsage.used = used;
    if (estimated !== undefined) {
      this.state.session.tokenUsage.estimated = estimated;
    }
    this.state.session.tokenUsage.percentage = Math.round(
      (used / this.state.session.tokenUsage.estimated) * 100
    );
    this.state.session.tokenUsage.lastUpdated = new Date();

    // Don't save on every token update (too frequent)
    // Will be saved by auto-save

    return this.state.session.tokenUsage;
  }

  /**
   * Get token usage
   */
  getTokenUsage(): TokenUsage | undefined {
    return this.state.session?.tokenUsage;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TASK TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set current task
   */
  setCurrentTask(taskId: string | undefined): void {
    if (this.state.session) {
      this.state.session.currentTaskId = taskId;
      this.save();
    }
  }

  /**
   * Get current task ID
   */
  getCurrentTaskId(): string | undefined {
    return this.state.session?.currentTaskId;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Increment a stat counter
   */
  incrementStat(stat: keyof SessionStats, amount: number = 1): void {
    this.state.stats[stat] += amount;
  }

  /**
   * Get all stats
   */
  getStats(): SessionStats {
    return { ...this.state.stats };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.state.stats = this.getDefaultStats();
    this.save();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      METADATA
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set session metadata
   */
  setMetadata(key: string, value: unknown): void {
    if (this.state.session) {
      this.state.session.metadata[key] = value;
    }
  }

  /**
   * Get session metadata
   */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.state.session?.metadata[key] as T | undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      GLOBAL STATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get install ID (unique per installation)
   */
  getInstallId(): string {
    return this.state.installId;
  }

  /**
   * Check if first run
   */
  isFirstRun(): boolean {
    return this.state.firstRun;
  }

  /**
   * Get last session ID
   */
  getLastSessionId(): string | undefined {
    return this.state.lastSessionId;
  }

  /**
   * Get entire state (for debugging)
   */
  getFullState(): GlobalState {
    return { ...this.state };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load state from file
   */
  load(): void {
    if (!existsSync(this.statePath)) {
      this.logger.debug('No state file found, using defaults');
      return;
    }

    try {
      const content = readFileSync(this.statePath, 'utf-8');
      const loaded = JSON.parse(content);

      // Merge with defaults to handle new fields
      this.state = {
        ...this.getDefaultState(),
        ...loaded,
        stats: {
          ...this.getDefaultStats(),
          ...(loaded.stats || {}),
        },
      };

      // Convert date strings back to Date objects
      if (this.state.session) {
        this.state.session.startedAt = new Date(this.state.session.startedAt);
        if (this.state.session.endedAt) {
          this.state.session.endedAt = new Date(this.state.session.endedAt);
        }
        this.state.session.tokenUsage.lastUpdated = new Date(
          this.state.session.tokenUsage.lastUpdated
        );
      }

      this.logger.debug('State loaded');
    } catch (error) {
      this.logger.error('Failed to load state', error);
    }
  }

  /**
   * Save state to file
   */
  save(): void {
    try {
      const dir = dirname(this.statePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
      this.logger.debug('State saved');
    } catch (error) {
      this.logger.error('Failed to save state', error);
    }
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    const installId = this.state.installId; // Keep install ID
    this.state = {
      ...this.getDefaultState(),
      installId,
      firstRun: false,
    };
    this.save();
    this.logger.info('State reset');
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.save();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private getDefaultState(): GlobalState {
    return {
      installId: uuid(),
      firstRun: true,
      stats: this.getDefaultStats(),
    };
  }

  private getDefaultStats(): SessionStats {
    return {
      totalSessions: 0,
      totalTasksCompleted: 0,
      totalFilesModified: 0,
      totalTestsRun: 0,
      totalGuardBlocks: 0,
      totalCheckpoints: 0,
    };
  }

  private startAutoSave(): void {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.state.session) {
        this.save();
      }
    }, 30000);
  }
}

// ═══════════════════════════════════════════════════════════════
//                      SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let globalStateManager: StateManager | null = null;

export function getGlobalStateManager(projectRoot?: string): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager(projectRoot);
  }
  return globalStateManager;
}

export function resetGlobalStateManager(): void {
  if (globalStateManager) {
    globalStateManager.dispose();
  }
  globalStateManager = null;
}
```

---

### 6. CORE TYPES (EXPANDED)

```typescript
// src/core/types.ts

// ═══════════════════════════════════════════════════════════════
//                      CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface CCGConfig {
  version: string;
  project: ProjectConfig;
  modules: ModulesConfig;
  notifications: NotificationConfig;
  conventions: ConventionsConfig;
}

export interface ProjectConfig {
  name: string;
  type: ProjectType;
  root: string;
}

export type ProjectType = 
  | 'typescript-react' 
  | 'typescript-node' 
  | 'javascript' 
  | 'python' 
  | 'other';

// ═══════════════════════════════════════════════════════════════
//                      MODULE CONFIGS
// ═══════════════════════════════════════════════════════════════

export interface ModulesConfig {
  memory: MemoryModuleConfig;
  guard: GuardModuleConfig;
  process: ProcessModuleConfig;
  resource: ResourceModuleConfig;
  testing: TestingModuleConfig;
  documents: DocumentsModuleConfig;
  workflow: WorkflowModuleConfig;
}

export interface MemoryModuleConfig {
  enabled: boolean;
  maxItems: number;
  autoSave: boolean;
  persistPath: string;
  compressionEnabled: boolean;
}

export interface GuardModuleConfig {
  enabled: boolean;
  strictMode: boolean;
  rules: GuardRules;
}

export interface GuardRules {
  blockFakeTests: boolean;
  blockDisabledFeatures: boolean;
  blockEmptyCatch: boolean;
  blockEmojiInCode: boolean;
  blockSwallowedExceptions: boolean;
  customRules?: CustomRule[];
}

export interface CustomRule {
  name: string;
  pattern: string;
  message: string;
  severity: 'warning' | 'error' | 'block';
}

export interface ProcessModuleConfig {
  enabled: boolean;
  ports: Record<string, number>;
  autoKillOnConflict: boolean;
  trackSpawnedProcesses: boolean;
}

export interface ResourceModuleConfig {
  enabled: boolean;
  checkpoints: CheckpointConfig;
  warningThreshold: number;
  pauseThreshold: number;
}

export interface CheckpointConfig {
  auto: boolean;
  thresholds: number[];
  maxCheckpoints: number;
  compressOld: boolean;
}

export interface TestingModuleConfig {
  enabled: boolean;
  autoRun: boolean;
  testCommand: string;
  browser: BrowserTestConfig;
  cleanup: TestCleanupConfig;
}

export interface BrowserTestConfig {
  enabled: boolean;
  headless: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
  screenshotOnError: boolean;
}

export interface TestCleanupConfig {
  autoCleanTestData: boolean;
  testDataPrefix: string;
  testDataLocations: string[];
}

export interface DocumentsModuleConfig {
  enabled: boolean;
  locations: Record<string, string>;
  updateInsteadOfCreate: boolean;
  namingConvention: string;
}

export interface WorkflowModuleConfig {
  enabled: boolean;
  autoTrackTasks: boolean;
  requireTaskForLargeChanges: boolean;
  largeChangeThreshold: number;
}

// ═══════════════════════════════════════════════════════════════
//                      NOTIFICATION CONFIG
// ═══════════════════════════════════════════════════════════════

export interface NotificationConfig {
  showInline: boolean;
  showStatusBar: boolean;
  verbosity: 'minimal' | 'normal' | 'verbose';
  sound: SoundConfig;
}

export interface SoundConfig {
  enabled: boolean;
  criticalOnly: boolean;
}

// ═══════════════════════════════════════════════════════════════
//                      CONVENTIONS CONFIG
// ═══════════════════════════════════════════════════════════════

export interface ConventionsConfig {
  fileNaming: NamingConvention;
  variableNaming: NamingConvention;
  componentNaming: NamingConvention;
  noEmoji: boolean;
  noUnicode: boolean;
}

export type NamingConvention = 
  | 'camelCase' 
  | 'PascalCase' 
  | 'snake_case' 
  | 'kebab-case'
  | 'SCREAMING_SNAKE_CASE';

// ═══════════════════════════════════════════════════════════════
//                      RE-EXPORTS from modules
// ═══════════════════════════════════════════════════════════════

// These would typically be imported from module files
// Keeping them here for reference and type consistency

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  tags: string[];
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
  metadata?: Record<string, unknown>;
}

export type MemoryType = 
  | 'decision' 
  | 'fact' 
  | 'code_pattern' 
  | 'error' 
  | 'note'
  | 'convention'
  | 'architecture';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentId?: string;
  subtasks: string[];
  estimatedTokens?: number;
  actualTokens?: number;
  checkpoints: string[];
  notes: TaskNote[];
  filesAffected: string[];
  blockedBy?: string[];
  tags: string[];
}

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'paused' 
  | 'blocked'
  | 'completed' 
  | 'failed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskNote {
  id: string;
  content: string;
  type: 'note' | 'decision' | 'blocker' | 'idea';
  createdAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  blocked: boolean;
  suggestions: string[];
}

export interface ValidationIssue {
  rule: string;
  severity: 'info' | 'warning' | 'error' | 'block';
  message: string;
  location?: CodeLocation;
  suggestion?: string;
  autoFixable: boolean;
}

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  snippet?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  port?: number;
  command: string;
  startedAt: Date;
  status: ProcessStatus;
  spawnedBy: 'ccg' | 'user' | 'unknown';
}

export type ProcessStatus = 'running' | 'stopped' | 'zombie';

export interface PortStatus {
  port: number;
  available: boolean;
  usedBy?: ProcessInfo;
}

export interface Document {
  id: string;
  path: string;
  name: string;
  type: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  hash: string;
  size: number;
  description?: string;
  tags: string[];
  linkedFiles: string[];
}

export type DocumentType = 
  | 'readme' 
  | 'spec' 
  | 'api' 
  | 'guide' 
  | 'changelog'
  | 'architecture'
  | 'config'
  | 'other';

export interface Checkpoint {
  id: string;
  taskId?: string;
  name: string;
  createdAt: Date;
  reason: CheckpointReason;
  tokenUsage: number;
  memorySnapshot: MemorySnapshot;
  taskSnapshot?: Task;
  metadata: Record<string, unknown>;
}

export type CheckpointReason = 
  | 'auto_threshold' 
  | 'manual' 
  | 'task_complete' 
  | 'session_end'
  | 'error_recovery'
  | 'before_risky_operation';

export interface MemorySnapshot {
  items: Memory[];
  compressedAt?: Date;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
  coverage?: CoverageReport;
  summary: string;
}

export interface TestResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stack?: string;
  assertions: number;
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

// ═══════════════════════════════════════════════════════════════
//                      UTILITY TYPES
// ═══════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type Awaitable<T> = T | Promise<T>;
```

---

### 7. CORE UTILITIES

```typescript
// src/core/utils/index.ts

export * from './token-estimator.js';
export * from './code-analyzer.js';
export * from './file-utils.js';
export * from './port-utils.js';
export * from './string-utils.js';
```

```typescript
// src/core/utils/token-estimator.ts

/**
 * Estimate token count for text
 * Based on GPT tokenization (roughly 4 chars per token)
 */
export function estimateTokens(text: string): number {
  // Simple heuristic: ~4 characters per token
  // More accurate would be to use tiktoken
  const charCount = text.length;
  const wordCount = text.split(/\s+/).length;
  
  // Use weighted average of char-based and word-based estimates
  const charEstimate = Math.ceil(charCount / 4);
  const wordEstimate = Math.ceil(wordCount * 1.3);
  
  return Math.round((charEstimate + wordEstimate) / 2);
}

/**
 * Estimate tokens for code (more accurate for source files)
 */
export function estimateCodeTokens(code: string): number {
  // Code tends to have more tokens per character due to:
  // - Special characters
  // - Short identifiers
  // - Punctuation
  
  const lines = code.split('\n');
  let tokens = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty line = 1 token
    if (!trimmed) {
      tokens += 1;
      continue;
    }
    
    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      tokens += Math.ceil(trimmed.length / 4);
      continue;
    }
    
    // Code line - count elements
    const elements = trimmed.split(/[\s\(\)\[\]\{\}\,\;\:\.\=\+\-\*\/\<\>\!\&\|\?]+/);
    const operators = trimmed.match(/[\(\)\[\]\{\}\,\;\:\.\=\+\-\*\/\<\>\!\&\|\?]+/g) || [];
    
    tokens += elements.filter(Boolean).length;
    tokens += operators.length;
  }
  
  return tokens;
}

/**
 * Estimate task complexity based on description
 */
export function estimateTaskComplexity(description: string): {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  tokenEstimate: number;
  timeEstimate: string;
} {
  const descLower = description.toLowerCase();
  
  const complexityIndicators = {
    low: ['fix', 'update', 'change', 'rename', 'simple', 'small', 'minor', 'typo', 'comment'],
    medium: ['add', 'create', 'implement', 'feature', 'component', 'function', 'method', 'class'],
    high: ['refactor', 'redesign', 'migrate', 'integrate', 'complex', 'system', 'api', 'database'],
    very_high: ['architecture', 'rewrite', 'overhaul', 'entire', 'complete', 'full', 'major', 'rebuild'],
  };
  
  const multipliers = {
    low: 1000,
    medium: 3000,
    high: 8000,
    very_high: 20000,
  };
  
  let complexity: keyof typeof multipliers = 'medium';
  
  // Check in order from highest to lowest
  for (const level of ['very_high', 'high', 'medium', 'low'] as const) {
    if (complexityIndicators[level].some(kw => descLower.includes(kw))) {
      complexity = level;
      break;
    }
  }
  
  const tokenEstimate = multipliers[complexity];
  const minutesEstimate = Math.ceil(tokenEstimate / 500); // Rough 500 tokens per minute
  
  const timeEstimate = minutesEstimate < 60 
    ? `${minutesEstimate} minutes`
    : `${Math.ceil(minutesEstimate / 60)} hour(s)`;
  
  return {
    complexity,
    tokenEstimate,
    timeEstimate,
  };
}
```

```typescript
// src/core/utils/code-analyzer.ts

/**
 * Analyze code for various patterns
 */

export interface CodeAnalysis {
  language: string;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  comments: number;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Detect programming language from file extension or content
 */
export function detectLanguage(filename: string, content?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript-react',
    js: 'javascript',
    jsx: 'javascript-react',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    swift: 'swift',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  };
  
  return extMap[ext || ''] || 'unknown';
}

/**
 * Analyze code structure
 */
export function analyzeCode(code: string, language: string): CodeAnalysis {
  const lines = code.split('\n');
  let functions = 0;
  let classes = 0;
  let imports = 0;
  let exports = 0;
  let comments = 0;
  
  const isJS = ['javascript', 'typescript', 'javascript-react', 'typescript-react'].includes(language);
  const isPython = language === 'python';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Count comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      comments++;
    }
    
    // Count functions
    if (isJS) {
      if (/(?:function|const|let|var)\s+\w+\s*(?:=\s*)?(?:async\s*)?\(/.test(trimmed)) {
        functions++;
      }
      if (/=>\s*\{/.test(trimmed)) {
        functions++;
      }
    } else if (isPython) {
      if (/^def\s+\w+\s*\(/.test(trimmed)) {
        functions++;
      }
    }
    
    // Count classes
    if (/^(?:export\s+)?(?:abstract\s+)?class\s+\w+/.test(trimmed)) {
      classes++;
    } else if (isPython && /^class\s+\w+/.test(trimmed)) {
      classes++;
    }
    
    // Count imports
    if (/^import\s/.test(trimmed) || /^from\s+\S+\s+import/.test(trimmed)) {
      imports++;
    }
    
    // Count exports
    if (/^export\s/.test(trimmed)) {
      exports++;
    }
  }
  
  // Determine complexity
  const totalStructures = functions + classes;
  let complexity: 'low' | 'medium' | 'high' = 'low';
  
  if (totalStructures > 20 || lines.length > 500) {
    complexity = 'high';
  } else if (totalStructures > 10 || lines.length > 200) {
    complexity = 'medium';
  }
  
  return {
    language,
    lines: lines.length,
    functions,
    classes,
    imports,
    exports,
    comments,
    complexity,
  };
}

/**
 * Check for emoji in code
 */
export function containsEmoji(text: string): boolean {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

/**
 * Check for problematic unicode in code
 */
export function containsProblematicUnicode(text: string): boolean {
  // Check for characters that look like ASCII but aren't
  const confusables = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/;
  return confusables.test(text);
}

/**
 * Find empty catch blocks
 */
export function findEmptyCatchBlocks(code: string): { line: number; snippet: string }[] {
  const results: { line: number; snippet: string }[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for catch followed by empty block
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      results.push({
        line: i + 1,
        snippet: line.trim(),
      });
    }
    
    // Multi-line empty catch
    if (/catch\s*\([^)]*\)\s*\{$/.test(line.trim())) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine === '}') {
        results.push({
          line: i + 1,
          snippet: `${line.trim()}\n${nextLine}`,
        });
      }
    }
  }
  
  return results;
}

/**
 * Find commented out code blocks
 */
export function findCommentedCode(code: string): { startLine: number; endLine: number; content: string }[] {
  const results: { startLine: number; endLine: number; content: string }[] = [];
  const lines = code.split('\n');
  
  let inCommentBlock = false;
  let blockStart = 0;
  let blockContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Single line comment that looks like code
    if (line.startsWith('//') && /[;{}()=]/.test(line)) {
      if (!inCommentBlock) {
        inCommentBlock = true;
        blockStart = i + 1;
        blockContent = line;
      } else {
        blockContent += '\n' + line;
      }
    } else if (inCommentBlock) {
      // End of comment block
      if (blockContent.split('\n').length >= 3) {
        results.push({
          startLine: blockStart,
          endLine: i,
          content: blockContent,
        });
      }
      inCommentBlock = false;
      blockContent = '';
    }
  }
  
  return results;
}
```

```typescript
// src/core/utils/file-utils.ts

import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname, basename, extname, relative } from 'path';

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read file safely
 */
export function readFileSafe(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Get file info
 */
export function getFileInfo(filePath: string): {
  exists: boolean;
  size: number;
  isDirectory: boolean;
  extension: string;
  name: string;
  modifiedAt?: Date;
} | null {
  try {
    if (!existsSync(filePath)) {
      return {
        exists: false,
        size: 0,
        isDirectory: false,
        extension: extname(filePath),
        name: basename(filePath),
      };
    }
    
    const stat = statSync(filePath);
    return {
      exists: true,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      extension: extname(filePath),
      name: basename(filePath),
      modifiedAt: stat.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * List directory contents
 */
export function listDirectory(
  dirPath: string,
  options?: {
    recursive?: boolean;
    includeHidden?: boolean;
    extensions?: string[];
    maxDepth?: number;
  }
): string[] {
  const files: string[] = [];
  const { recursive = false, includeHidden = false, extensions, maxDepth = 10 } = options || {};
  
  function scan(currentPath: string, depth: number): void {
    if (depth > maxDepth) return;
    
    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules') continue;
        
        const fullPath = join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          if (recursive) {
            scan(fullPath, depth + 1);
          }
        } else {
          if (extensions) {
            const ext = extname(entry.name);
            if (!extensions.includes(ext)) continue;
          }
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }
  
  scan(dirPath, 0);
  return files;
}

/**
 * Get relative path from project root
 */
export function getRelativePath(fullPath: string, projectRoot: string): string {
  return relative(projectRoot, fullPath);
}

/**
 * Check if file is in directory
 */
export function isInDirectory(filePath: string, dirPath: string): boolean {
  const rel = relative(dirPath, filePath);
  return !rel.startsWith('..') && !rel.startsWith('/');
}

/**
 * Get file type category
 */
export function getFileCategory(filename: string): 'code' | 'config' | 'documentation' | 'test' | 'asset' | 'other' {
  const ext = extname(filename).toLowerCase();
  const name = basename(filename).toLowerCase();
  
  // Test files
  if (name.includes('.test.') || name.includes('.spec.') || name.includes('__tests__')) {
    return 'test';
  }
  
  // Code files
  const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.cs', '.cpp', '.c', '.php', '.swift'];
  if (codeExts.includes(ext)) {
    return 'code';
  }
  
  // Config files
  const configExts = ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'];
  const configNames = ['package.json', 'tsconfig.json', '.eslintrc', '.prettierrc', 'webpack.config', 'vite.config'];
  if (configExts.includes(ext) || configNames.some(n => name.includes(n))) {
    return 'config';
  }
  
  // Documentation
  const docExts = ['.md', '.txt', '.rst', '.adoc'];
  if (docExts.includes(ext)) {
    return 'documentation';
  }
  
  // Assets
  const assetExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp3', '.mp4', '.wav', '.ttf', '.woff', '.woff2'];
  if (assetExts.includes(ext)) {
    return 'asset';
  }
  
  return 'other';
}
```

```typescript
// src/core/utils/port-utils.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer, Socket } from 'net';

const execAsync = promisify(exec);

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from a given port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 100): Promise<number | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Get process using a port (Linux/Mac only)
 */
export async function getProcessOnPort(port: number): Promise<{
  pid: number;
  name: string;
  command: string;
} | null> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length === 0) {
      return null;
    }
    
    const pid = parseInt(pids[0], 10);
    
    // Get process name
    const { stdout: nameOutput } = await execAsync(`ps -p ${pid} -o comm= 2>/dev/null || echo unknown`);
    const name = nameOutput.trim();
    
    // Get full command
    const { stdout: cmdOutput } = await execAsync(`ps -p ${pid} -o args= 2>/dev/null || echo unknown`);
    const command = cmdOutput.trim();
    
    return { pid, name, command };
  } catch {
    return null;
  }
}

/**
 * Kill process on a port
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length === 0) {
      return false;
    }
    
    for (const pidStr of pids) {
      await execAsync(`kill -9 ${pidStr} 2>/dev/null || true`);
    }
    
    // Wait a moment for port to be released
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for port to become available
 */
export async function waitForPort(
  port: number,
  timeout: number = 30000,
  interval: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isPortAvailable(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Wait for a service to be ready on a port
 */
export async function waitForService(
  port: number,
  host: string = '127.0.0.1',
  timeout: number = 30000,
  interval: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const isReady = await new Promise<boolean>((resolve) => {
      const socket = new Socket();
      
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
    
    if (isReady) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}
```

```typescript
// src/core/utils/string-utils.ts

/**
 * Convert string to different naming conventions
 */

export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toLowerCase());
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function toScreamingSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pluralize a word
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  
  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Format bytes in human-readable form
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Generate a random string
 */
export function randomString(length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Escape string for regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if string is valid identifier
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}
```

---

### 8. CORE INDEX

```typescript
// src/core/index.ts

export * from './types.js';
export * from './event-bus.js';
export * from './logger.js';
export * from './config-manager.js';
export * from './state-manager.js';

export * from './utils/index.js';

// Re-export commonly used items
export { EventBus, getGlobalEventBus, CCGEvent, CCGEventType } from './event-bus.js';
export { Logger, LogLevel, getGlobalLogger, createModuleLogger } from './logger.js';
export { ConfigManager, DEFAULT_CONFIG } from './config-manager.js';
export { StateManager, getGlobalStateManager, Session, SessionStatus } from './state-manager.js';
```

---

### 9. SUMMARY

Đã implement đầy đủ Core Infrastructure:

| Component | Key Features |
|-----------|--------------|
| **EventBus** | Typed events, subscriptions, history, waitFor, wildcards |
| **Logger** | Levels, colors, file output, context, timing |
| **ConfigManager** | Load/save, path-based get/set, validation, watching |
| **StateManager** | Session management, token tracking, stats, persistence |
| **Utilities** | Token estimation, code analysis, file utils, port utils, string utils |

**Architecture:**

```
                    ┌─────────────────┐
                    │   CCG Server    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   EventBus    │   │    Logger     │   │ ConfigManager │
│               │   │               │   │               │
│ • Events      │   │ • Levels      │   │ • Config      │
│ • History     │   │ • Output      │   │ • Validation  │
│ • Subscribe   │   │ • Context     │   │ • Watch       │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  StateManager   │
                    │                 │
                    │ • Session       │
                    │ • Tokens        │
                    │ • Stats         │
                    │ • Persistence   │
                    └─────────────────┘
```

**Bạn muốn tiếp tục với:**

1. **Templates** - Config files, hooks.json, slash commands
2. **Testing Strategy** - Unit tests, integration tests
3. **Build & Publish** - CI/CD, npm publishing guide
4. **Module Initializer** - Tích hợp tất cả modules