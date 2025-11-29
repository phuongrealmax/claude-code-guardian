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
 * Get process using a port (cross-platform)
 */
export async function getProcessOnPort(port: number): Promise<{
  pid: number;
  name: string;
  command: string;
} | null> {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) return null;

      // Parse the first matching line
      const parts = lines[0].trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);

      if (isNaN(pid)) return null;

      // Get process name
      const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
      const taskParts = taskOutput.trim().split(',');
      const name = taskParts[0]?.replace(/"/g, '') || 'unknown';

      return { pid, name, command: name };
    } else {
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
    }
  } catch {
    return null;
  }
}

/**
 * Kill process on a port
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const processInfo = await getProcessOnPort(port);
      if (!processInfo) return false;

      await execAsync(`taskkill /PID ${processInfo.pid} /F`);
    } else {
      const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null`);
      const pids = stdout.trim().split('\n').filter(Boolean);

      if (pids.length === 0) {
        return false;
      }

      for (const pidStr of pids) {
        await execAsync(`kill -9 ${pidStr} 2>/dev/null || true`);
      }
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
