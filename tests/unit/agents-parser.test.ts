// tests/unit/agents-parser.test.ts
// AgentsParser Unit Tests

import { vi } from 'vitest';
import { AgentsParser } from '../../src/modules/agents/agents-parser.js';
import { Logger } from '../../src/core/logger.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

import { readFile, readdir, stat } from 'fs/promises';

describe('AgentsParser', () => {
  let parser: AgentsParser;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    parser = new AgentsParser(
      '/project',
      'AGENTS.md',
      '.claude/agents',
      mockLogger
    );
  });

  describe('nameToId()', () => {
    it('converts simple name to id', () => {
      expect(parser.nameToId('Trading Agent')).toBe('trading-agent');
    });

    it('converts name with multiple spaces', () => {
      expect(parser.nameToId('My  Special   Agent')).toBe('my-special-agent');
    });

    it('removes special characters', () => {
      expect(parser.nameToId('Agent #1 (Beta)')).toBe('agent-1-beta');
    });

    it('handles uppercase', () => {
      expect(parser.nameToId('UPPERCASE AGENT')).toBe('uppercase-agent');
    });

    it('handles single word', () => {
      expect(parser.nameToId('Agent')).toBe('agent');
    });
  });

  describe('idToName()', () => {
    it('converts simple id to name', () => {
      expect(parser.idToName('trading-agent')).toBe('Trading Agent');
    });

    it('converts single word id', () => {
      expect(parser.idToName('agent')).toBe('Agent');
    });

    it('handles multiple dashes', () => {
      expect(parser.idToName('my-special-agent')).toBe('My Special Agent');
    });
  });

  describe('parseAgentsMarkdown()', () => {
    it('parses empty content', () => {
      const result = parser.parseAgentsMarkdown('', '/path/AGENTS.md');

      expect(result.path).toBe('/path/AGENTS.md');
      expect(result.agents).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.parsedAt).toBeDefined();
    });

    it('parses single agent', () => {
      const content = `
## Trading Agent

- Name: \`trading\`
- Responsibilities:
  - Handle trades
  - Manage orders
- When to delegate:
  - Complex orders
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents.length).toBe(1);
      expect(result.agents[0].name).toBe('Trading');
      expect(result.agents[0].id).toBe('trading');
      expect(result.agents[0].responsibilities).toContain('Handle trades');
      expect(result.agents[0].responsibilities).toContain('Manage orders');
      expect(result.agents[0].delegationRules).toContain('Complex orders');
    });

    it('parses multiple agents', () => {
      const content = `
## Trading Agent

- Responsibilities:
  - Handle trades

## Analytics Agent

- Responsibilities:
  - Generate reports
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents.length).toBe(2);
      expect(result.agents[0].name).toBe('Trading');
      expect(result.agents[1].name).toBe('Analytics');
    });

    it('handles agent without explicit name', () => {
      const content = `
## My Custom Agent

- Responsibilities:
  - Do something
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('my-custom');
    });

    it('handles agent with explicit name', () => {
      const content = `
## Some Agent

- Name: \`custom-id\`
- Responsibilities:
  - Task 1
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents[0].id).toBe('custom-id');
    });

    it('tracks line numbers', () => {
      const content = `Line 1
## Agent A
Line 3
## Agent B
Line 5`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents[0].startLine).toBe(2);
      expect(result.agents[0].endLine).toBe(3);
      expect(result.agents[1].startLine).toBe(4);
      expect(result.agents[1].endLine).toBe(5);
    });

    it('handles empty responsibilities', () => {
      const content = `
## Empty Agent
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents[0].responsibilities).toEqual([]);
    });

    it('ignores non-agent headers', () => {
      const content = `
# Main Title

Some text

## Agent One

- Responsibilities:
  - Task
`;

      const result = parser.parseAgentsMarkdown(content, '/path/AGENTS.md');

      expect(result.agents.length).toBe(1);
    });
  });

  describe('parseAgentDefinition()', () => {
    it('parses agent definition file', () => {
      const content = `
Role: Handles trading operations

Core principles:
- Be precise
- Minimize risk

You specialize in:
- Stocks
- Forex
`;

      const result = parser.parseAgentDefinition(content, '/path/trading.md', 'trading');

      expect(result.agentId).toBe('trading');
      expect(result.path).toBe('/path/trading.md');
      expect(result.content.role).toBe('Handles trading operations');
      expect(result.content.principles).toContain('Be precise');
      expect(result.content.principles).toContain('Minimize risk');
      expect(result.content.specializations).toContain('Stocks');
      expect(result.content.specializations).toContain('Forex');
    });

    it('handles missing role', () => {
      const content = `
Core principles:
- Be safe
`;

      const result = parser.parseAgentDefinition(content, '/path/test.md', 'test');

      expect(result.content.role).toBeUndefined();
      expect(result.content.principles).toContain('Be safe');
    });

    it('handles guidelines section', () => {
      const content = `
Guidelines:
- Follow these rules
- Do this
`;

      const result = parser.parseAgentDefinition(content, '/path/test.md', 'test');

      expect(result.content.guidelines).toContain('Follow these rules');
      expect(result.content.guidelines).toContain('Do this');
    });

    it('preserves raw content', () => {
      const content = 'Role: Test\nSome content';
      const result = parser.parseAgentDefinition(content, '/path/test.md', 'test');

      expect(result.rawContent).toBe(content);
    });

    it('handles empty content', () => {
      const result = parser.parseAgentDefinition('', '/path/test.md', 'test');

      expect(result.agentId).toBe('test');
      expect(result.content.role).toBeUndefined();
    });
  });

  describe('loadAgentsFile()', () => {
    it('returns null when file not found', async () => {
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'));

      const result = await parser.loadAgentsFile();

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('loads and parses file when found', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockResolvedValue(`
## Test Agent

- Responsibilities:
  - Task 1
`);

      const result = await parser.loadAgentsFile();

      expect(result).not.toBeNull();
      expect(result?.agents.length).toBe(1);
    });

    it('handles read error', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockRejectedValue(new Error('Read failed'));

      const result = await parser.loadAgentsFile();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('loadAgentDefinitions()', () => {
    it('returns empty array when directory not found', async () => {
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'));

      const result = await parser.loadAgentDefinitions();

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('loads markdown files from directory', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockResolvedValue(['agent1.md', 'agent2.md', 'ignore.txt'] as any);
      vi.mocked(readFile).mockResolvedValue('Role: Test');

      const result = await parser.loadAgentDefinitions();

      expect(result.length).toBe(2);
      expect(result[0].agentId).toBe('agent1');
      expect(result[1].agentId).toBe('agent2');
    });

    it('handles file parse errors gracefully', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockResolvedValue(['good.md', 'bad.md'] as any);
      vi.mocked(readFile)
        .mockResolvedValueOnce('Role: Good')
        .mockRejectedValueOnce(new Error('Read failed'));

      const result = await parser.loadAgentDefinitions();

      expect(result.length).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('handles readdir error', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockRejectedValue(new Error('Cannot read directory'));

      const result = await parser.loadAgentDefinitions();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('filters non-md files', async () => {
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockResolvedValue(['agent.md', 'config.json', 'readme.txt'] as any);
      vi.mocked(readFile).mockResolvedValue('Role: Test');

      const result = await parser.loadAgentDefinitions();

      expect(result.length).toBe(1);
    });
  });
});
