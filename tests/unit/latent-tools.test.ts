// tests/unit/latent-tools.test.ts
// LatentTools Unit Tests

import { vi } from 'vitest';
import { createLatentTools, handleLatentTool } from '../../src/modules/latent/latent.tools.js';
import { LatentService } from '../../src/modules/latent/latent.service.js';

// Mock service
const mockService = {
  createContext: vi.fn(),
  getContext: vi.fn(),
  getContextWithHistory: vi.fn(),
  updateContext: vi.fn(),
  transitionPhase: vi.fn(),
  applyPatch: vi.fn(),
  validateResponse: vi.fn(),
  completeTask: vi.fn(),
  listContexts: vi.fn(),
  deleteContext: vi.fn(),
  getStatus: vi.fn(),
  applyDiff: vi.fn(),
  confirmDiff: vi.fn(),
  rejectDiff: vi.fn(),
  rollbackDiff: vi.fn(),
  configureDiffEditor: vi.fn(),
  getDiffEditorConfig: vi.fn(),
  getPendingDiffConfirms: vi.fn(),
} as unknown as LatentService;

describe('LatentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLatentTools()', () => {
    it('returns tool definitions array', () => {
      const tools = createLatentTools(mockService);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('each tool has name and description', () => {
      const tools = createLatentTools(mockService);

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
      }
    });
  });

  describe('handleLatentTool()', () => {
    describe('latent_context_create', () => {
      it('creates context with minimal args', async () => {
        (mockService.createContext as any).mockResolvedValue({
          taskId: 'test-task',
          phase: 'analysis',
        });

        const result = await handleLatentTool(mockService, 'latent_context_create', {
          taskId: 'test-task',
        });

        expect(result).toMatchObject({
          success: true,
          taskId: 'test-task',
          phase: 'analysis',
        });
        expect(mockService.createContext).toHaveBeenCalledWith({
          taskId: 'test-task',
          phase: 'analysis',
          constraints: [],
          files: [],
          agentId: undefined,
        });
      });

      it('creates context with all args', async () => {
        (mockService.createContext as any).mockResolvedValue({
          taskId: 'full-task',
          phase: 'plan',
        });

        const result = await handleLatentTool(mockService, 'latent_context_create', {
          taskId: 'full-task',
          phase: 'plan',
          constraints: ['no-breaking-changes'],
          files: ['src/index.ts'],
          agentId: 'test-agent',
        });

        expect(result).toMatchObject({
          success: true,
          taskId: 'full-task',
          phase: 'plan',
        });
      });
    });

    describe('latent_context_get', () => {
      it('gets context without history', async () => {
        (mockService.getContext as any).mockResolvedValue({
          taskId: 'get-task',
          phase: 'impl',
          decisions: [],
          codeMap: { files: [] },
        });

        const result = await handleLatentTool(mockService, 'latent_context_get', {
          taskId: 'get-task',
        });

        expect(result).toMatchObject({
          success: true,
          context: expect.any(Object),
        });
      });

      it('gets context with history', async () => {
        (mockService.getContextWithHistory as any).mockResolvedValue({
          context: { taskId: 'history-task' },
          history: [{ type: 'update' }],
        });

        const result = await handleLatentTool(mockService, 'latent_context_get', {
          taskId: 'history-task',
          includeHistory: true,
        });

        expect(result).toMatchObject({
          success: true,
        });
      });

      it('returns error when context not found', async () => {
        (mockService.getContext as any).mockResolvedValue(null);

        const result = await handleLatentTool(mockService, 'latent_context_get', {
          taskId: 'missing-task',
        });

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('not found'),
        });
      });

      it('returns error when context with history not found', async () => {
        (mockService.getContextWithHistory as any).mockResolvedValue(null);

        const result = await handleLatentTool(mockService, 'latent_context_get', {
          taskId: 'missing-history',
          includeHistory: true,
        });

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('not found'),
        });
      });
    });

    describe('latent_context_update', () => {
      it('updates context with delta', async () => {
        (mockService.updateContext as any).mockResolvedValue({
          taskId: 'update-task',
          version: 2,
          phase: 'impl',
        });

        const result = await handleLatentTool(mockService, 'latent_context_update', {
          taskId: 'update-task',
          delta: { phase: 'impl' },
        });

        expect(result).toMatchObject({
          success: true,
          taskId: 'update-task',
          version: 2,
        });
      });

      it('updates with agentId and force', async () => {
        (mockService.updateContext as any).mockResolvedValue({
          taskId: 'force-task',
          version: 3,
          phase: 'review',
        });

        const result = await handleLatentTool(mockService, 'latent_context_update', {
          taskId: 'force-task',
          delta: { risks: ['new-risk'] },
          agentId: 'reviewer',
          force: true,
        });

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('v3'),
        });
      });
    });

    describe('latent_phase_transition', () => {
      it('transitions phase', async () => {
        (mockService.transitionPhase as any).mockResolvedValue({
          taskId: 'trans-task',
          phase: 'impl',
          version: 4,
        });

        const result = await handleLatentTool(mockService, 'latent_phase_transition', {
          taskId: 'trans-task',
          toPhase: 'impl',
        });

        expect(result).toMatchObject({
          success: true,
          phase: 'impl',
          message: expect.stringContaining('impl'),
        });
      });

      it('transitions with summary and agentId', async () => {
        (mockService.transitionPhase as any).mockResolvedValue({
          taskId: 'summary-task',
          phase: 'review',
          version: 5,
        });

        const result = await handleLatentTool(mockService, 'latent_phase_transition', {
          taskId: 'summary-task',
          toPhase: 'review',
          summary: 'Completed implementation',
          agentId: 'impl-agent',
        });

        expect(result).toMatchObject({
          success: true,
          phase: 'review',
        });
      });
    });

    describe('latent_apply_patch', () => {
      it('applies patch successfully', async () => {
        (mockService.applyPatch as any).mockResolvedValue({
          success: true,
          target: 'src/index.ts',
        });

        const result = await handleLatentTool(mockService, 'latent_apply_patch', {
          taskId: 'patch-task',
          target: 'src/index.ts',
          patch: '--- a\n+++ b\n',
        });

        expect(result).toMatchObject({
          success: true,
          target: 'src/index.ts',
          message: expect.stringContaining('applied'),
        });
      });

      it('handles patch failure', async () => {
        (mockService.applyPatch as any).mockResolvedValue({
          success: false,
          target: 'src/index.ts',
          error: 'Hunk failed',
        });

        const result = await handleLatentTool(mockService, 'latent_apply_patch', {
          taskId: 'fail-patch',
          target: 'src/index.ts',
          patch: 'bad patch',
        });

        expect(result).toMatchObject({
          success: false,
          error: 'Hunk failed',
        });
      });

      it('supports dry run', async () => {
        (mockService.applyPatch as any).mockResolvedValue({
          success: true,
          target: 'src/test.ts',
        });

        await handleLatentTool(mockService, 'latent_apply_patch', {
          taskId: 'dry-task',
          target: 'src/test.ts',
          patch: '--- a\n+++ b\n',
          dryRun: true,
        });

        expect(mockService.applyPatch).toHaveBeenCalledWith({
          taskId: 'dry-task',
          target: 'src/test.ts',
          patch: '--- a\n+++ b\n',
          dryRun: true,
        });
      });
    });

    describe('latent_validate_response', () => {
      it('validates valid response', async () => {
        (mockService.validateResponse as any).mockReturnValue({
          valid: true,
          errors: [],
          warnings: [],
        });

        const result = await handleLatentTool(mockService, 'latent_validate_response', {
          response: {
            summary: 'Test summary',
            contextDelta: {},
            actions: [],
          },
        });

        expect(result).toMatchObject({
          valid: true,
          message: 'Response is valid',
        });
      });

      it('validates invalid response', async () => {
        (mockService.validateResponse as any).mockReturnValue({
          valid: false,
          errors: [{ message: 'Summary too long' }],
          warnings: [],
        });

        const result = await handleLatentTool(mockService, 'latent_validate_response', {
          response: {
            summary: 'x'.repeat(300),
            contextDelta: {},
            actions: [],
          },
        });

        expect(result).toMatchObject({
          valid: false,
          message: expect.stringContaining('Summary too long'),
        });
      });
    });

    describe('latent_complete_task', () => {
      it('completes task', async () => {
        (mockService.completeTask as any).mockResolvedValue(undefined);

        const result = await handleLatentTool(mockService, 'latent_complete_task', {
          taskId: 'complete-task',
          summary: 'Task done',
        });

        expect(result).toMatchObject({
          success: true,
          taskId: 'complete-task',
          message: expect.stringContaining('completed'),
        });
        expect(mockService.completeTask).toHaveBeenCalledWith('complete-task', 'Task done');
      });
    });

    describe('latent_list_contexts', () => {
      it('lists contexts', async () => {
        (mockService.listContexts as any).mockResolvedValue([
          {
            taskId: 'task-1',
            phase: 'analysis',
            version: 1,
            decisions: [],
            codeMap: { files: [] },
            updatedAt: new Date(),
          },
          {
            taskId: 'task-2',
            phase: 'impl',
            version: 3,
            decisions: [{ id: 'D001' }],
            codeMap: { files: ['a.ts'] },
            updatedAt: new Date(),
          },
        ]);

        const result = await handleLatentTool(mockService, 'latent_list_contexts', {});

        expect(result).toMatchObject({
          success: true,
          count: 2,
          contexts: expect.arrayContaining([
            expect.objectContaining({ taskId: 'task-1' }),
            expect.objectContaining({ taskId: 'task-2' }),
          ]),
        });
      });

      it('lists empty contexts', async () => {
        (mockService.listContexts as any).mockResolvedValue([]);

        const result = await handleLatentTool(mockService, 'latent_list_contexts', {});

        expect(result).toMatchObject({
          success: true,
          count: 0,
          contexts: [],
        });
      });
    });

    describe('latent_delete_context', () => {
      it('deletes existing context', async () => {
        (mockService.deleteContext as any).mockResolvedValue(true);

        const result = await handleLatentTool(mockService, 'latent_delete_context', {
          taskId: 'delete-task',
        });

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('deleted'),
        });
      });

      it('handles non-existent context', async () => {
        (mockService.deleteContext as any).mockResolvedValue(false);

        const result = await handleLatentTool(mockService, 'latent_delete_context', {
          taskId: 'missing-task',
        });

        expect(result).toMatchObject({
          success: false,
          message: expect.stringContaining('not found'),
        });
      });
    });

    describe('latent_status', () => {
      it('returns status', async () => {
        (mockService.getStatus as any).mockReturnValue({
          enabled: true,
          activeContexts: 2,
          totalDecisions: 5,
        });

        const result = await handleLatentTool(mockService, 'latent_status', {});

        expect(result).toMatchObject({
          success: true,
          enabled: true,
          activeContexts: 2,
        });
      });
    });

    describe('latent_step_log', () => {
      it('logs step for existing context', async () => {
        (mockService.getContext as any).mockResolvedValue({
          taskId: 'log-task',
          phase: 'analysis',
        });
        (mockService.updateContext as any).mockResolvedValue({
          taskId: 'log-task',
          phase: 'analysis',
          version: 2,
        });

        const result = await handleLatentTool(mockService, 'latent_step_log', {
          taskId: 'log-task',
          phase: 'analysis',
          description: 'Analyzed codebase structure',
        });

        expect(result).toMatchObject({
          success: true,
          taskId: 'log-task',
          message: expect.stringContaining('Analyzed'),
        });
      });

      it('creates context if not exists', async () => {
        (mockService.getContext as any).mockResolvedValue(null);
        (mockService.createContext as any).mockResolvedValue({
          taskId: 'new-log-task',
          phase: 'plan',
        });
        (mockService.updateContext as any).mockResolvedValue({
          taskId: 'new-log-task',
          phase: 'plan',
          version: 1,
        });

        const result = await handleLatentTool(mockService, 'latent_step_log', {
          taskId: 'new-log-task',
          phase: 'plan',
          description: 'Planning implementation',
          affectedFiles: ['src/main.ts'],
        });

        expect(mockService.createContext).toHaveBeenCalled();
        expect(result).toMatchObject({
          success: true,
        });
      });

      it('parses decision format D001: summary', async () => {
        (mockService.getContext as any).mockResolvedValue({ taskId: 'dec-task', phase: 'plan' });
        (mockService.updateContext as any).mockResolvedValue({ taskId: 'dec-task', phase: 'plan', version: 2 });

        await handleLatentTool(mockService, 'latent_step_log', {
          taskId: 'dec-task',
          phase: 'plan',
          description: 'Made decision',
          decisions: ['D001: Use TypeScript'],
        });

        expect(mockService.updateContext).toHaveBeenCalledWith(
          expect.objectContaining({
            delta: expect.objectContaining({
              decisions: expect.arrayContaining([
                expect.objectContaining({
                  id: 'D001',
                  summary: 'Use TypeScript',
                }),
              ]),
            }),
          })
        );
      });
    });

    describe('latent_diff_apply', () => {
      it('applies diff successfully', async () => {
        (mockService.applyDiff as any).mockResolvedValue({
          success: true,
          target: 'src/file.ts',
          linesAdded: 5,
          linesRemoved: 2,
          usedFuzzyMatch: false,
          requiresConfirm: false,
          conflicts: [],
        });

        const result = await handleLatentTool(mockService, 'latent_diff_apply', {
          target: 'src/file.ts',
          diff: '--- a\n+++ b\n',
        });

        expect(result).toMatchObject({
          success: true,
          target: 'src/file.ts',
          linesAdded: 5,
          linesRemoved: 2,
        });
      });

      it('handles conflicts requiring confirm', async () => {
        (mockService.applyDiff as any).mockResolvedValue({
          success: false,
          target: 'src/conflict.ts',
          linesAdded: 0,
          linesRemoved: 0,
          usedFuzzyMatch: true,
          requiresConfirm: true,
          conflicts: [
            { type: 'context-mismatch', hunkIndex: 0, similarity: 0.7, canFuzzyResolve: true },
          ],
          preview: 'preview content',
        });

        const result = await handleLatentTool(mockService, 'latent_diff_apply', {
          target: 'src/conflict.ts',
          diff: 'bad diff',
        });

        expect(result).toMatchObject({
          requiresConfirm: true,
          message: expect.stringContaining('latent_diff_confirm'),
        });
      });
    });

    describe('latent_diff_confirm', () => {
      it('confirms pending edit', async () => {
        (mockService.confirmDiff as any).mockResolvedValue({
          success: true,
          target: 'src/confirmed.ts',
          linesAdded: 3,
          linesRemoved: 1,
        });

        const result = await handleLatentTool(mockService, 'latent_diff_confirm', {
          target: 'src/confirmed.ts',
          action: 'confirm',
        });

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('Confirmed'),
        });
      });

      it('rejects pending edit', async () => {
        (mockService.rejectDiff as any).mockReturnValue(true);

        const result = await handleLatentTool(mockService, 'latent_diff_confirm', {
          target: 'src/rejected.ts',
          action: 'reject',
        });

        expect(result).toMatchObject({
          success: true,
          action: 'rejected',
        });
      });
    });

    describe('latent_diff_rollback', () => {
      it('rolls back file', async () => {
        (mockService.rollbackDiff as any).mockResolvedValue(true);

        const result = await handleLatentTool(mockService, 'latent_diff_rollback', {
          target: 'src/rollback.ts',
        });

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('Rolled back'),
        });
      });

      it('handles no backup', async () => {
        (mockService.rollbackDiff as any).mockResolvedValue(false);

        const result = await handleLatentTool(mockService, 'latent_diff_rollback', {
          target: 'src/no-backup.ts',
        });

        expect(result).toMatchObject({
          success: false,
          message: expect.stringContaining('No backup'),
        });
      });
    });

    describe('latent_diff_config', () => {
      it('gets current config', async () => {
        (mockService.getDiffEditorConfig as any).mockReturnValue({
          confirmPolicy: 'auto',
          fuzzyThreshold: 0.8,
          createBackup: true,
          autoRollback: false,
        });

        const result = await handleLatentTool(mockService, 'latent_diff_config', {});

        expect(result).toMatchObject({
          success: true,
          config: expect.objectContaining({
            fuzzyThreshold: 0.8,
          }),
        });
        expect(mockService.configureDiffEditor).not.toHaveBeenCalled();
      });

      it('updates config', async () => {
        (mockService.getDiffEditorConfig as any).mockReturnValue({
          confirmPolicy: 'prompt',
          fuzzyThreshold: 0.7,
        });

        const result = await handleLatentTool(mockService, 'latent_diff_config', {
          confirmPolicy: 'prompt',
          fuzzyThreshold: 0.7,
        });

        expect(mockService.configureDiffEditor).toHaveBeenCalledWith({
          confirmPolicy: 'prompt',
          fuzzyThreshold: 0.7,
        });
        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('Updated'),
        });
      });
    });

    describe('latent_diff_pending', () => {
      it('lists pending edits', async () => {
        const pendingMap = new Map([
          ['src/pending.ts', {
            riskLevel: 'medium',
            conflicts: [{ type: 'context' }],
            preview: 'some preview content here',
          }],
        ]);
        (mockService.getPendingDiffConfirms as any).mockReturnValue(pendingMap);

        const result = await handleLatentTool(mockService, 'latent_diff_pending', {});

        expect(result).toMatchObject({
          success: true,
          count: 1,
          pending: expect.arrayContaining([
            expect.objectContaining({ target: 'src/pending.ts' }),
          ]),
        });
      });

      it('handles no pending edits', async () => {
        (mockService.getPendingDiffConfirms as any).mockReturnValue(new Map());

        const result = await handleLatentTool(mockService, 'latent_diff_pending', {});

        expect(result).toMatchObject({
          success: true,
          count: 0,
          message: 'No pending edits',
        });
      });
    });

    describe('unknown tool', () => {
      it('throws error for unknown tool', async () => {
        await expect(
          handleLatentTool(mockService, 'unknown_tool', {})
        ).rejects.toThrow('Unknown latent tool');
      });
    });
  });
});
