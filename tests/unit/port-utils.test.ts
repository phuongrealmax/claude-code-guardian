// tests/unit/port-utils.test.ts
// Port Utilities Unit Tests

// Using vitest globals
import { createServer, Server } from 'net';
import {
  isPortAvailable,
  findAvailablePort,
  waitForPort,
  waitForService,
} from '../../src/core/utils/port-utils.js';

describe('port-utils', () => {
  let testServer: Server | null = null;

  afterEach(async () => {
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer!.close(() => resolve());
      });
      testServer = null;
    }
  });

  describe('isPortAvailable()', () => {
    it('returns true for available port', async () => {
      // Use findAvailablePort to get an actually available port
      const port = await findAvailablePort(49152);
      if (port === null) {
        // Skip test if no ports available (very unlikely)
        return;
      }
      const available = await isPortAvailable(port);

      expect(available).toBe(true);
    });

    it('returns false for port in use', async () => {
      // First find an available port
      const port = await findAvailablePort(49152);
      if (port === null) return;

      // Create a server on the port
      testServer = createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(port, '127.0.0.1', () => resolve());
      });

      const available = await isPortAvailable(port);

      expect(available).toBe(false);
    });
  });

  describe('findAvailablePort()', () => {
    it('returns first available port', async () => {
      const startPort = 50000;
      const port = await findAvailablePort(startPort);

      expect(port).not.toBeNull();
      expect(port).toBeGreaterThanOrEqual(startPort);
    });

    it('skips ports in use', async () => {
      // First find an available port
      const startPort = await findAvailablePort(50000);
      if (startPort === null) return;

      // Occupy the start port
      testServer = createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(startPort, '127.0.0.1', () => resolve());
      });

      const port = await findAvailablePort(startPort);

      expect(port).not.toBeNull();
      expect(port).toBeGreaterThan(startPort);
    });

    it('returns null when no port available within attempts', async () => {
      // This is hard to test without occupying many ports
      // Just test with maxAttempts = 0
      const port = await findAvailablePort(50000, 0);

      expect(port).toBeNull();
    });
  });

  describe('waitForPort()', () => {
    it('returns true immediately for available port', async () => {
      const port = await findAvailablePort(51000);
      if (port === null) return;
      const result = await waitForPort(port, 1000, 100);

      expect(result).toBe(true);
    });

    it('times out for port in use', async () => {
      const port = await findAvailablePort(51000);
      if (port === null) return;

      // Occupy the port
      testServer = createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(port, '127.0.0.1', () => resolve());
      });

      const start = Date.now();
      const result = await waitForPort(port, 500, 100);
      const elapsed = Date.now() - start;

      expect(result).toBe(false);
      expect(elapsed).toBeGreaterThanOrEqual(450);
    });
  });

  describe('waitForService()', () => {
    it('returns true when service is listening', async () => {
      const port = await findAvailablePort(52000);
      if (port === null) return;

      // Start a server
      testServer = createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(port, '127.0.0.1', () => resolve());
      });

      const result = await waitForService(port, '127.0.0.1', 1000, 100);

      expect(result).toBe(true);
    });

    it('times out when no service on port', async () => {
      const port = await findAvailablePort(52000);
      if (port === null) return;

      // Ensure port is available (no service)
      const start = Date.now();
      const result = await waitForService(port, '127.0.0.1', 500, 100);
      const elapsed = Date.now() - start;

      expect(result).toBe(false);
      expect(elapsed).toBeGreaterThanOrEqual(450);
    });

    it('uses default host', async () => {
      const port = await findAvailablePort(53000);
      if (port === null) return;

      testServer = createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(port, '127.0.0.1', () => resolve());
      });

      // Default host is 127.0.0.1
      const result = await waitForService(port);

      expect(result).toBe(true);
    });
  });
});
