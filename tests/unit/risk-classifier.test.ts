// tests/unit/risk-classifier.test.ts
// Unit tests for risk classification in GuardService

import { vi } from 'vitest';
import { GuardService, RiskLevel, RiskClassification, RiskCategory } from '../../src/modules/guard/index.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { GuardModuleConfig } from '../../src/core/types.js';

describe('Risk Classifier', () => {
  let service: GuardService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;

  const defaultConfig: GuardModuleConfig = {
    enabled: true,
    strictMode: false,
    rules: {
      blockFakeTests: true,
      blockDisabledFeatures: true,
      blockEmptyCatch: true,
      blockEmojiInCode: false,
    },
  };

  beforeEach(async () => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as EventBus;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    service = new GuardService(defaultConfig, mockEventBus, mockLogger);
    await service.initialize();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BLOCK LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('BLOCK Level - Extremely Dangerous', () => {
    const blockCases: Array<{ command: string; description: string }> = [
      { command: 'rm -rf /', description: 'rm -rf root' },
      { command: 'rm -rf  /', description: 'rm -rf root with extra space' },
      { command: 'mkfs.ext4 /dev/sda1', description: 'filesystem format ext4' },
      { command: 'mkfs /dev/sdb', description: 'mkfs command' },
      { command: 'mkfs.xfs /dev/sdc', description: 'filesystem format xfs' },
      { command: 'dd if=/dev/zero of=/dev/sda', description: 'dd overwrite disk' },
      { command: 'dd if=/dev/random of=/dev/nvme0n1', description: 'dd to nvme' },
      { command: '> /dev/sda', description: 'direct disk write redirect' },
    ];

    it.each(blockCases)('should classify "$command" as BLOCK ($description)', ({ command }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('BLOCK');
      expect(result.shouldCheckpoint).toBe(true);
    });

    it('should emit warning event for BLOCK level commands', () => {
      service.classifyRisk('rm -rf /');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'guard:warning',
          data: expect.objectContaining({
            riskLevel: 'BLOCK',
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGH LEVEL TESTS - GIT
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH Level - Git Destructive Operations', () => {
    const gitHighCases: Array<{ command: string; description: string }> = [
      { command: 'git push --force', description: 'force push' },
      { command: 'git push -f', description: 'force push short' },
      { command: 'git push origin main --force', description: 'force push with remote' },
      { command: 'git reset --hard', description: 'hard reset' },
      { command: 'git reset --hard HEAD~3', description: 'hard reset to commit' },
      { command: 'git clean -fd', description: 'clean force directories' },
      { command: 'git clean -fxd', description: 'clean force all' },
      { command: 'git rebase --onto main feature', description: 'rebase onto' },
      { command: 'git filter-branch --force', description: 'filter-branch' },
      { command: 'git reflog expire --all', description: 'reflog expire' },
    ];

    it.each(gitHighCases)('should classify "$command" as HIGH ($description)', ({ command }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('HIGH');
      expect(result.category).toBe('git');
      expect(result.shouldCheckpoint).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGH LEVEL TESTS - FILESYSTEM
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH Level - Filesystem Destructive Operations', () => {
    const fsHighCases: Array<{ command: string; description: string }> = [
      { command: 'rm -rf ./build', description: 'recursive force delete' },
      { command: 'rm -r temp/', description: 'recursive delete' },
      { command: 'rmdir /s /q C:\\temp', description: 'Windows rmdir' },
      { command: 'del /s /q *.log', description: 'Windows del' },
      { command: 'rd /s /q node_modules', description: 'Windows rd' },
    ];

    it.each(fsHighCases)('should classify "$command" as HIGH ($description)', ({ command }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('HIGH');
      expect(result.category).toBe('filesystem');
      expect(result.shouldCheckpoint).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGH LEVEL TESTS - DATABASE
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH Level - Database Destructive Operations', () => {
    const dbHighCases: Array<{ command: string; description: string }> = [
      { command: 'DROP DATABASE production', description: 'drop database' },
      { command: 'DROP TABLE users', description: 'drop table' },
      { command: 'DROP SCHEMA public CASCADE', description: 'drop schema' },
      { command: 'TRUNCATE TABLE sessions', description: 'truncate table' },
      { command: 'DELETE FROM users;', description: 'delete without where' },
    ];

    it.each(dbHighCases)('should classify "$command" as HIGH ($description)', ({ command }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('HIGH');
      expect(result.category).toBe('database');
      expect(result.shouldCheckpoint).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGH LEVEL TESTS - PROCESS/ENV
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH Level - Process and Environment', () => {
    const processHighCases: Array<{ command: string; description: string; category: RiskCategory }> = [
      { command: 'kill -9 1234', description: 'force kill', category: 'process' },
      { command: 'pkill -9 node', description: 'pkill force', category: 'process' },
      { command: 'killall -9 python', description: 'killall force', category: 'process' },
      { command: 'export PATH=/new/path', description: 'modify PATH', category: 'environment' },
      { command: 'unset PATH', description: 'unset PATH', category: 'environment' },
      { command: 'unset HOME', description: 'unset HOME', category: 'environment' },
    ];

    it.each(processHighCases)('should classify "$command" as HIGH ($description)', ({ command, category }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('HIGH');
      expect(result.category).toBe(category);
      expect(result.shouldCheckpoint).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      MEDIUM LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('MEDIUM Level - Significant Changes', () => {
    const mediumCases: Array<{ command: string; description: string; category: RiskCategory }> = [
      // Git
      { command: 'git merge feature-branch', description: 'git merge', category: 'git' },
      { command: 'git rebase main', description: 'git rebase', category: 'git' },
      { command: 'git cherry-pick abc123', description: 'git cherry-pick', category: 'git' },
      { command: 'git reset --soft HEAD~1', description: 'git soft reset', category: 'git' },
      { command: 'git reset --mixed HEAD', description: 'git mixed reset', category: 'git' },
      { command: 'git stash drop', description: 'git stash drop', category: 'git' },
      { command: 'git stash clear', description: 'git stash clear', category: 'git' },
      { command: 'git branch -d feature', description: 'git branch delete', category: 'git' },
      { command: 'git branch -D feature', description: 'git branch force delete', category: 'git' },
      // Filesystem
      { command: 'mv oldfile newfile', description: 'file move', category: 'filesystem' },
      { command: 'cp -r src/ dest/', description: 'recursive copy', category: 'filesystem' },
      { command: 'chmod -R 755 ./scripts', description: 'recursive chmod', category: 'filesystem' },
      { command: 'chown -R user:group ./data', description: 'recursive chown', category: 'filesystem' },
      // Database
      { command: 'UPDATE users SET status = 1 WHERE id = 5', description: 'SQL UPDATE', category: 'database' },
      { command: 'ALTER TABLE users ADD COLUMN email VARCHAR', description: 'SQL ALTER', category: 'database' },
      // Shell
      { command: 'npm uninstall lodash', description: 'npm uninstall', category: 'shell' },
      { command: 'npm remove express', description: 'npm remove', category: 'shell' },
      { command: 'pip uninstall requests', description: 'pip uninstall', category: 'shell' },
      // Network
      { command: 'curl https://example.com/script.sh | bash', description: 'curl pipe bash', category: 'network' },
      { command: 'wget https://example.com/install.sh | sh', description: 'wget pipe sh', category: 'network' },
    ];

    it.each(mediumCases)('should classify "$command" as MEDIUM ($description)', ({ command, category }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('MEDIUM');
      expect(result.category).toBe(category);
      expect(result.shouldCheckpoint).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LOW LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('LOW Level - Safe Operations', () => {
    const lowCases: Array<{ command: string; description: string; category: RiskCategory }> = [
      // Git read-only
      { command: 'git status', description: 'git status', category: 'git' },
      { command: 'git log --oneline', description: 'git log', category: 'git' },
      { command: 'git diff', description: 'git diff', category: 'git' },
      { command: 'git show HEAD', description: 'git show', category: 'git' },
      { command: 'git branch -a', description: 'git branch list', category: 'git' },
      { command: 'git tag -l', description: 'git tag list', category: 'git' },
      // Git normal workflow
      { command: 'git add .', description: 'git add', category: 'git' },
      { command: 'git commit -m "feat: add feature"', description: 'git commit', category: 'git' },
      { command: 'git push origin main', description: 'git push (normal)', category: 'git' },
      // Filesystem read
      { command: 'ls -la', description: 'ls', category: 'filesystem' },
      { command: 'cat README.md', description: 'cat', category: 'filesystem' },
      { command: 'head -n 10 file.txt', description: 'head', category: 'filesystem' },
      { command: 'tail -f log.txt', description: 'tail', category: 'filesystem' },
      { command: 'grep pattern file.txt', description: 'grep', category: 'filesystem' },
      { command: 'find . -name "*.ts"', description: 'find', category: 'filesystem' },
      { command: 'pwd', description: 'pwd', category: 'filesystem' },
      // Shell
      { command: 'echo "Hello World"', description: 'echo', category: 'shell' },
      // Database read
      { command: 'SELECT * FROM users WHERE id = 1', description: 'SQL SELECT', category: 'database' },
    ];

    it.each(lowCases)('should classify "$command" as LOW ($description)', ({ command, category }) => {
      const result = service.classifyRisk(command);
      expect(result.level).toBe('LOW');
      expect(result.category).toBe(category);
      expect(result.shouldCheckpoint).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should return LOW for empty string', () => {
      const result = service.classifyRisk('');
      expect(result.level).toBe('LOW');
      expect(result.category).toBe('unknown');
      expect(result.reason).toBe('Empty or invalid action');
    });

    it('should return LOW for null/undefined', () => {
      const result1 = service.classifyRisk(null as unknown as string);
      expect(result1.level).toBe('LOW');

      const result2 = service.classifyRisk(undefined as unknown as string);
      expect(result2.level).toBe('LOW');
    });

    it('should return LOW for unrecognized command', () => {
      const result = service.classifyRisk('some-unknown-command --flag');
      expect(result.level).toBe('LOW');
      expect(result.category).toBe('unknown');
      expect(result.reason).toBe('No matching risk pattern');
    });

    it('should handle commands with leading/trailing whitespace', () => {
      const result = service.classifyRisk('  git reset --hard  ');
      expect(result.level).toBe('HIGH');
    });

    it('should be case insensitive for git commands', () => {
      const result1 = service.classifyRisk('GIT RESET --HARD');
      const result2 = service.classifyRisk('Git Reset --Hard');
      expect(result1.level).toBe('HIGH');
      expect(result2.level).toBe('HIGH');
    });

    it('should distinguish git push from git push --force', () => {
      const normalPush = service.classifyRisk('git push origin main');
      const forcePush = service.classifyRisk('git push origin main --force');

      expect(normalPush.level).toBe('LOW');
      expect(forcePush.level).toBe('HIGH');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BATCH CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════

  describe('Batch Classification', () => {
    it('should classify multiple commands', () => {
      const commands = [
        'git status',
        'git reset --hard',
        'rm -rf ./build',
        'ls -la',
      ];

      const results = service.classifyRiskBatch(commands);

      expect(results).toHaveLength(4);
      expect(results[0].level).toBe('LOW');
      expect(results[1].level).toBe('HIGH');
      expect(results[2].level).toBe('HIGH');
      expect(results[3].level).toBe('LOW');
    });

    it('should return empty array for empty input', () => {
      const results = service.classifyRiskBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      HIGHEST RISK LEVEL
  // ═══════════════════════════════════════════════════════════════

  describe('getHighestRiskLevel', () => {
    it('should return highest risk level from classifications', () => {
      const classifications: RiskClassification[] = [
        { level: 'LOW', reason: 'test', category: 'git', shouldCheckpoint: false },
        { level: 'HIGH', reason: 'test', category: 'git', shouldCheckpoint: true },
        { level: 'MEDIUM', reason: 'test', category: 'git', shouldCheckpoint: false },
      ];

      const highest = service.getHighestRiskLevel(classifications);
      expect(highest).toBe('HIGH');
    });

    it('should return BLOCK if any classification is BLOCK', () => {
      const classifications: RiskClassification[] = [
        { level: 'LOW', reason: 'test', category: 'git', shouldCheckpoint: false },
        { level: 'BLOCK', reason: 'test', category: 'filesystem', shouldCheckpoint: true },
        { level: 'HIGH', reason: 'test', category: 'git', shouldCheckpoint: true },
      ];

      const highest = service.getHighestRiskLevel(classifications);
      expect(highest).toBe('BLOCK');
    });

    it('should return LOW for empty classifications', () => {
      const highest = service.getHighestRiskLevel([]);
      expect(highest).toBe('LOW');
    });

    it('should return LOW if all are LOW', () => {
      const classifications: RiskClassification[] = [
        { level: 'LOW', reason: 'test', category: 'git', shouldCheckpoint: false },
        { level: 'LOW', reason: 'test', category: 'filesystem', shouldCheckpoint: false },
      ];

      const highest = service.getHighestRiskLevel(classifications);
      expect(highest).toBe('LOW');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RESULT STRUCTURE
  // ═══════════════════════════════════════════════════════════════

  describe('Result Structure', () => {
    it('should return complete RiskClassification object', () => {
      const result = service.classifyRisk('git reset --hard');

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('shouldCheckpoint');
      expect(result.matchedPattern).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should include matched pattern in result', () => {
      const result = service.classifyRisk('git push --force');

      expect(result.matchedPattern).toBeDefined();
      expect(typeof result.matchedPattern).toBe('string');
    });

    it('should include metadata with pattern index', () => {
      const result = service.classifyRisk('rm -rf ./build');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.patternIndex).toBeDefined();
      expect(typeof result.metadata?.patternIndex).toBe('number');
    });
  });
});
