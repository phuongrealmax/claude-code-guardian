// tests/unit/completion-gates.test.ts

// Using vitest globals
import {
  CompletionGatesService,
  GatePolicyConfig,
  EvidenceState,
  GuardEvidence,
  TestEvidence,
  GatePolicyResult,
  createGuardEvidence,
  createTestEvidence,
  canComplete,
  formatGateResult,
  DEFAULT_GATE_POLICY,
  MAX_DETAILS_COUNT,
} from '../../src/core/completion-gates.js';

describe('CompletionGatesService', () => {
  let service: CompletionGatesService;

  beforeEach(() => {
    service = new CompletionGatesService();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BASIC EVALUATION
  // ═══════════════════════════════════════════════════════════════

  describe('Basic Gate Evaluation', () => {
    it('should return passed when all evidence is present and passed', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
      expect(result.missingEvidence).toHaveLength(0);
      expect(result.failingEvidence).toHaveLength(0);
      expect(result.nextToolCalls).toBeUndefined();
      expect(result.blockedReason).toBeUndefined();
    });

    it('should return pending when guard evidence is missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).not.toContain('test');
      expect(result.failingEvidence).toHaveLength(0);
    });

    it('should return pending when test evidence is missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('test');
      expect(result.missingEvidence).not.toContain('guard');
    });

    it('should return pending when both evidences are missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).toContain('test');
    });

    it('should return blocked when guard evidence failed', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', ['fake-test', 'empty-catch']),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('blocked');
      expect(result.failingEvidence).toHaveLength(1);
      expect(result.failingEvidence[0].type).toBe('guard');
      expect(result.failingEvidence[0].details).toContain('fake-test');
    });

    it('should return blocked when test evidence failed', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('failed', 'test-456', {
          failingTests: ['test1.spec.ts', 'test2.spec.ts'],
          consoleErrorsCount: 3,
        }),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('blocked');
      expect(result.failingEvidence).toHaveLength(1);
      expect(result.failingEvidence[0].type).toBe('test');
    });

    it('should return blocked when both evidences failed', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', ['rule1']),
        lastTestRun: createTestEvidence('failed', 'test-456', { failingTests: ['test1'] }),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('blocked');
      expect(result.failingEvidence).toHaveLength(2);
    });

    it('should treat skipped as missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('skipped', 'guard-123'),
        lastTestRun: createTestEvidence('skipped', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).toContain('test');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      NEXT TOOL CALLS
  // ═══════════════════════════════════════════════════════════════

  describe('Next Tool Calls', () => {
    it('should suggest guard_validate when guard is missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.nextToolCalls).toBeDefined();
      expect(result.nextToolCalls).toHaveLength(1);
      expect(result.nextToolCalls![0].tool).toBe('guard_validate');
      expect(result.nextToolCalls![0].reason).toContain('Missing');
    });

    it('should suggest testing_run when test is missing', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.nextToolCalls).toBeDefined();
      expect(result.nextToolCalls).toHaveLength(1);
      expect(result.nextToolCalls![0].tool).toBe('testing_run');
    });

    it('should suggest both tools when both missing (guard first)', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.nextToolCalls).toHaveLength(2);
      // Guard should have lower priority (run first)
      expect(result.nextToolCalls![0].tool).toBe('guard_validate');
      expect(result.nextToolCalls![0].priority).toBeLessThan(result.nextToolCalls![1].priority);
      expect(result.nextToolCalls![1].tool).toBe('testing_run');
    });

    it('should suggest re-running failed tool', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', ['rule1']),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.nextToolCalls).toBeDefined();
      const guardCall = result.nextToolCalls!.find(c => c.tool === 'guard_validate');
      expect(guardCall).toBeDefined();
      expect(guardCall!.reason).toContain('re-run');
    });

    it('should sort next tool calls by priority', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', ['rule1']),
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.nextToolCalls).toBeDefined();
      for (let i = 1; i < result.nextToolCalls!.length; i++) {
        expect(result.nextToolCalls![i - 1].priority).toBeLessThanOrEqual(result.nextToolCalls![i].priority);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  describe('Configuration', () => {
    it('should respect requireGuard=false', () => {
      const customService = new CompletionGatesService({ requireGuard: false });
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = customService.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
      expect(result.missingEvidence).not.toContain('guard');
    });

    it('should respect requireTest=false', () => {
      const customService = new CompletionGatesService({ requireTest: false });
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: null,
      };

      const result = customService.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
    });

    it('should pass when both requirements are disabled', () => {
      const customService = new CompletionGatesService({ requireGuard: false, requireTest: false });
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: null,
      };

      const result = customService.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
    });

    it('should update config dynamically', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      // Initially requires guard
      let result = service.evaluateCompletionGates(evidence);
      expect(result.status).toBe('pending');

      // Disable guard requirement
      service.updateConfig({ requireGuard: false });

      result = service.evaluateCompletionGates(evidence);
      expect(result.status).toBe('passed');
    });

    it('should return current config', () => {
      const config = service.getConfig();

      expect(config.requireGuard).toBe(DEFAULT_GATE_POLICY.requireGuard);
      expect(config.requireTest).toBe(DEFAULT_GATE_POLICY.requireTest);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STRICT TASK SCOPE
  // ═══════════════════════════════════════════════════════════════

  describe('Strict Task Scope', () => {
    it('should accept evidence without taskId in non-strict mode', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence, { taskId: 'task-abc' });

      expect(result.status).toBe('passed');
    });

    it('should require matching taskId in strict mode', () => {
      const strictService = new CompletionGatesService({ strictTaskScope: true });
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123', [], 'task-different'),
        lastTestRun: createTestEvidence('passed', 'test-456', { taskId: 'task-different' }),
      };

      const result = strictService.evaluateCompletionGates(evidence, { taskId: 'task-abc' });

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).toContain('test');
    });

    it('should pass in strict mode when taskId matches', () => {
      const strictService = new CompletionGatesService({ strictTaskScope: true });
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123', [], 'task-abc'),
        lastTestRun: createTestEvidence('passed', 'test-456', { taskId: 'task-abc' }),
      };

      const result = strictService.evaluateCompletionGates(evidence, { taskId: 'task-abc' });

      expect(result.status).toBe('passed');
    });

    it('should not require taskId if no context taskId provided', () => {
      const strictService = new CompletionGatesService({ strictTaskScope: true });
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = strictService.evaluateCompletionGates(evidence, {});

      expect(result.status).toBe('passed');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      EVIDENCE FRESHNESS
  // ═══════════════════════════════════════════════════════════════

  describe('Evidence Freshness', () => {
    it('should accept fresh evidence (within maxAgeMs)', () => {
      const freshTimestamp = new Date().toISOString();
      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: freshTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: freshTimestamp },
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
      expect(result.missingEvidence).toHaveLength(0);
    });

    it('should treat stale guard evidence as missing (older than maxAgeMs)', () => {
      // Default maxAgeMs is 5 minutes (300000ms)
      const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const freshTimestamp = new Date().toISOString();

      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: staleTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: freshTimestamp },
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).not.toContain('test');
    });

    it('should treat stale test evidence as missing (older than maxAgeMs)', () => {
      const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const freshTimestamp = new Date().toISOString();

      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: freshTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: staleTimestamp },
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('test');
      expect(result.missingEvidence).not.toContain('guard');
    });

    it('should disable freshness check when maxAgeMs is undefined', () => {
      const noFreshnessService = new CompletionGatesService({ maxAgeMs: undefined });
      const oldTimestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: oldTimestamp },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: oldTimestamp },
      };

      const result = noFreshnessService.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
    });

    it('should respect custom maxAgeMs value', () => {
      const shortMaxAgeService = new CompletionGatesService({ maxAgeMs: 60 * 1000 }); // 1 minute
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: twoMinutesAgo },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: twoMinutesAgo },
      };

      const result = shortMaxAgeService.evaluateCompletionGates(evidence);

      expect(result.status).toBe('pending');
      expect(result.missingEvidence).toContain('guard');
      expect(result.missingEvidence).toContain('test');
    });

    it('should accept evidence just under maxAgeMs threshold', () => {
      const justUnderThreshold = new Date(Date.now() - 4 * 60 * 1000).toISOString(); // 4 minutes (under 5 min default)

      const evidence: EvidenceState = {
        lastGuardRun: { ...createGuardEvidence('passed', 'guard-123'), timestamp: justUnderThreshold },
        lastTestRun: { ...createTestEvidence('passed', 'test-456'), timestamp: justUnderThreshold },
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.status).toBe('passed');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BLOCKED REASONS
  // ═══════════════════════════════════════════════════════════════

  describe('Blocked Reasons', () => {
    it('should provide clear reason for missing evidence', () => {
      const evidence: EvidenceState = {
        lastGuardRun: null,
        lastTestRun: null,
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.blockedReason).toBeDefined();
      expect(result.blockedReason).toContain('Missing');
      expect(result.blockedReason).toContain('guard');
      expect(result.blockedReason).toContain('test');
    });

    it('should provide clear reason for failed guard', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', ['fake-test']),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.blockedReason).toContain('failed');
      expect(result.blockedReason).toContain('guard');
    });

    it('should include test failure details', () => {
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('failed', 'test-456', {
          failingTests: ['test1.spec.ts', 'test2.spec.ts'],
          consoleErrorsCount: 5,
          networkFailuresCount: 2,
        }),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.failingEvidence[0].reason).toContain('2 failing tests');
      expect(result.failingEvidence[0].reason).toContain('5 console errors');
      expect(result.failingEvidence[0].reason).toContain('2 network failures');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DETAILS CAPPING
  // ═══════════════════════════════════════════════════════════════

  describe('Details Capping', () => {
    it('should cap failing rules to maxDetailItems', () => {
      const manyRules = Array.from({ length: 20 }, (_, i) => `rule-${i}`);
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', manyRules),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.failingEvidence[0].details).toHaveLength(MAX_DETAILS_COUNT);
    });

    it('should cap failing tests to maxDetailItems', () => {
      const manyTests = Array.from({ length: 20 }, (_, i) => `test-${i}.spec.ts`);
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('passed', 'guard-123'),
        lastTestRun: createTestEvidence('failed', 'test-456', { failingTests: manyTests }),
      };

      const result = service.evaluateCompletionGates(evidence);

      expect(result.failingEvidence[0].details).toHaveLength(MAX_DETAILS_COUNT);
    });

    it('should respect custom maxDetailItems', () => {
      const customService = new CompletionGatesService({ maxDetailItems: 3 });
      const manyRules = Array.from({ length: 10 }, (_, i) => `rule-${i}`);
      const evidence: EvidenceState = {
        lastGuardRun: createGuardEvidence('failed', 'guard-123', manyRules),
        lastTestRun: createTestEvidence('passed', 'test-456'),
      };

      const result = customService.evaluateCompletionGates(evidence);

      expect(result.failingEvidence[0].details).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Helper Functions', () => {
  describe('createGuardEvidence', () => {
    it('should create valid guard evidence', () => {
      const evidence = createGuardEvidence('passed', 'report-123', [], 'task-abc');

      expect(evidence.status).toBe('passed');
      expect(evidence.reportId).toBe('report-123');
      expect(evidence.timestamp).toBeDefined();
      expect(evidence.taskId).toBe('task-abc');
    });

    it('should cap failing rules', () => {
      const manyRules = Array.from({ length: 20 }, (_, i) => `rule-${i}`);
      const evidence = createGuardEvidence('failed', 'report-123', manyRules);

      expect(evidence.failingRules).toHaveLength(MAX_DETAILS_COUNT);
    });
  });

  describe('createTestEvidence', () => {
    it('should create valid test evidence', () => {
      const evidence = createTestEvidence('passed', 'run-123', {
        failingTests: [],
        consoleErrorsCount: 0,
        taskId: 'task-abc',
      });

      expect(evidence.status).toBe('passed');
      expect(evidence.runId).toBe('run-123');
      expect(evidence.timestamp).toBeDefined();
      expect(evidence.taskId).toBe('task-abc');
    });

    it('should use defaults for optional fields', () => {
      const evidence = createTestEvidence('passed', 'run-123');

      expect(evidence.failingTests).toEqual([]);
      expect(evidence.consoleErrorsCount).toBe(0);
      expect(evidence.networkFailuresCount).toBe(0);
    });
  });

  describe('canComplete', () => {
    it('should return true for passed status', () => {
      const result: GatePolicyResult = {
        status: 'passed',
        missingEvidence: [],
        failingEvidence: [],
      };

      expect(canComplete(result)).toBe(true);
    });

    it('should return false for pending status', () => {
      const result: GatePolicyResult = {
        status: 'pending',
        missingEvidence: ['guard'],
        failingEvidence: [],
      };

      expect(canComplete(result)).toBe(false);
    });

    it('should return false for blocked status', () => {
      const result: GatePolicyResult = {
        status: 'blocked',
        missingEvidence: [],
        failingEvidence: [{ type: 'guard', reason: 'failed' }],
      };

      expect(canComplete(result)).toBe(false);
    });
  });

  describe('formatGateResult', () => {
    it('should format passed result', () => {
      const result: GatePolicyResult = {
        status: 'passed',
        missingEvidence: [],
        failingEvidence: [],
      };

      const formatted = formatGateResult(result);

      expect(formatted).toContain('passed');
      expect(formatted).toContain('can be completed');
    });

    it('should format blocked result with next actions', () => {
      const result: GatePolicyResult = {
        status: 'blocked',
        missingEvidence: [],
        failingEvidence: [{ type: 'guard', reason: 'failed' }],
        blockedReason: 'Guard failed',
        nextToolCalls: [
          { tool: 'guard_validate', args: {}, reason: 're-run', priority: 0 },
        ],
      };

      const formatted = formatGateResult(result);

      expect(formatted).toContain('blocked');
      expect(formatted).toContain('Required actions');
      expect(formatted).toContain('guard_validate');
    });
  });
});
