// tests/unit/task-graph-templates.test.ts

// Note: Using vitest globals (describe, it, expect) from vitest.config.ts
import { TASK_TEMPLATES, DEPENDENCY_TEMPLATES, GATE_POLICIES } from '../../src/modules/auto-agent/task-graph-templates.js';

describe('task-graph-templates', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      GATE_POLICIES (Sprint 6)
  // ═══════════════════════════════════════════════════════════════

  describe('GATE_POLICIES', () => {
    it('should have impl policy requiring only guard', () => {
      expect(GATE_POLICIES.impl).toBeDefined();
      expect(GATE_POLICIES.impl.requireGuard).toBe(true);
      expect(GATE_POLICIES.impl.requireTest).toBe(false);
    });

    it('should have test policy requiring only test', () => {
      expect(GATE_POLICIES.test).toBeDefined();
      expect(GATE_POLICIES.test.requireGuard).toBe(false);
      expect(GATE_POLICIES.test.requireTest).toBe(true);
    });

    it('should have review policy requiring both guard and test', () => {
      expect(GATE_POLICIES.review).toBeDefined();
      expect(GATE_POLICIES.review.requireGuard).toBe(true);
      expect(GATE_POLICIES.review.requireTest).toBe(true);
    });

    it('should have none policy requiring nothing', () => {
      expect(GATE_POLICIES.none).toBeDefined();
      expect(GATE_POLICIES.none.requireGuard).toBe(false);
      expect(GATE_POLICIES.none.requireTest).toBe(false);
    });

    it('should have exactly 4 policies', () => {
      expect(Object.keys(GATE_POLICIES).length).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TASK_TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  describe('TASK_TEMPLATES', () => {
    it('should have feature template', () => {
      expect(TASK_TEMPLATES).toHaveProperty('feature');
      expect(Array.isArray(TASK_TEMPLATES.feature)).toBe(true);
      expect(TASK_TEMPLATES.feature.length).toBeGreaterThan(0);
    });

    it('should have bugfix template', () => {
      expect(TASK_TEMPLATES).toHaveProperty('bugfix');
      expect(Array.isArray(TASK_TEMPLATES.bugfix)).toBe(true);
      expect(TASK_TEMPLATES.bugfix.length).toBeGreaterThan(0);
    });

    it('should have refactor template', () => {
      expect(TASK_TEMPLATES).toHaveProperty('refactor');
      expect(Array.isArray(TASK_TEMPLATES.refactor)).toBe(true);
      expect(TASK_TEMPLATES.refactor.length).toBeGreaterThan(0);
    });

    it('should have review template', () => {
      expect(TASK_TEMPLATES).toHaveProperty('review');
      expect(Array.isArray(TASK_TEMPLATES.review)).toBe(true);
      expect(TASK_TEMPLATES.review.length).toBeGreaterThan(0);
    });

    it('should have valid task node structure in feature template', () => {
      const featureTasks = TASK_TEMPLATES.feature;

      featureTasks.forEach(task => {
        expect(task.name).toBeDefined();
        expect(typeof task.name).toBe('string');
        expect(task.phase).toBeDefined();
        expect(['analysis', 'plan', 'impl', 'test', 'review']).toContain(task.phase);
        expect(Array.isArray(task.tools)).toBe(true);
        expect(task.estimatedTokens).toBeDefined();
        expect(typeof task.estimatedTokens).toBe('number');
        expect(task.priority).toBeDefined();
        expect(typeof task.priority).toBe('number');
      });
    });

    it('should have analysis tasks in feature template', () => {
      const analysisTasks = TASK_TEMPLATES.feature.filter(t => t.phase === 'analysis');
      expect(analysisTasks.length).toBeGreaterThan(0);
    });

    it('should have impl tasks in feature template', () => {
      const implTasks = TASK_TEMPLATES.feature.filter(t => t.phase === 'impl');
      expect(implTasks.length).toBeGreaterThan(0);
    });

    it('should have test tasks in feature template', () => {
      const testTasks = TASK_TEMPLATES.feature.filter(t => t.phase === 'test');
      expect(testTasks.length).toBeGreaterThan(0);
    });

    it('should have review tasks in feature template', () => {
      const reviewTasks = TASK_TEMPLATES.feature.filter(t => t.phase === 'review');
      expect(reviewTasks.length).toBeGreaterThan(0);
    });

    it('should have reasonable token estimates', () => {
      Object.values(TASK_TEMPLATES).forEach(template => {
        template.forEach(task => {
          expect(task.estimatedTokens).toBeGreaterThan(0);
          expect(task.estimatedTokens).toBeLessThanOrEqual(3000);
        });
      });
    });

    it('should have priorities in valid range', () => {
      Object.values(TASK_TEMPLATES).forEach(template => {
        template.forEach(task => {
          expect(task.priority).toBeGreaterThanOrEqual(1);
          expect(task.priority).toBeLessThanOrEqual(10);
        });
      });
    });

    it('should reference valid MCP tools', () => {
      const validTools = [
        'documents_search', 'memory_recall', 'rag_query', 'rag_related_code',
        'thinking_get_model', 'thinking_get_style', 'thinking_get_workflow',
        'latent_apply_patch', 'guard_validate', 'testing_run', 'testing_run_affected',
        'memory_store', 'documents_create',
      ];

      Object.values(TASK_TEMPLATES).forEach(template => {
        template.forEach(task => {
          task.tools?.forEach(tool => {
            expect(validTools).toContain(tool);
          });
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DEPENDENCY_TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  describe('DEPENDENCY_TEMPLATES', () => {
    it('should have dependency template for each task template', () => {
      expect(Object.keys(DEPENDENCY_TEMPLATES)).toEqual(Object.keys(TASK_TEMPLATES));
    });

    it('should have valid dependency pairs in feature template', () => {
      const deps = DEPENDENCY_TEMPLATES.feature;
      const taskCount = TASK_TEMPLATES.feature.length;

      deps.forEach(([dependent, dependsOn]) => {
        expect(dependent).toBeGreaterThanOrEqual(0);
        expect(dependent).toBeLessThan(taskCount);
        expect(dependsOn).toBeGreaterThanOrEqual(0);
        expect(dependsOn).toBeLessThan(taskCount);
        expect(dependent).toBeGreaterThan(dependsOn); // DAG: later tasks depend on earlier ones
      });
    });

    it('should have valid dependency pairs in bugfix template', () => {
      const deps = DEPENDENCY_TEMPLATES.bugfix;
      const taskCount = TASK_TEMPLATES.bugfix.length;

      deps.forEach(([dependent, dependsOn]) => {
        expect(dependent).toBeLessThan(taskCount);
        expect(dependsOn).toBeLessThan(taskCount);
      });
    });

    it('should have valid dependency pairs in refactor template', () => {
      const deps = DEPENDENCY_TEMPLATES.refactor;
      const taskCount = TASK_TEMPLATES.refactor.length;

      deps.forEach(([dependent, dependsOn]) => {
        expect(dependent).toBeLessThan(taskCount);
        expect(dependsOn).toBeLessThan(taskCount);
      });
    });

    it('should have valid dependency pairs in review template', () => {
      const deps = DEPENDENCY_TEMPLATES.review;
      const taskCount = TASK_TEMPLATES.review.length;

      deps.forEach(([dependent, dependsOn]) => {
        expect(dependent).toBeLessThan(taskCount);
        expect(dependsOn).toBeLessThan(taskCount);
      });
    });

    it('should not have circular dependencies', () => {
      // For DAG, we verify that dependent index > dependsOn index
      // This ensures we can always find a topological order
      Object.entries(DEPENDENCY_TEMPLATES).forEach(([type, deps]) => {
        deps.forEach(([dependent, dependsOn]) => {
          expect(dependent).toBeGreaterThan(
            dependsOn,
            `Circular dependency in ${type}: task ${dependent} depends on task ${dependsOn}`
          );
        });
      });
    });

    it('should have multiple dependency pairs in feature template', () => {
      // Feature is complex - should have several dependency pairs
      const deps = DEPENDENCY_TEMPLATES.feature;
      expect(deps.length).toBeGreaterThanOrEqual(5);

      // Should have tasks that depend on multiple prior tasks
      const dependentCounts = new Map<number, number>();
      deps.forEach(([dependent]) => {
        dependentCounts.set(dependent, (dependentCounts.get(dependent) || 0) + 1);
      });

      // At least some tasks should have multiple dependencies
      const multiDependentTasks = Array.from(dependentCounts.values()).filter(c => c > 1);
      expect(multiDependentTasks.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SPECIFIC TEMPLATE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('feature template specifics', () => {
    it('should start with analysis tasks', () => {
      expect(TASK_TEMPLATES.feature[0].phase).toBe('analysis');
      expect(TASK_TEMPLATES.feature[1].phase).toBe('analysis');
    });

    it('should have design in plan phase', () => {
      const designTask = TASK_TEMPLATES.feature.find(t => t.name.includes('Design'));
      expect(designTask?.phase).toBe('plan');
    });

    it('should end with final review', () => {
      const lastTask = TASK_TEMPLATES.feature[TASK_TEMPLATES.feature.length - 1];
      expect(lastTask.phase).toBe('review');
      expect(lastTask.name).toContain('Review');
    });
  });

  describe('bugfix template specifics', () => {
    it('should start with reproduce bug', () => {
      expect(TASK_TEMPLATES.bugfix[0].name).toContain('Reproduce');
    });

    it('should include regression test', () => {
      const regressionTask = TASK_TEMPLATES.bugfix.find(t => t.name.includes('Regression'));
      expect(regressionTask).toBeDefined();
      expect(regressionTask?.phase).toBe('test');
    });

    it('should end with verify fix', () => {
      const lastTask = TASK_TEMPLATES.bugfix[TASK_TEMPLATES.bugfix.length - 1];
      expect(lastTask.name).toContain('Verify');
    });
  });

  describe('refactor template specifics', () => {
    it('should include safety tests before refactoring', () => {
      const safetyTest = TASK_TEMPLATES.refactor.find(t => t.name.includes('Safety'));
      const applyRefactor = TASK_TEMPLATES.refactor.find(t => t.name.includes('Apply'));

      const safetyIndex = TASK_TEMPLATES.refactor.indexOf(safetyTest!);
      const applyIndex = TASK_TEMPLATES.refactor.indexOf(applyRefactor!);

      expect(safetyIndex).toBeLessThan(applyIndex);
    });

    it('should verify no regressions at the end', () => {
      const lastTask = TASK_TEMPLATES.refactor[TASK_TEMPLATES.refactor.length - 1];
      expect(lastTask.name).toContain('Verify');
      expect(lastTask.name).toContain('Regression');
    });
  });

  describe('review template specifics', () => {
    it('should include security check', () => {
      const securityTask = TASK_TEMPLATES.review.find(t => t.name.includes('Security'));
      expect(securityTask).toBeDefined();
      expect(securityTask?.tools).toContain('guard_validate');
    });

    it('should include quality check', () => {
      const qualityTask = TASK_TEMPLATES.review.find(t => t.name.includes('Quality'));
      expect(qualityTask).toBeDefined();
    });

    it('should generate report at the end', () => {
      const lastTask = TASK_TEMPLATES.review[TASK_TEMPLATES.review.length - 1];
      expect(lastTask.name).toContain('Report');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //              GATE POLICY INTEGRATION (Sprint 6)
  // ═══════════════════════════════════════════════════════════════

  describe('gate policy integration in templates', () => {
    it('should have gatePolicy on final review in feature template', () => {
      const finalReview = TASK_TEMPLATES.feature.find(t => t.name.includes('Final Review'));
      expect(finalReview).toBeDefined();
      expect(finalReview?.gatePolicy).toBeDefined();
      expect(finalReview?.gatePolicy?.requireGuard).toBe(true);
      expect(finalReview?.gatePolicy?.requireTest).toBe(true);
    });

    it('should have gatePolicy on verify fix in bugfix template', () => {
      const verifyFix = TASK_TEMPLATES.bugfix.find(t => t.name.includes('Verify'));
      expect(verifyFix).toBeDefined();
      expect(verifyFix?.gatePolicy).toBeDefined();
      expect(verifyFix?.gatePolicy?.requireGuard).toBe(true);
      expect(verifyFix?.gatePolicy?.requireTest).toBe(true);
    });

    it('should have gatePolicy on verify no regressions in refactor template', () => {
      const verifyRegression = TASK_TEMPLATES.refactor.find(t => t.name.includes('Verify'));
      expect(verifyRegression).toBeDefined();
      expect(verifyRegression?.gatePolicy).toBeDefined();
      expect(verifyRegression?.gatePolicy?.requireGuard).toBe(true);
      expect(verifyRegression?.gatePolicy?.requireTest).toBe(true);
    });

    it('should have review phases with strict gate policies', () => {
      // All templates that have review phase should require both guard AND test
      Object.entries(TASK_TEMPLATES).forEach(([templateName, tasks]) => {
        const reviewTasks = tasks.filter(t => t.phase === 'review' && t.gatePolicy);
        reviewTasks.forEach(task => {
          expect(
            task.gatePolicy?.requireGuard && task.gatePolicy?.requireTest
          ).toBe(true);
        });
      });
    });
  });
});
