import { vi } from 'vitest';
import { GuardService } from '../../src/modules/guard/guard.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';

// Mock dependencies
const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

describe('GuardService', () => {
  let guardService: GuardService;

  beforeEach(async () => {
    guardService = new GuardService({
      enabled: true,
      strictMode: true,
      rules: {
        blockFakeTests: true,
        blockDisabledFeatures: true,
        blockEmptyCatch: true,
        blockEmojiInCode: true,
        blockSwallowedExceptions: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();
  });

  describe('EmptyCatchRule', () => {
    it('should detect empty catch blocks', async () => {
      const code = `
        try {
          doSomething();
        } catch (e) {}
      `;
      const result = await guardService.validate(code, 'test.ts');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].rule).toBe('empty-catch');
      expect(result.issues[0].message).toContain('Empty catch block');
    });

    it('should allow catch blocks with error logging', async () => {
      const code = `
        try {
          doSomething();
        } catch (e) { console.error(e); }
      `;
      const result = await guardService.validate(code, 'test.ts');
      const emptyCatchIssues = result.issues.filter(i => i.rule === 'empty-catch');
      expect(emptyCatchIssues).toHaveLength(0);
    });

    it('should allow catch blocks with throw', async () => {
      const code = `
        try {
          doSomething();
        } catch (e) { throw new Error('Failed'); }
      `;
      const result = await guardService.validate(code, 'test.ts');
      const emptyCatchIssues = result.issues.filter(i => i.rule === 'empty-catch');
      expect(emptyCatchIssues).toHaveLength(0);
    });

    it('should detect Promise .catch with empty handler', async () => {
      const code = `
        fetch('/api').catch(() => {});
      `;
      const result = await guardService.validate(code, 'test.ts');
      const emptyCatchIssues = result.issues.filter(i => i.rule === 'empty-catch');
      expect(emptyCatchIssues.length).toBeGreaterThan(0);
    });
  });

  describe('FakeTestRule', () => {
    it('should detect tests without assertions', async () => {
      const code = `
        it('should do something', () => {
          const a = 1 + 1;
        });
      `;
      const result = await guardService.validate(code, 'app.test.ts');

      // FakeTestRule uses severity='block', so in strictMode it should block
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain('no assertions');
    });

    it('should pass valid tests with expect()', async () => {
      const code = `
        it('should do something', () => {
          expect(1 + 1).toBe(2);
        });
      `;
      const result = await guardService.validate(code, 'app.test.ts');
      const fakeTestIssues = result.issues.filter(i => i.rule === 'fake-test');
      expect(fakeTestIssues).toHaveLength(0);
    });

    it('should pass valid tests with assert()', async () => {
      const code = `
        test('should calculate correctly', () => {
          assert.equal(2 + 2, 4);
        });
      `;
      const result = await guardService.validate(code, 'app.test.ts');
      const fakeTestIssues = result.issues.filter(i => i.rule === 'fake-test');
      expect(fakeTestIssues).toHaveLength(0);
    });

    it('should skip tests marked as skipped', async () => {
      const code = `
        it.skip('should do something', () => {
          const a = 1 + 1;
        });
      `;
      const result = await guardService.validate(code, 'app.test.ts');
      const fakeTestIssues = result.issues.filter(i => i.rule === 'fake-test');
      expect(fakeTestIssues).toHaveLength(0);
    });
  });

  describe('EmojiCodeRule', () => {
    it('should detect emoji in code', async () => {
      const code = `const message = "Hello";`;
      const result = await guardService.validate(code, 'app.ts');
      // Should pass because no emoji
      const emojiIssues = result.issues.filter(i => i.rule === 'emoji-code');
      expect(emojiIssues).toHaveLength(0);
    });

    it('should detect emoji in string literals', async () => {
      const code = `const message = "Hello \u{1F680}";`;
      const result = await guardService.validate(code, 'app.ts');

      const emojiIssues = result.issues.filter(i => i.rule === 'emoji-code');
      expect(emojiIssues.length).toBeGreaterThan(0);
    });

    it('should skip markdown files', async () => {
      const code = `# Hello \u{1F680} World`;
      const result = await guardService.validate(code, 'README.md');
      const emojiIssues = result.issues.filter(i => i.rule === 'emoji-code');
      expect(emojiIssues).toHaveLength(0);
    });
  });

  describe('Rule Management', () => {
    it('should list available rules', () => {
      const rules = guardService.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.name === 'empty-catch')).toBe(true);
      expect(rules.some(r => r.name === 'fake-test')).toBe(true);
      expect(rules.some(r => r.name === 'emoji-code')).toBe(true);
    });

    it('should enable/disable rules', () => {
      const success = guardService.setRuleEnabled('empty-catch', false);
      expect(success).toBe(true);

      const rules = guardService.getRules();
      const emptyCatchRule = rules.find(r => r.name === 'empty-catch');
      expect(emptyCatchRule?.enabled).toBe(false);
    });

    it('should return false for unknown rules', () => {
      const success = guardService.setRuleEnabled('unknown-rule', true);
      expect(success).toBe(false);
    });
  });

  describe('Module Status', () => {
    it('should return correct status', async () => {
      // Run a validation first
      await guardService.validate('const x = 1;', 'test.ts');

      const status = guardService.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.strictMode).toBe(true);
      expect(status.rules.length).toBeGreaterThan(0);
      expect(status.stats.validationsRun).toBe(1);
    });
  });
});

describe('GuardService - Disabled', () => {
  it('should skip validation when disabled', async () => {
    const guardService = new GuardService({
      enabled: false,
      strictMode: true,
      rules: {
        blockFakeTests: true,
        blockDisabledFeatures: true,
        blockEmptyCatch: true,
        blockEmojiInCode: true,
        blockSwallowedExceptions: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();

    const code = `try {} catch (e) {}`;
    const result = await guardService.validate(code, 'test.ts');

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//                      RULESET INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

import {
  getRulesForRuleset,
  isValidRuleset,
  getAvailableRulesets,
  getRulesetDescription,
  FRONTEND_RULES,
  BACKEND_RULES,
  SECURITY_RULES,
  TESTING_RULES,
  DEFAULT_RULES,
  GuardRuleset,
} from '../../src/modules/guard/guard.rulesets.js';

describe('Guard Rulesets', () => {
  describe('getRulesForRuleset', () => {
    it('should return frontend rules for frontend ruleset', () => {
      const rules = getRulesForRuleset('frontend');
      expect(rules).toEqual(FRONTEND_RULES);
      expect(rules).toContain('large-component');
      expect(rules).toContain('inline-styles');
      expect(rules).toContain('mixed-concerns');
      expect(rules).toContain('xss-vulnerability');
    });

    it('should return backend rules for backend ruleset', () => {
      const rules = getRulesForRuleset('backend');
      expect(rules).toEqual(BACKEND_RULES);
      expect(rules).toContain('sql-injection');
      expect(rules).toContain('command-injection');
      expect(rules).toContain('path-traversal');
      expect(rules).toContain('hardcoded-secrets');
    });

    it('should return security rules for security ruleset', () => {
      const rules = getRulesForRuleset('security');
      expect(rules).toEqual(SECURITY_RULES);
      expect(rules).toContain('sql-injection');
      expect(rules).toContain('xss-vulnerability');
      expect(rules).toContain('prompt-injection');
    });

    it('should return testing rules for testing ruleset', () => {
      const rules = getRulesForRuleset('testing');
      expect(rules).toEqual(TESTING_RULES);
      expect(rules).toContain('fake-test');
      expect(rules).toContain('disabled-feature');
    });

    it('should return default rules for default ruleset', () => {
      const rules = getRulesForRuleset('default');
      expect(rules).toEqual(DEFAULT_RULES);
    });

    it('should return default rules for unknown ruleset', () => {
      const rules = getRulesForRuleset('unknown-ruleset');
      expect(rules).toEqual(DEFAULT_RULES);
    });
  });

  describe('isValidRuleset', () => {
    it('should return true for valid rulesets', () => {
      expect(isValidRuleset('frontend')).toBe(true);
      expect(isValidRuleset('backend')).toBe(true);
      expect(isValidRuleset('security')).toBe(true);
      expect(isValidRuleset('testing')).toBe(true);
      expect(isValidRuleset('default')).toBe(true);
    });

    it('should return false for invalid rulesets', () => {
      expect(isValidRuleset('unknown')).toBe(false);
      expect(isValidRuleset('custom')).toBe(false);
      expect(isValidRuleset('')).toBe(false);
    });
  });

  describe('getAvailableRulesets', () => {
    it('should return all available rulesets', () => {
      const rulesets = getAvailableRulesets();
      expect(rulesets).toContain('frontend');
      expect(rulesets).toContain('backend');
      expect(rulesets).toContain('security');
      expect(rulesets).toContain('testing');
      expect(rulesets).toContain('default');
      expect(rulesets).toHaveLength(5);
    });
  });

  describe('getRulesetDescription', () => {
    it('should return description for each ruleset', () => {
      const frontendDesc = getRulesetDescription('frontend');
      expect(frontendDesc).toContain('React');
      expect(frontendDesc).toContain('component');

      const backendDesc = getRulesetDescription('backend');
      expect(backendDesc).toContain('API');
      expect(backendDesc).toContain('security');

      const securityDesc = getRulesetDescription('security');
      expect(securityDesc).toContain('security');

      const testingDesc = getRulesetDescription('testing');
      expect(testingDesc).toContain('test');

      const defaultDesc = getRulesetDescription('default');
      expect(defaultDesc).toContain('general');
    });
  });
});

describe('GuardService - Ruleset Filtering', () => {
  let guardService: GuardService;

  beforeEach(async () => {
    guardService = new GuardService({
      enabled: true,
      strictMode: false,
      rules: {
        blockFakeTests: true,
        blockDisabledFeatures: true,
        blockEmptyCatch: true,
        blockEmojiInCode: true,
        // Enable all security rules
        blockSqlInjection: true,
        blockHardcodedSecrets: true,
        blockXss: true,
        blockCommandInjection: true,
        blockPathTraversal: true,
        blockPromptInjection: true,
        // Enable frontend rules
        blockLargeComponents: true,
        blockInlineStyles: true,
        blockMixedConcerns: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();
  });

  it('should filter rules by frontend ruleset', async () => {
    // Code with XSS vulnerability (should be caught by frontend ruleset)
    const code = `
      function render() {
        element.innerHTML = userInput;
      }
    `;

    const result = await guardService.validate(code, 'component.tsx', {
      ruleset: 'frontend',
    });

    // XSS should be detected (it's in frontend ruleset)
    const xssIssues = result.issues.filter(i => i.rule === 'xss-vulnerability');
    expect(xssIssues.length).toBeGreaterThan(0);
  });

  it('should filter rules by backend ruleset', async () => {
    // Code with SQL injection (should be caught by backend ruleset)
    const code = `
      const query = "SELECT * FROM users WHERE id = " + userId;
    `;

    const result = await guardService.validate(code, 'api.ts', {
      ruleset: 'backend',
    });

    // SQL injection should be detected (it's in backend ruleset)
    const sqlIssues = result.issues.filter(i => i.rule === 'sql-injection');
    expect(sqlIssues.length).toBeGreaterThan(0);
  });

  it('should filter rules by testing ruleset', async () => {
    // Test file without assertions
    const code = `
      it('should do something', () => {
        const result = 1 + 1;
      });
    `;

    const result = await guardService.validate(code, 'app.test.ts', {
      ruleset: 'testing',
    });

    // Fake test should be detected
    const fakeTestIssues = result.issues.filter(i => i.rule === 'fake-test');
    expect(fakeTestIssues.length).toBeGreaterThan(0);
  });

  it('should use testing ruleset and NOT detect non-testing rules', async () => {
    // Code with empty catch but using testing ruleset
    const code = `
      try { doSomething(); } catch (e) {}
      it('test', () => { expect(true).toBe(true); });
    `;

    const result = await guardService.validate(code, 'app.test.ts', {
      ruleset: 'testing',
    });

    // Empty catch should NOT be detected (not in testing ruleset)
    const emptyCatchIssues = result.issues.filter(i => i.rule === 'empty-catch');
    expect(emptyCatchIssues).toHaveLength(0);
  });

  it('should prefer ruleset over individual rules when both provided', async () => {
    // When both ruleset and rules are provided, ruleset takes precedence
    const code = `
      try { doSomething(); } catch (e) {}
    `;

    const result = await guardService.validate(code, 'test.ts', {
      ruleset: 'testing',
      rules: ['empty-catch'], // This should be ignored
    });

    // Testing ruleset doesn't include empty-catch
    const emptyCatchIssues = result.issues.filter(i => i.rule === 'empty-catch');
    expect(emptyCatchIssues).toHaveLength(0);
  });
});

describe('GuardService - Evidence Persistence', () => {
  let guardService: GuardService;

  beforeEach(async () => {
    guardService = new GuardService({
      enabled: true,
      strictMode: false,
      rules: {
        blockFakeTests: true,
        blockEmptyCatch: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();
  });

  it('should build detailed result after validation', async () => {
    const code = `try { x(); } catch (e) {}`;
    await guardService.validate(code, 'test.ts', { taskId: 'task-123' });

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult).toBeDefined();
    expect(detailedResult?.runId).toBeDefined();
    expect(detailedResult?.timestamp).toBeDefined();
    expect(detailedResult?.filename).toBe('test.ts');
    expect(detailedResult?.taskId).toBe('task-123');
  });

  it('should track failing rules in detailed result', async () => {
    const code = `try { x(); } catch (e) {}`;
    await guardService.validate(code, 'test.ts');

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult?.failingRules).toContain('empty-catch');
    expect(detailedResult?.issueCount).toBeGreaterThan(0);
  });

  it('should mark passed when no blocking issues', async () => {
    const code = `const x = 1;`;
    await guardService.validate(code, 'app.ts');

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult?.passed).toBe(true);
    expect(detailedResult?.failingRules).toHaveLength(0);
  });

  it('should include ruleset in detailed result', async () => {
    const code = `const x = 1;`;
    await guardService.validate(code, 'app.ts', { ruleset: 'frontend' });

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult?.ruleset).toBe('frontend');
  });

  it('should use currentTaskId when taskId not provided in options', async () => {
    guardService.setCurrentTaskId('current-task-456');

    const code = `const x = 1;`;
    await guardService.validate(code, 'app.ts');

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult?.taskId).toBe('current-task-456');
  });

  it('should cap topIssues to 5', async () => {
    // Code that triggers multiple issues
    const code = `
      try { a(); } catch (e) {}
      try { b(); } catch (e) {}
      try { c(); } catch (e) {}
      try { d(); } catch (e) {}
      try { e(); } catch (e) {}
      try { f(); } catch (e) {}
      try { g(); } catch (e) {}
    `;
    await guardService.validate(code, 'test.ts');

    const detailedResult = guardService.getLastDetailedResult();
    expect(detailedResult?.topIssues.length).toBeLessThanOrEqual(5);
  });
});

describe('GuardService - StateManager Integration', () => {
  it('should call setStateManager', () => {
    const guardService = new GuardService({
      enabled: true,
      strictMode: false,
      rules: {},
    }, mockEventBus, mockLogger);

    // Create a mock StateManager
    const mockStateManager = {
      setGuardEvidence: vi.fn(),
    };

    // Should not throw
    expect(() => {
      guardService.setStateManager(mockStateManager as any);
    }).not.toThrow();
  });

  it('should persist evidence when StateManager is set', async () => {
    const guardService = new GuardService({
      enabled: true,
      strictMode: false,
      rules: {
        blockEmptyCatch: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();

    const setGuardEvidenceMock = vi.fn();
    const mockStateManager = {
      setGuardEvidence: setGuardEvidenceMock,
    };
    guardService.setStateManager(mockStateManager as any);

    await guardService.validate('try {} catch(e) {}', 'test.ts');

    expect(setGuardEvidenceMock).toHaveBeenCalled();
    const evidence = setGuardEvidenceMock.mock.calls[0][0];
    expect(evidence.status).toBe('failed');
    expect(evidence.failingRules).toContain('empty-catch');
  });

  it('should persist passing evidence when validation passes', async () => {
    const guardService = new GuardService({
      enabled: true,
      strictMode: false,
      rules: {
        blockEmptyCatch: true,
      },
    }, mockEventBus, mockLogger);
    await guardService.initialize();

    const setGuardEvidenceMock = vi.fn();
    const mockStateManager = {
      setGuardEvidence: setGuardEvidenceMock,
    };
    guardService.setStateManager(mockStateManager as any);

    await guardService.validate('const x = 1;', 'test.ts');

    expect(setGuardEvidenceMock).toHaveBeenCalled();
    const evidence = setGuardEvidenceMock.mock.calls[0][0];
    expect(evidence.status).toBe('passed');
    expect(evidence.failingRules).toHaveLength(0);
  });
});
