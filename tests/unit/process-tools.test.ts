// tests/unit/process-tools.test.ts

// Using vitest globals
import {
  getProcessTools,
  formatPortStatus,
  formatAllPortsStatus,
  formatProcessList,
  formatCleanupResult,
  formatModuleStatus,
} from '../../src/modules/process/process.tools.js';
import { PortStatus, ProcessInfo } from '../../src/core/types.js';
import { PortInfo, CleanupResult, ProcessModuleStatus } from '../../src/modules/process/process.types.js';

describe('process.tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getProcessTools
  // ═══════════════════════════════════════════════════════════════

  describe('getProcessTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getProcessTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required process tools', () => {
      const tools = getProcessTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('process_check_port');
      expect(toolNames).toContain('process_check_all_ports');
      expect(toolNames).toContain('process_kill_on_port');
      expect(toolNames).toContain('process_kill');
      expect(toolNames).toContain('process_spawn');
      expect(toolNames).toContain('process_list');
      expect(toolNames).toContain('process_cleanup');
      expect(toolNames).toContain('process_status');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getProcessTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });

    it('should have port as required for check_port', () => {
      const tools = getProcessTools();
      const checkPortTool = tools.find(t => t.name === 'process_check_port');

      expect(checkPortTool).toBeDefined();
      expect(checkPortTool!.inputSchema.required).toContain('port');
    });

    it('should have port as required for kill_on_port', () => {
      const tools = getProcessTools();
      const killPortTool = tools.find(t => t.name === 'process_kill_on_port');

      expect(killPortTool).toBeDefined();
      expect(killPortTool!.inputSchema.required).toContain('port');
      expect(killPortTool!.inputSchema.properties).toHaveProperty('force');
    });

    it('should have pid as required for kill', () => {
      const tools = getProcessTools();
      const killTool = tools.find(t => t.name === 'process_kill');

      expect(killTool).toBeDefined();
      expect(killTool!.inputSchema.required).toContain('pid');
      expect(killTool!.inputSchema.properties).toHaveProperty('force');
    });

    it('should have command as required for spawn', () => {
      const tools = getProcessTools();
      const spawnTool = tools.find(t => t.name === 'process_spawn');

      expect(spawnTool).toBeDefined();
      expect(spawnTool!.inputSchema.required).toContain('command');
      expect(spawnTool!.inputSchema.properties).toHaveProperty('args');
      expect(spawnTool!.inputSchema.properties).toHaveProperty('port');
      expect(spawnTool!.inputSchema.properties).toHaveProperty('name');
      expect(spawnTool!.inputSchema.properties).toHaveProperty('cwd');
    });

    it('should have no required fields for status tools', () => {
      const tools = getProcessTools();
      const statusTools = ['process_check_all_ports', 'process_list', 'process_cleanup', 'process_status'];

      statusTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema.required).toEqual([]);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatPortStatus
  // ═══════════════════════════════════════════════════════════════

  describe('formatPortStatus', () => {
    it('should format available port', () => {
      const status: PortStatus = {
        port: 3000,
        available: true,
      };

      const result = formatPortStatus(status);

      expect(result).toBe('Port 3000: AVAILABLE');
    });

    it('should format port in use with unknown process', () => {
      const status: PortStatus = {
        port: 8080,
        available: false,
      };

      const result = formatPortStatus(status);

      expect(result).toBe('Port 8080: IN USE (unknown process)');
    });

    it('should format port in use with process details', () => {
      const status: PortStatus = {
        port: 5000,
        available: false,
        usedBy: {
          pid: 1234,
          name: 'node',
          command: 'node server.js',
          startedAt: new Date(),
        },
      };

      const result = formatPortStatus(status);

      expect(result).toContain('Port 5000: IN USE');
      expect(result).toContain('PID: 1234');
      expect(result).toContain('Name: node');
      expect(result).toContain('Command: node server.js');
    });

    it('should indicate CCG-spawned process', () => {
      const status: PortStatus = {
        port: 4000,
        available: false,
        usedBy: {
          pid: 5678,
          name: 'npm',
          command: 'npm run dev',
          startedAt: new Date(),
          spawnedBy: 'ccg',
        },
      };

      const result = formatPortStatus(status);

      expect(result).toContain('(Spawned by CCG)');
    });

    it('should not indicate CCG for external process', () => {
      const status: PortStatus = {
        port: 4000,
        available: false,
        usedBy: {
          pid: 5678,
          name: 'nginx',
          command: 'nginx -g daemon off',
          startedAt: new Date(),
          spawnedBy: 'external',
        },
      };

      const result = formatPortStatus(status);

      expect(result).not.toContain('(Spawned by CCG)');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatAllPortsStatus
  // ═══════════════════════════════════════════════════════════════

  describe('formatAllPortsStatus', () => {
    it('should return message for no configured ports', () => {
      const result = formatAllPortsStatus([]);

      expect(result).toBe('No configured ports');
    });

    it('should format single port status', () => {
      const ports: PortInfo[] = [
        { name: 'Web Server', port: 3000, available: true },
      ];

      const result = formatAllPortsStatus(ports);

      expect(result).toContain('Configured Ports Status:');
      expect(result).toContain('Web Server (3000): FREE');
      expect(result).toContain('Summary: 1 free, 0 in use');
    });

    it('should format multiple ports with mixed status', () => {
      const ports: PortInfo[] = [
        { name: 'Web Server', port: 3000, available: true },
        { name: 'API Server', port: 8080, available: false, pid: 1234 },
        { name: 'Database', port: 5432, available: true },
      ];

      const result = formatAllPortsStatus(ports);

      expect(result).toContain('Web Server (3000): FREE');
      expect(result).toContain('API Server (8080): IN USE (PID: 1234)');
      expect(result).toContain('Database (5432): FREE');
      expect(result).toContain('Summary: 2 free, 1 in use');
    });

    it('should format all ports in use', () => {
      const ports: PortInfo[] = [
        { name: 'Server 1', port: 3000, available: false, pid: 111 },
        { name: 'Server 2', port: 4000, available: false, pid: 222 },
      ];

      const result = formatAllPortsStatus(ports);

      expect(result).toContain('Summary: 0 free, 2 in use');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatProcessList
  // ═══════════════════════════════════════════════════════════════

  describe('formatProcessList', () => {
    it('should return message for no processes', () => {
      const result = formatProcessList([]);

      expect(result).toBe('No running processes');
    });

    it('should format single process without port', () => {
      const processes: ProcessInfo[] = [
        {
          pid: 1234,
          name: 'node',
          command: 'node app.js',
          startedAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      const result = formatProcessList(processes);

      expect(result).toContain('Running Processes:');
      expect(result).toContain('PID 1234: node');
      expect(result).toContain('Command: node app.js');
      expect(result).toContain('Started: 2024-01-15');
    });

    it('should format process with port', () => {
      const processes: ProcessInfo[] = [
        {
          pid: 5678,
          name: 'npm',
          command: 'npm run dev',
          port: 3000,
          startedAt: new Date(),
        },
      ];

      const result = formatProcessList(processes);

      expect(result).toContain('PID 5678: npm (port 3000)');
    });

    it('should indicate CCG-spawned process', () => {
      const processes: ProcessInfo[] = [
        {
          pid: 9999,
          name: 'vitest',
          command: 'vitest --watch',
          startedAt: new Date(),
          spawnedBy: 'ccg',
        },
      ];

      const result = formatProcessList(processes);

      expect(result).toContain('[CCG]');
    });

    it('should format multiple processes', () => {
      const processes: ProcessInfo[] = [
        {
          pid: 1111,
          name: 'web',
          command: 'npm run start',
          port: 3000,
          startedAt: new Date(),
          spawnedBy: 'ccg',
        },
        {
          pid: 2222,
          name: 'api',
          command: 'npm run api',
          port: 8080,
          startedAt: new Date(),
        },
      ];

      const result = formatProcessList(processes);

      expect(result).toContain('PID 1111');
      expect(result).toContain('PID 2222');
      expect(result).toContain('(port 3000)');
      expect(result).toContain('(port 8080)');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatCleanupResult
  // ═══════════════════════════════════════════════════════════════

  describe('formatCleanupResult', () => {
    it('should return message for no processes cleaned', () => {
      const result: CleanupResult = {
        cleaned: 0,
        pids: [],
      };

      const output = formatCleanupResult(result);

      expect(output).toBe('No processes to clean up');
    });

    it('should format single process cleanup', () => {
      const result: CleanupResult = {
        cleaned: 1,
        pids: [1234],
      };

      const output = formatCleanupResult(result);

      expect(output).toContain('Cleaned up 1 process(es)');
      expect(output).toContain('PIDs: 1234');
    });

    it('should format multiple process cleanup', () => {
      const result: CleanupResult = {
        cleaned: 3,
        pids: [1111, 2222, 3333],
      };

      const output = formatCleanupResult(result);

      expect(output).toContain('Cleaned up 3 process(es)');
      expect(output).toContain('PIDs: 1111, 2222, 3333');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      formatModuleStatus
  // ═══════════════════════════════════════════════════════════════

  describe('formatModuleStatus', () => {
    it('should format enabled module status', () => {
      const status: ProcessModuleStatus = {
        enabled: true,
        trackedProcesses: 2,
        configuredPorts: {
          web: 3000,
          api: 8080,
        },
        runningOnPorts: [],
      };

      const result = formatModuleStatus(status);

      expect(result).toContain('Process Module Status');
      expect(result).toContain('Enabled: Yes');
      expect(result).toContain('Tracked Processes: 2');
      expect(result).toContain('Configured Ports:');
      expect(result).toContain('web: 3000');
      expect(result).toContain('api: 8080');
    });

    it('should format disabled module status', () => {
      const status: ProcessModuleStatus = {
        enabled: false,
        trackedProcesses: 0,
        configuredPorts: {},
        runningOnPorts: [],
      };

      const result = formatModuleStatus(status);

      expect(result).toContain('Enabled: No');
      expect(result).toContain('Tracked Processes: 0');
    });

    it('should show port status when process running', () => {
      const status: ProcessModuleStatus = {
        enabled: true,
        trackedProcesses: 1,
        configuredPorts: {
          web: 3000,
          api: 8080,
        },
        runningOnPorts: [
          { pid: 1234, port: 3000, name: 'node' },
        ],
      };

      const result = formatModuleStatus(status);

      expect(result).toContain('web: 3000 - IN USE (PID: 1234)');
      expect(result).toContain('api: 8080 - FREE');
    });

    it('should show all ports in use', () => {
      const status: ProcessModuleStatus = {
        enabled: true,
        trackedProcesses: 2,
        configuredPorts: {
          web: 3000,
          api: 8080,
        },
        runningOnPorts: [
          { pid: 1111, port: 3000, name: 'web-server' },
          { pid: 2222, port: 8080, name: 'api-server' },
        ],
      };

      const result = formatModuleStatus(status);

      expect(result).toContain('web: 3000 - IN USE (PID: 1111)');
      expect(result).toContain('api: 8080 - IN USE (PID: 2222)');
    });
  });
});
