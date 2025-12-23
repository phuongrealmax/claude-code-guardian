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
  | 'session:saved'
  | 'session:resumed'
  | 'session:event'
  // Task events
  | 'task:create'
  | 'task:start'
  | 'task:progress'
  | 'task:complete'
  | 'task:fail'
  | 'task:pause'
  // Gate events (completion verification)
  | 'gate:pending'
  | 'gate:blocked'
  | 'gate:passed'
  // Guard events
  | 'guard:warning'
  | 'guard:block'
  | 'guard:pass'
  // Resource events
  | 'resource:warning'
  | 'resource:critical'
  | 'resource:checkpoint'
  | 'resource:suggest:latent'
  | 'resource:governor:critical'
  // Test events
  | 'test:start'
  | 'test:complete'
  | 'test:fail'
  | 'testing:failure' // Timeline event with metadata-only payload for observability
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
  | 'document:register'
  // Agent events
  | 'agent:registered'
  | 'agent:updated'
  | 'agent:removed'
  | 'agent:selected'
  | 'agent:coordination:created'
  // Latent Chain Mode events
  | 'latent:context:created'
  | 'latent:context:updated'
  | 'latent:phase:transition'
  | 'latent:patch:applied'
  | 'latent:task:completed'
  | 'latent:validation:failed'
  // Auto-Agent events
  | 'auto-agent:task:decomposed'
  | 'auto-agent:tool:routed'
  | 'auto-agent:fix:started'
  | 'auto-agent:fix:attempt'
  | 'auto-agent:fix:success'
  | 'auto-agent:fix:failed'
  | 'auto-agent:fix:rollback'
  | 'auto-agent:error:stored'
  | 'auto-agent:error:recalled'
  | 'auto-agent:checkpoint'
  // TaskGraph events
  | 'taskgraph:created'
  | 'taskgraph:node:started'
  | 'taskgraph:node:completed'
  | 'taskgraph:node:failed'
  | 'taskgraph:node:skipped' // Node skipped (decision branch not taken)
  | 'taskgraph:node:blocked' // Node blocked by gates (Sprint 7)
  | 'taskgraph:node:gated' // Node completion blocked by gate policy
  | 'taskgraph:node:bypass_gates' // Audit: node completed with gates bypassed
  | 'taskgraph:completed'
  | 'taskgraph:workflow:completed' // Workflow execution finished (Sprint 7)
  // Progress events (Sprint 9)
  | 'progress:updated' // Progress snapshot updated (metadata-only)
  // RAG events
  | 'rag:index:started'
  | 'rag:index:progress'
  | 'rag:index:complete'
  | 'rag:index:error'
  | 'rag:search:started'
  | 'rag:search:complete'
  // AST events (MCP-first code parsing)
  | 'ast:file:parsed'
  | 'ast:symbols:extracted'
  | 'ast:dependencies:built'
  // Proof Pack events (Sprint 1)
  | 'proofpack:created'
  | 'proofpack:verified'
  | 'proofpack:failed'
  | 'proofpack:uploaded'
  // Policy Pack events
  | 'policy:loaded';

export interface CCGEvent<T = unknown> {
  type: CCGEventType;
  timestamp: Date;
  data?: T;
  source?: string;
  sessionId?: string;
}

// ═══════════════════════════════════════════════════════════════
//                 PROOF PACK EVENT PAYLOADS (Sprint 1)
// ═══════════════════════════════════════════════════════════════

export interface ProofPackCreatedEvent {
  proofPackId: string;
  filename: string;
  hash: string;
  trustLevel: 'LOCAL_UNSIGNED' | 'LOCAL_SIGNED' | 'CI_SIGNED';
  sessionId?: string;
}

export interface ProofPackVerifiedEvent {
  proofPackId: string;
  verified: boolean;
  reason?: 'HASH_MISMATCH' | 'INVALID_SIGNATURE' | 'SCHEMA_INVALID';
}

export interface ProofPackFailedEvent {
  stage: 'CREATE' | 'VERIFY' | 'WRAP_VALIDATION';
  errorCode: string;
  message: string;
  filename?: string;
  sessionId?: string;
}

export interface ProofPackUploadedEvent {
  proofPackId: string;
  destination: 'cloud';
  status: 'SKIPPED_FLAG_OFF' | 'STARTED' | 'COMPLETED' | 'FAILED';
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
   * Wrapped with error boundary to prevent crashes from handler errors
   */
  emit<T = unknown>(event: CCGEvent<T>): void {
    // Ensure timestamp
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Add to history
    this.addToHistory(event);

    // Emit to specific type listeners with error boundary
    try {
      this.emitter.emit(event.type, event);
    } catch (error) {
      console.error(`Error in event handler for ${event.type}:`, error);
    }

    // Emit to wildcard listeners with error boundary
    try {
      this.emitter.emit('*', event);
    } catch (error) {
      console.error(`Error in wildcard event handler for ${event.type}:`, error);
    }
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
