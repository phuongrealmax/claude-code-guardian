// tests/helpers/fakes/fakeEventBus.ts

import type { CCGEvent } from '../../../src/core/event-bus.js';

/**
 * Fake EventBus for testing - records all emitted events
 */
export class FakeEventBus {
  public events: CCGEvent[] = [];
  private handlers: Map<string, Array<(event: CCGEvent) => void>> = new Map();

  emit(event: CCGEvent): void {
    this.events.push(event);
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(h => h(event));
  }

  on(eventType: string, handler: (event: CCGEvent) => void): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  off(eventType: string, handler: (event: CCGEvent) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  clear(): void {
    this.events = [];
    this.handlers.clear();
  }

  getEventsByType(type: string): CCGEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getLastEvent(): CCGEvent | undefined {
    return this.events[this.events.length - 1];
  }
}
