// tests/unit/event-bus.test.ts

import { vi } from 'vitest';
import {
  EventBus,
  getGlobalEventBus,
  resetGlobalEventBus,
  CCGEvent,
  CCGEventType,
} from '../../src/core/event-bus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EMIT AND SUBSCRIBE
  // ═══════════════════════════════════════════════════════════════

  describe('emit and on', () => {
    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on('task:create', handler);

      eventBus.emit({
        type: 'task:create',
        timestamp: new Date(),
        data: { taskId: 'test-1' },
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task:create',
        data: { taskId: 'test-1' },
      }));
    });

    it('should add timestamp if not provided', () => {
      const handler = vi.fn();
      eventBus.on('task:start', handler);

      eventBus.emit({
        type: 'task:start',
      } as CCGEvent);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Date),
      }));
    });

    it('should emit to wildcard listeners', () => {
      const wildcardHandler = vi.fn();
      const specificHandler = vi.fn();

      eventBus.on('*', wildcardHandler);
      eventBus.on('task:complete', specificHandler);

      eventBus.emit({
        type: 'task:complete',
        timestamp: new Date(),
      });

      expect(wildcardHandler).toHaveBeenCalledTimes(1);
      expect(specificHandler).toHaveBeenCalledTimes(1);
    });

    it('should not emit to unrelated subscribers', () => {
      const handler = vi.fn();
      eventBus.on('task:create', handler);

      eventBus.emit({
        type: 'task:complete',
        timestamp: new Date(),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return subscription id', () => {
      const id = eventBus.on('task:create', () => {});

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toContain('sub_');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ONCE
  // ═══════════════════════════════════════════════════════════════

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      eventBus.once('task:create', handler);

      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:create', timestamp: new Date() });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove subscription after firing', () => {
      const handler = vi.fn();
      eventBus.once('task:create', handler);

      eventBus.emit({ type: 'task:create', timestamp: new Date() });

      expect(eventBus.getSubscriptionCount('task:create')).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      OFF
  // ═══════════════════════════════════════════════════════════════

  describe('off', () => {
    it('should unsubscribe handler', () => {
      const handler = vi.fn();
      const id = eventBus.on('task:create', handler);

      eventBus.off(id);

      eventBus.emit({ type: 'task:create', timestamp: new Date() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return true when subscription exists', () => {
      const id = eventBus.on('task:create', () => {});

      expect(eventBus.off(id)).toBe(true);
    });

    it('should return false for non-existent subscription', () => {
      expect(eventBus.off('non-existent-id')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      REMOVE ALL LISTENERS
  // ═══════════════════════════════════════════════════════════════

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('task:create', handler1);
      eventBus.on('task:complete', handler2);

      eventBus.removeAllListeners('task:create');

      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:complete', timestamp: new Date() });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners when no type specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('task:create', handler1);
      eventBus.on('task:complete', handler2);

      eventBus.removeAllListeners();

      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:complete', timestamp: new Date() });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVENT HISTORY
  // ═══════════════════════════════════════════════════════════════

  describe('getHistory', () => {
    it('should record events in history', () => {
      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:start', timestamp: new Date() });

      const history = eventBus.getHistory();

      expect(history).toHaveLength(2);
    });

    it('should filter by event type', () => {
      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:start', timestamp: new Date() });
      eventBus.emit({ type: 'task:create', timestamp: new Date() });

      const history = eventBus.getHistory({ eventType: 'task:create' });

      expect(history).toHaveLength(2);
      expect(history.every(e => e.type === 'task:create')).toBe(true);
    });

    it('should filter by since date', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      eventBus.emit({ type: 'task:create', timestamp: oldDate });
      eventBus.emit({ type: 'task:start', timestamp: newDate });

      const history = eventBus.getHistory({ since: new Date('2024-03-01') });

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('task:start');
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        eventBus.emit({ type: 'task:create', timestamp: new Date() });
      }

      const history = eventBus.getHistory({ limit: 3 });

      expect(history).toHaveLength(3);
    });

    it('should combine filters', () => {
      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:start', timestamp: new Date() });

      const history = eventBus.getHistory({
        eventType: 'task:create',
        limit: 1,
      });

      expect(history).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      eventBus.emit({ type: 'task:create', timestamp: new Date() });
      eventBus.emit({ type: 'task:start', timestamp: new Date() });

      eventBus.clearHistory();

      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SUBSCRIPTION COUNT
  // ═══════════════════════════════════════════════════════════════

  describe('getSubscriptionCount', () => {
    it('should return count for specific event type', () => {
      eventBus.on('task:create', () => {});
      eventBus.on('task:create', () => {});
      eventBus.on('task:start', () => {});

      expect(eventBus.getSubscriptionCount('task:create')).toBe(2);
    });

    it('should return total count when no type specified', () => {
      eventBus.on('task:create', () => {});
      eventBus.on('task:start', () => {});
      eventBus.on('task:complete', () => {});

      expect(eventBus.getSubscriptionCount()).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      WAIT FOR
  // ═══════════════════════════════════════════════════════════════

  describe('waitFor', () => {
    it('should resolve when event is emitted', async () => {
      const promise = eventBus.waitFor('task:complete');

      setTimeout(() => {
        eventBus.emit({
          type: 'task:complete',
          timestamp: new Date(),
          data: { result: 'success' },
        });
      }, 10);

      const event = await promise;

      expect(event.type).toBe('task:complete');
      expect(event.data).toEqual({ result: 'success' });
    });

    it('should reject on timeout', async () => {
      const promise = eventBus.waitFor('task:complete', 50);

      await expect(promise).rejects.toThrow('Timeout waiting for event');
    });

    it('should use predicate to filter events', async () => {
      const promise = eventBus.waitFor<{ id: number }>(
        'task:complete',
        1000,
        (event) => event.data?.id === 2
      );

      setTimeout(() => {
        eventBus.emit({
          type: 'task:complete',
          timestamp: new Date(),
          data: { id: 1 },
        });
        eventBus.emit({
          type: 'task:complete',
          timestamp: new Date(),
          data: { id: 2 },
        });
      }, 10);

      const event = await promise;

      expect(event.data?.id).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TYPED EMITTER
  // ═══════════════════════════════════════════════════════════════

  describe('createTypedEmitter', () => {
    it('should create typed emitter', () => {
      const taskEmitter = eventBus.createTypedEmitter<{ taskId: string }>('task:create');

      const handler = vi.fn();
      taskEmitter.on(handler);

      taskEmitter.emit({ taskId: 'test-123' }, 'test-source');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task:create',
        data: { taskId: 'test-123' },
        source: 'test-source',
      }));
    });

    it('should support once with typed emitter', () => {
      const taskEmitter = eventBus.createTypedEmitter<{ taskId: string }>('task:create');

      const handler = vi.fn();
      taskEmitter.once(handler);

      taskEmitter.emit({ taskId: 'test-1' });
      taskEmitter.emit({ taskId: 'test-2' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should not crash when handler throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      eventBus.on('task:create', errorHandler);
      eventBus.on('*', successHandler);

      // Should not throw
      expect(() => {
        eventBus.emit({ type: 'task:create', timestamp: new Date() });
      }).not.toThrow();

      // Other handlers should still be called
      expect(successHandler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HISTORY SIZE LIMIT
  // ═══════════════════════════════════════════════════════════════

  describe('history size limit', () => {
    it('should trim history when exceeding max size', () => {
      // Emit more than maxHistorySize events
      for (let i = 0; i < 1100; i++) {
        eventBus.emit({ type: 'task:create', timestamp: new Date(), data: { i } });
      }

      const history = eventBus.getHistory();

      // Should be trimmed to maxHistorySize (1000)
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                      GLOBAL EVENT BUS
// ═══════════════════════════════════════════════════════════════

describe('Global EventBus', () => {
  afterEach(() => {
    resetGlobalEventBus();
  });

  it('should return singleton instance', () => {
    const bus1 = getGlobalEventBus();
    const bus2 = getGlobalEventBus();

    expect(bus1).toBe(bus2);
  });

  it('should create new instance after reset', () => {
    const bus1 = getGlobalEventBus();
    resetGlobalEventBus();
    const bus2 = getGlobalEventBus();

    expect(bus1).not.toBe(bus2);
  });

  it('should clear listeners and history on reset', () => {
    const bus = getGlobalEventBus();
    const handler = vi.fn();

    bus.on('task:create', handler);
    bus.emit({ type: 'task:create', timestamp: new Date() });

    resetGlobalEventBus();

    const newBus = getGlobalEventBus();
    newBus.emit({ type: 'task:create', timestamp: new Date() });

    // Original handler should not be called for new event
    expect(handler).toHaveBeenCalledTimes(1);
    expect(newBus.getHistory()).toHaveLength(1);
  });
});
