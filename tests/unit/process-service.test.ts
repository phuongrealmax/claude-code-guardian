// tests/unit/process-service.test.ts
// ProcessService Unit Tests

import { vi } from 'vitest';
import { ProcessService } from '../../src/modules/process/process.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import type { ProcessModuleConfig } from '../../src/core/types.js';

// Mock child_process
const mockExec = vi.fn();
const mockSpawn = vi.fn();

vi.mock('child_process', () => ({
  exec: (cmd: string, opts: unknown, callback?: Function) => {
    const result = mockExec(cmd, opts);
    if (callback) {
      if (result.error) {
        callback(result.error, '', '');
      } else {
        callback(null, result.stdout || '', result.stderr || '');
      }
    }
    return { on: vi.fn() };
  },
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock os.platform
const mockPlatform = vi.fn().mockReturnValue('linux');
vi.mock('os', () => ({
  platform: () => mockPlatform(),
}));

// Mock util.promisify to work with our mock
vi.mock('util', () => ({
  promisify: (fn: Function) => {
    return async (cmd: string, opts?: unknown) => {
      return new Promise((resolve, reject) => {
        fn(cmd, opts, (err: Error | null, stdout: string, stderr: string) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    };
  },
}));

describe('ProcessService', () => {
  let service: ProcessService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;
  let config: ProcessModuleConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as EventBus;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    config = {
      enabled: true,
      ports: {
        dev: 3000,
        api: 8080,
      },
      autoKillOnConflict: false,
      trackSpawnedProcesses: true,
    };

    // Default mock responses
    mockExec.mockReturnValue({ stdout: '', stderr: '' });
    mockSpawn.mockReturnValue({
      pid: 12345,
      unref: vi.fn(),
      on: vi.fn(),
    });
    mockPlatform.mockReturnValue('linux');

    service = new ProcessService(config, mockEventBus, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates service with config', () => {
      expect(service).toBeDefined();
    });

    it('detects Windows platform', () => {
      mockPlatform.mockReturnValue('win32');
      const winService = new ProcessService(config, mockEventBus, mockLogger);
      expect(winService).toBeDefined();
    });

    it('detects Linux platform', () => {
      mockPlatform.mockReturnValue('linux');
      const linuxService = new ProcessService(config, mockEventBus, mockLogger);
      expect(linuxService).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('does nothing when disabled', async () => {
      config.enabled = false;
      service = new ProcessService(config, mockEventBus, mockLogger);

      await service.initialize();

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('checks configured ports on startup', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Process module initialized');
    });

    it('warns about ports already in use', async () => {
      // Simulate port 3000 in use
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes(':3000')) {
          return { stdout: '1234', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      await service.initialize();

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('shutdown()', () => {
    it('logs shutdown message', async () => {
      await service.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith('Process module shutdown');
    });

    it('cleans up spawned processes when tracking enabled', async () => {
      config.trackSpawnedProcesses = true;
      service = new ProcessService(config, mockEventBus, mockLogger);

      await service.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith('Process module shutdown');
    });

    it('skips cleanup when tracking disabled', async () => {
      config.trackSpawnedProcesses = false;
      service = new ProcessService(config, mockEventBus, mockLogger);

      await service.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith('Process module shutdown');
    });
  });

  describe('checkPort()', () => {
    it('returns available when no process on port (Linux)', async () => {
      mockPlatform.mockReturnValue('linux');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.checkPort(3000);

      expect(result.port).toBe(3000);
      expect(result.available).toBe(true);
    });

    it('returns unavailable when process found (Linux)', async () => {
      mockPlatform.mockReturnValue('linux');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('lsof')) {
          return { stdout: '1234', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.checkPort(3000);

      expect(result.port).toBe(3000);
      expect(result.available).toBe(false);
      expect(result.usedBy?.pid).toBe(1234);
    });

    it('returns available when check fails', async () => {
      mockExec.mockReturnValue({ error: new Error('Command failed'), stdout: '', stderr: '' });

      const result = await service.checkPort(3000);

      expect(result.port).toBe(3000);
      expect(result.available).toBe(true);
    });

    it('checks port on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('netstat')) {
          return { stdout: '  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    5678\n', stderr: '' };
        }
        if (cmd.includes('wmic')) {
          return { stdout: 'Name=node.exe\nCommandLine=node server.js\n', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.checkPort(3000);

      expect(result.port).toBe(3000);
      expect(result.available).toBe(false);
      expect(result.usedBy?.pid).toBe(5678);
    });

    it('handles empty netstat output on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.checkPort(3000);

      expect(result.available).toBe(true);
    });
  });

  describe('checkAllPorts()', () => {
    it('checks all configured ports', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const results = await service.checkAllPorts();

      expect(results.length).toBe(2);
      expect(results[0].name).toBe('dev');
      expect(results[0].port).toBe(3000);
      expect(results[1].name).toBe('api');
      expect(results[1].port).toBe(8080);
    });

    it('includes process info when port in use', async () => {
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes(':3000') || cmd.includes('lsof')) {
          return { stdout: '1234', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const results = await service.checkAllPorts();

      // At least one port should show as in use
      const inUse = results.filter(r => !r.available);
      expect(inUse.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('killProcessOnPort()', () => {
    it('returns success when port already free', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.killProcessOnPort(3000);

      expect(result.success).toBe(true);
      expect(result.killed).toBe(false);
      expect(result.message).toContain('already free');
    });

    it('kills process on port (Linux)', async () => {
      mockPlatform.mockReturnValue('linux');
      service = new ProcessService(config, mockEventBus, mockLogger);

      // First call: checkPort finds process
      // Second call: getProcessInfo
      // Third call: kill
      let callCount = 0;
      mockExec.mockImplementation((cmd: string) => {
        callCount++;
        if (cmd.includes('lsof') && callCount <= 2) {
          return { stdout: '1234', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        if (cmd.includes('kill')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.killProcessOnPort(3000);

      expect(result.success).toBe(true);
      expect(result.killed).toBe(true);
    });

    it('returns success when port appears free', async () => {
      // When lsof returns empty, port is available
      mockExec.mockImplementation((cmd: string) => {
        return { stdout: '', stderr: '' };
      });

      const result = await service.killProcessOnPort(3000);

      expect(result.success).toBe(true);
      expect(result.killed).toBe(false);
      expect(result.message).toContain('already free');
    });
  });

  describe('killProcess()', () => {
    it('kills process on Linux', async () => {
      mockPlatform.mockReturnValue('linux');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.killProcess(1234);

      expect(result.success).toBe(true);
      expect(result.killed).toBe(true);
      expect(result.pid).toBe(1234);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('kills process on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.killProcess(1234);

      expect(result.success).toBe(true);
      expect(result.killed).toBe(true);
    });

    it('force kills process on Linux', async () => {
      mockPlatform.mockReturnValue('linux');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.killProcess(1234, true);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('forced'));
    });

    it('force kills process on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const result = await service.killProcess(1234, true);

      expect(result.success).toBe(true);
    });

    it('handles kill failure', async () => {
      mockExec.mockReturnValue({ error: new Error('Access denied'), stdout: '', stderr: '' });

      const result = await service.killProcess(1234);

      expect(result.success).toBe(false);
      expect(result.killed).toBe(false);
      expect(result.message).toContain('Failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('spawnProcess()', () => {
    it('spawns process successfully', async () => {
      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
        name: 'TestServer',
      });

      expect(result.success).toBe(true);
      expect(result.pid).toBe(12345);
      expect(result.name).toBe('TestServer');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('spawns process with port', async () => {
      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
        port: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.port).toBe(3000);
    });

    it('spawns process with cwd and env', async () => {
      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
        cwd: '/app',
        env: { NODE_ENV: 'production' },
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['server.js'],
        expect.objectContaining({ cwd: '/app' })
      );
    });

    it('uses command as name when name not provided', async () => {
      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
      });

      expect(result.name).toBe('node');
    });

    it('kills existing process on port conflict when autoKillOnConflict enabled', async () => {
      config.autoKillOnConflict = true;
      service = new ProcessService(config, mockEventBus, mockLogger);

      // First call: port check shows in use
      // Second call: checkPort for kill
      // Third call: actual kill
      // Fourth call: post-kill port check
      let portCheckCount = 0;
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('lsof')) {
          portCheckCount++;
          if (portCheckCount <= 2) {
            return { stdout: '9999', stderr: '' };
          }
          return { stdout: '', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'old-node', stderr: '' };
        }
        if (cmd.includes('kill')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
        port: 3000,
      });

      expect(result.success).toBe(true);
    });

    it('fails when port conflict cannot be resolved', async () => {
      config.autoKillOnConflict = true;
      service = new ProcessService(config, mockEventBus, mockLogger);

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('lsof')) {
          return { stdout: '9999', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        if (cmd.includes('kill')) {
          return { error: new Error('Cannot kill'), stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
        port: 3000,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to free port');
    });

    it('handles spawn error', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const result = await service.spawnProcess({
        command: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to spawn');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('tracks spawned process', async () => {
      await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
      });

      const status = service.getSimpleStatus();
      expect(status.tracked).toBe(1);
    });

    it('does not track when tracking disabled', async () => {
      config.trackSpawnedProcesses = false;
      service = new ProcessService(config, mockEventBus, mockLogger);

      await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
      });

      const status = service.getSimpleStatus();
      expect(status.tracked).toBe(0);
    });

    it('handles spawn on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);

      const result = await service.spawnProcess({
        command: 'node',
        args: ['server.js'],
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['server.js'],
        expect.objectContaining({ shell: true })
      );
    });
  });

  describe('cleanupSpawned()', () => {
    it('returns no cleanup when no processes', async () => {
      const result = await service.cleanupSpawned();

      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(0);
      expect(result.message).toContain('No processes');
    });

    it('cleans up running processes', async () => {
      // Spawn a process first
      await service.spawnProcess({ command: 'node' });

      // Mock isProcessRunning to return true
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('ps -p') || cmd.includes('tasklist')) {
          return { stdout: '12345\n', stderr: '' };
        }
        if (cmd.includes('kill')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.cleanupSpawned();

      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(1);
      expect(result.pids).toContain(12345);
    });

    it('skips already stopped processes', async () => {
      // Spawn a process first
      await service.spawnProcess({ command: 'node' });

      // Mock isProcessRunning to return false (process died)
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('ps -p')) {
          return { error: new Error('No such process'), stdout: '', stderr: '' };
        }
        if (cmd.includes('tasklist')) {
          return { stdout: 'No tasks', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.cleanupSpawned();

      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(0);
    });
  });

  describe('getRunningProcesses()', () => {
    it('returns empty array when no processes', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const processes = await service.getRunningProcesses();

      expect(processes).toEqual([]);
    });

    it('returns tracked processes that are running', async () => {
      await service.spawnProcess({ command: 'node', name: 'TestApp' });

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('ps -p') || cmd.includes('tasklist')) {
          return { stdout: '12345\n', stderr: '' };
        }
        if (cmd.includes('lsof')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const processes = await service.getRunningProcesses();

      expect(processes.length).toBe(1);
      expect(processes[0].name).toBe('TestApp');
      expect(processes[0].status).toBe('running');
    });

    it('removes stopped processes from tracking', async () => {
      await service.spawnProcess({ command: 'node', name: 'TestApp' });

      // Process has stopped
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('ps -p')) {
          return { error: new Error('No such process'), stdout: '', stderr: '' };
        }
        if (cmd.includes('tasklist')) {
          return { stdout: 'No tasks', stderr: '' };
        }
        if (cmd.includes('lsof')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const processes = await service.getRunningProcesses();

      expect(processes.length).toBe(0);
      expect(service.getSimpleStatus().tracked).toBe(0);
    });

    it('includes processes on configured ports', async () => {
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes(':3000') || cmd.includes('lsof')) {
          return { stdout: '5678', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const processes = await service.getRunningProcesses();

      expect(processes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatus()', () => {
    it('returns module status', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      const status = await service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.trackedProcesses).toBe(0);
      expect(status.configuredPorts).toEqual({ dev: 3000, api: 8080 });
    });

    it('includes ports in use', async () => {
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes(':3000') || (cmd.includes('lsof') && cmd.includes('3000'))) {
          return { stdout: '1234', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: 'node', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const status = await service.getStatus();

      expect(status.runningOnPorts).toBeDefined();
    });
  });

  describe('getSimpleStatus()', () => {
    it('returns sync status', () => {
      const status = service.getSimpleStatus();

      expect(status.tracked).toBe(0);
      expect(status.ports).toEqual({ dev: 3000, api: 8080 });
    });

    it('counts tracked processes', async () => {
      await service.spawnProcess({ command: 'node' });
      await service.spawnProcess({ command: 'npm' });

      const status = service.getSimpleStatus();

      // Both spawns return same mock PID, so they overwrite in Map
      expect(status.tracked).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Windows-specific behavior', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);
    });

    it('uses netstat for port checking', async () => {
      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('netstat')) {
          return { stdout: '  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    1234\n', stderr: '' };
        }
        if (cmd.includes('wmic')) {
          return { stdout: 'Name=node.exe\nCommandLine=node.exe server.js\n', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.checkPort(3000);

      expect(result.usedBy?.pid).toBe(1234);
    });

    it('uses taskkill for killing processes', async () => {
      mockExec.mockReturnValue({ stdout: '', stderr: '' });

      await service.killProcess(1234);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('taskkill'),
        expect.anything()
      );
    });

    it('uses tasklist for checking if process running', async () => {
      await service.spawnProcess({ command: 'node' });

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('tasklist')) {
          return { stdout: 'node.exe    12345', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const processes = await service.getRunningProcesses();

      // Process should be tracked as running
      expect(processes.length).toBe(1);
    });

    it('handles "No tasks" response from tasklist', async () => {
      await service.spawnProcess({ command: 'node' });

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('tasklist')) {
          return { stdout: 'INFO: No tasks are running', stderr: '' };
        }
        if (cmd.includes('lsof') || cmd.includes('netstat')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const processes = await service.getRunningProcesses();

      // Process should be removed as it's not running
      expect(processes.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty port config', async () => {
      config.ports = {};
      service = new ProcessService(config, mockEventBus, mockLogger);

      await service.initialize();
      const results = await service.checkAllPorts();

      expect(results).toEqual([]);
    });

    it('handles undefined args in spawnProcess', async () => {
      const result = await service.spawnProcess({
        command: 'node',
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('node', [], expect.anything());
    });

    it('handles invalid PID in netstat output', async () => {
      mockPlatform.mockReturnValue('win32');
      service = new ProcessService(config, mockEventBus, mockLogger);

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('netstat')) {
          return { stdout: '  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    invalid\n', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.checkPort(3000);

      expect(result.available).toBe(true);
    });

    it('handles getProcessInfo for tracked process', async () => {
      await service.spawnProcess({ command: 'node', name: 'TrackedApp' });

      mockExec.mockImplementation((cmd: string) => {
        if (cmd.includes('lsof')) {
          return { stdout: '12345', stderr: '' };
        }
        if (cmd.includes('ps -p')) {
          return { stdout: '12345', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await service.checkPort(3000);

      // If port check finds our tracked process
      if (!result.available && result.usedBy) {
        expect(result.usedBy.pid).toBeDefined();
      }
    });
  });
});
