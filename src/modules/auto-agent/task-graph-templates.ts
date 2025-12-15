/**
 * TaskGraph Templates
 *
 * Task node templates and dependency definitions for different task types.
 * Extracted from task-graph.ts for better modularity.
 */

import { TaskNode } from './task-graph.js';
import { GatePolicyConfig } from '../../core/completion-gates.js';

// ═══════════════════════════════════════════════════════════════
//                      GATE POLICIES
// ═══════════════════════════════════════════════════════════════

/**
 * Gate policies for different phases - determines what evidence is required
 */
export const GATE_POLICIES = {
  /** Impl phases only need guard validation */
  impl: {
    requireGuard: true,
    requireTest: false,
  } as Partial<GatePolicyConfig>,

  /** Test phases only need test results */
  test: {
    requireGuard: false,
    requireTest: true,
  } as Partial<GatePolicyConfig>,

  /** Final review requires both guard AND test */
  review: {
    requireGuard: true,
    requireTest: true,
  } as Partial<GatePolicyConfig>,

  /** Analysis/plan phases don't require gates (gateRequired: false) */
  none: {
    requireGuard: false,
    requireTest: false,
  } as Partial<GatePolicyConfig>,
};

// ═══════════════════════════════════════════════════════════════
//                      TASK TEMPLATES
// ═══════════════════════════════════════════════════════════════

export const TASK_TEMPLATES: Record<string, Partial<TaskNode>[]> = {
  feature: [
    { name: 'Analyze Requirements', phase: 'analysis', tools: ['documents_search', 'memory_recall', 'rag_query'], estimatedTokens: 500, priority: 10 },
    { name: 'Search Related Code', phase: 'analysis', tools: ['rag_query', 'rag_related_code'], estimatedTokens: 400, priority: 9 },
    { name: 'Design Solution', phase: 'plan', tools: ['thinking_get_model', 'memory_recall'], estimatedTokens: 800, priority: 8 },
    { name: 'Create Interface', phase: 'plan', tools: ['thinking_get_style'], estimatedTokens: 400, priority: 7 },
    { name: 'Implement Core', phase: 'impl', tools: ['latent_apply_patch', 'guard_validate'], estimatedTokens: 2000, priority: 10 },
    { name: 'Implement Helpers', phase: 'impl', tools: ['latent_apply_patch', 'guard_validate'], estimatedTokens: 1000, priority: 6 },
    { name: 'Write Unit Tests', phase: 'test', tools: ['testing_run'], estimatedTokens: 1000, priority: 8 },
    { name: 'Integration Test', phase: 'test', tools: ['testing_run'], estimatedTokens: 600, priority: 7 },
    { name: 'Final Review', phase: 'review', tools: ['guard_validate', 'testing_run'], estimatedTokens: 500, priority: 9, gatePolicy: GATE_POLICIES.review },
  ],
  bugfix: [
    { name: 'Reproduce Bug', phase: 'analysis', tools: ['memory_recall', 'testing_run'], estimatedTokens: 400, priority: 10 },
    { name: 'Analyze Root Cause', phase: 'analysis', tools: ['rag_query', 'rag_related_code'], estimatedTokens: 600, priority: 9 },
    { name: 'Plan Fix', phase: 'plan', tools: ['thinking_get_model'], estimatedTokens: 300, priority: 8 },
    { name: 'Apply Fix', phase: 'impl', tools: ['latent_apply_patch', 'guard_validate'], estimatedTokens: 800, priority: 10 },
    { name: 'Write Regression Test', phase: 'test', tools: ['testing_run'], estimatedTokens: 500, priority: 9 },
    { name: 'Verify Fix', phase: 'review', tools: ['testing_run_affected'], estimatedTokens: 400, priority: 10, gatePolicy: GATE_POLICIES.review },
  ],
  refactor: [
    { name: 'Map Current Structure', phase: 'analysis', tools: ['rag_query', 'documents_search'], estimatedTokens: 600, priority: 9 },
    { name: 'Identify Patterns', phase: 'analysis', tools: ['rag_related_code', 'thinking_get_style'], estimatedTokens: 500, priority: 8 },
    { name: 'Plan Transformation', phase: 'plan', tools: ['thinking_get_model', 'thinking_get_workflow'], estimatedTokens: 800, priority: 10 },
    { name: 'Add Safety Tests', phase: 'test', tools: ['testing_run'], estimatedTokens: 1000, priority: 10 },
    { name: 'Apply Refactoring', phase: 'impl', tools: ['latent_apply_patch', 'guard_validate'], estimatedTokens: 1500, priority: 9 },
    { name: 'Update Tests', phase: 'test', tools: ['testing_run'], estimatedTokens: 500, priority: 8 },
    { name: 'Verify No Regressions', phase: 'review', tools: ['testing_run', 'guard_validate'], estimatedTokens: 400, priority: 10, gatePolicy: GATE_POLICIES.review },
  ],
  review: [
    { name: 'Load Context', phase: 'analysis', tools: ['memory_recall', 'documents_search'], estimatedTokens: 400, priority: 8 },
    { name: 'Analyze Code Structure', phase: 'analysis', tools: ['rag_query'], estimatedTokens: 500, priority: 9 },
    { name: 'Security Check', phase: 'analysis', tools: ['guard_validate'], estimatedTokens: 600, priority: 10 },
    { name: 'Quality Check', phase: 'analysis', tools: ['guard_validate', 'thinking_get_style'], estimatedTokens: 500, priority: 9 },
    { name: 'Generate Report', phase: 'review', tools: ['memory_store', 'documents_create'], estimatedTokens: 400, priority: 8 },
  ],
};

// ═══════════════════════════════════════════════════════════════
//                      DEPENDENCY TEMPLATES
// ═══════════════════════════════════════════════════════════════

// DAG dependency templates (which nodes depend on which)
// [dependentIndex, dependsOnIndex] pairs
export const DEPENDENCY_TEMPLATES: Record<string, number[][]> = {
  feature: [
    [2, 0], [2, 1],   // Design depends on Analyze + Search
    [3, 2],           // Interface depends on Design
    [4, 3],           // Core depends on Interface
    [5, 4],           // Helpers depends on Core
    [6, 4],           // Unit Tests depends on Core (parallel with Helpers)
    [7, 5], [7, 6],   // Integration depends on Helpers + Unit Tests
    [8, 7],           // Review depends on Integration
  ],
  bugfix: [
    [1, 0],           // Analyze depends on Reproduce
    [2, 1],           // Plan depends on Analyze
    [3, 2],           // Fix depends on Plan
    [4, 3],           // Test depends on Fix
    [5, 4],           // Verify depends on Test
  ],
  refactor: [
    [1, 0],           // Patterns depends on Map
    [2, 0], [2, 1],   // Plan depends on Map + Patterns
    [3, 2],           // Safety Tests depends on Plan
    [4, 3],           // Apply depends on Safety Tests
    [5, 4],           // Update Tests depends on Apply
    [6, 5],           // Verify depends on Update Tests
  ],
  review: [
    [1, 0],           // Analyze depends on Load
    [2, 1],           // Security depends on Analyze
    [3, 1],           // Quality depends on Analyze (parallel with Security)
    [4, 2], [4, 3],   // Report depends on Security + Quality
  ],
};
