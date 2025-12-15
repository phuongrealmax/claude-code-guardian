// tests/unit/latent-tool-defs.test.ts

// Using vitest globals
import { LATENT_TOOL_DEFINITIONS, MCPTool } from '../../src/modules/latent/latent.tool-defs.js';

describe('latent.tool-defs', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      LATENT_TOOL_DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  describe('LATENT_TOOL_DEFINITIONS', () => {
    it('should be an array of tool definitions', () => {
      expect(Array.isArray(LATENT_TOOL_DEFINITIONS)).toBe(true);
      expect(LATENT_TOOL_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('should include all context management tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_context_create');
      expect(toolNames).toContain('latent_context_get');
      expect(toolNames).toContain('latent_context_update');
    });

    it('should include phase management tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_phase_transition');
    });

    it('should include patch and validation tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_apply_patch');
      expect(toolNames).toContain('latent_validate_response');
    });

    it('should include task completion tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_complete_task');
    });

    it('should include listing and status tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_list_contexts');
      expect(toolNames).toContain('latent_delete_context');
      expect(toolNames).toContain('latent_status');
    });

    it('should include step logging tool', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_step_log');
    });

    it('should include diff-based editing tools', () => {
      const toolNames = LATENT_TOOL_DEFINITIONS.map(t => t.name);

      expect(toolNames).toContain('latent_diff_apply');
      expect(toolNames).toContain('latent_diff_confirm');
      expect(toolNames).toContain('latent_diff_rollback');
      expect(toolNames).toContain('latent_diff_config');
      expect(toolNames).toContain('latent_diff_pending');
    });

    it('should have valid structure for all tools', () => {
      LATENT_TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CONTEXT TOOLS SCHEMAS
  // ═══════════════════════════════════════════════════════════════

  describe('context tools schemas', () => {
    it('should have taskId as required for context_create', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_context_create');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.properties).toHaveProperty('taskId');
      expect(tool!.inputSchema.properties).toHaveProperty('phase');
      expect(tool!.inputSchema.properties).toHaveProperty('constraints');
      expect(tool!.inputSchema.properties).toHaveProperty('files');
    });

    it('should have phase enum for context_create', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_context_create');
      const phaseProp = tool!.inputSchema.properties.phase as { enum: string[] };

      expect(phaseProp.enum).toContain('analysis');
      expect(phaseProp.enum).toContain('plan');
      expect(phaseProp.enum).toContain('impl');
      expect(phaseProp.enum).toContain('review');
    });

    it('should have taskId as required for context_get', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_context_get');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.properties).toHaveProperty('includeHistory');
      expect(tool!.inputSchema.properties).toHaveProperty('fields');
    });

    it('should have taskId and delta as required for context_update', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_context_update');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.required).toContain('delta');
      expect(tool!.inputSchema.properties).toHaveProperty('agentId');
      expect(tool!.inputSchema.properties).toHaveProperty('force');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      PHASE TRANSITION SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('phase_transition schema', () => {
    it('should have taskId and toPhase as required', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_phase_transition');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.required).toContain('toPhase');
    });

    it('should have toPhase enum', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_phase_transition');
      const phaseProp = tool!.inputSchema.properties.toPhase as { enum: string[] };

      expect(phaseProp.enum).toContain('analysis');
      expect(phaseProp.enum).toContain('plan');
      expect(phaseProp.enum).toContain('impl');
      expect(phaseProp.enum).toContain('review');
    });

    it('should have summary and agentId properties', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_phase_transition');

      expect(tool!.inputSchema.properties).toHaveProperty('summary');
      expect(tool!.inputSchema.properties).toHaveProperty('agentId');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      APPLY PATCH SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('apply_patch schema', () => {
    it('should have taskId, target, and patch as required', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_apply_patch');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.required).toContain('target');
      expect(tool!.inputSchema.required).toContain('patch');
    });

    it('should have dryRun property', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_apply_patch');

      expect(tool!.inputSchema.properties).toHaveProperty('dryRun');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      VALIDATE RESPONSE SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('validate_response schema', () => {
    it('should have response as required', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_validate_response');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('response');
    });

    it('should have nested response schema', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_validate_response');
      const responseProp = tool!.inputSchema.properties.response as {
        properties: Record<string, unknown>;
        required: string[];
      };

      expect(responseProp.properties).toHaveProperty('summary');
      expect(responseProp.properties).toHaveProperty('contextDelta');
      expect(responseProp.properties).toHaveProperty('actions');
      expect(responseProp.required).toContain('summary');
      expect(responseProp.required).toContain('contextDelta');
      expect(responseProp.required).toContain('actions');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      COMPLETE TASK SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('complete_task schema', () => {
    it('should have taskId and summary as required', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_complete_task');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.required).toContain('summary');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STEP LOG SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('step_log schema', () => {
    it('should have taskId, phase, and description as required', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_step_log');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
      expect(tool!.inputSchema.required).toContain('phase');
      expect(tool!.inputSchema.required).toContain('description');
    });

    it('should have phase enum', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_step_log');
      const phaseProp = tool!.inputSchema.properties.phase as { enum: string[] };

      expect(phaseProp.enum).toContain('analysis');
      expect(phaseProp.enum).toContain('plan');
      expect(phaseProp.enum).toContain('impl');
      expect(phaseProp.enum).toContain('review');
    });

    it('should have optional array properties', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_step_log');

      expect(tool!.inputSchema.properties).toHaveProperty('affectedFiles');
      expect(tool!.inputSchema.properties).toHaveProperty('decisions');
      expect(tool!.inputSchema.properties).toHaveProperty('risks');
      expect(tool!.inputSchema.properties).toHaveProperty('nextAction');
      expect(tool!.inputSchema.properties).toHaveProperty('metadata');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DIFF TOOLS SCHEMAS
  // ═══════════════════════════════════════════════════════════════

  describe('diff tools schemas', () => {
    it('should have target and diff as required for diff_apply', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_apply');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('target');
      expect(tool!.inputSchema.required).toContain('diff');
      expect(tool!.inputSchema.properties).toHaveProperty('dryRun');
      expect(tool!.inputSchema.properties).toHaveProperty('forceApply');
    });

    it('should have target and action as required for diff_confirm', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_confirm');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('target');
      expect(tool!.inputSchema.required).toContain('action');
    });

    it('should have action enum for diff_confirm', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_confirm');
      const actionProp = tool!.inputSchema.properties.action as { enum: string[] };

      expect(actionProp.enum).toContain('confirm');
      expect(actionProp.enum).toContain('reject');
    });

    it('should have target as required for diff_rollback', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_rollback');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('target');
    });

    it('should have config options for diff_config', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_config');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.properties).toHaveProperty('confirmPolicy');
      expect(tool!.inputSchema.properties).toHaveProperty('fuzzyThreshold');
      expect(tool!.inputSchema.properties).toHaveProperty('createBackup');
      expect(tool!.inputSchema.properties).toHaveProperty('autoRollback');
    });

    it('should have confirmPolicy enum for diff_config', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_config');
      const policyProp = tool!.inputSchema.properties.confirmPolicy as { enum: string[] };

      expect(policyProp.enum).toContain('auto');
      expect(policyProp.enum).toContain('prompt');
      expect(policyProp.enum).toContain('never');
    });

    it('should have no required fields for diff_pending', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_diff_pending');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toBeUndefined();
      expect(Object.keys(tool!.inputSchema.properties)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOOLS WITHOUT REQUIRED FIELDS
  // ═══════════════════════════════════════════════════════════════

  describe('status/list tools', () => {
    it('should have no required fields for list_contexts', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_list_contexts');

      expect(tool).toBeDefined();
      expect(Object.keys(tool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for status', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_status');

      expect(tool).toBeDefined();
      expect(Object.keys(tool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have taskId as required for delete_context', () => {
      const tool = LATENT_TOOL_DEFINITIONS.find(t => t.name === 'latent_delete_context');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('taskId');
    });
  });
});
