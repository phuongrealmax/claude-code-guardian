// src/core/ccg-run/handlers.ts
/**
 * Internal Handlers - Maps short tool names to internal implementations
 */

import { InternalHandlers, ToolHandlerMissingError } from './types.js';
import { CCGModules } from '../../server-handlers.js';
import { StateManager } from '../state-manager.js';

// ═══════════════════════════════════════════════════════════════
//                      HANDLER BUILDER
// ═══════════════════════════════════════════════════════════════

export interface HandlerDeps {
  modules: CCGModules;
  stateManager: StateManager;
}

/**
 * Build internal handlers map from module instances
 * Throws ToolHandlerMissingError if a required handler is missing
 */
export function buildInternalHandlers(deps: HandlerDeps): InternalHandlers {
  const { modules, stateManager } = deps;

  const handlers: InternalHandlers = {};

  // ─────────────────────────────────────────────────────────────
  // GUARD TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['guard_validate'] = (args) => modules.guard.handleTool('validate', args);
  handlers['guard_check_test'] = (args) => modules.guard.handleTool('check_test', args);
  handlers['guard_rules'] = (args) => modules.guard.handleTool('rules', args);
  handlers['guard_toggle_rule'] = (args) => modules.guard.handleTool('toggle_rule', args);
  handlers['guard_status'] = (args) => modules.guard.handleTool('status', args);

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['workflow_task_create'] = (args) => modules.workflow.handleTool('workflow_task_create', args);
  handlers['workflow_task_start'] = (args) => modules.workflow.handleTool('workflow_task_start', args);
  handlers['workflow_task_update'] = (args) => modules.workflow.handleTool('workflow_task_update', args);
  handlers['workflow_task_complete'] = (args) => modules.workflow.handleTool('workflow_task_complete', args);
  handlers['workflow_task_pause'] = (args) => modules.workflow.handleTool('workflow_task_pause', args);
  handlers['workflow_task_fail'] = (args) => modules.workflow.handleTool('workflow_task_fail', args);
  handlers['workflow_task_note'] = (args) => modules.workflow.handleTool('workflow_task_note', args);
  handlers['workflow_task_list'] = (args) => modules.workflow.handleTool('workflow_task_list', args);
  handlers['workflow_task_delete'] = (args) => modules.workflow.handleTool('workflow_task_delete', args);
  handlers['workflow_current'] = (args) => modules.workflow.handleTool('workflow_current', args);
  handlers['workflow_status'] = (args) => modules.workflow.handleTool('workflow_status', args);
  handlers['workflow_cleanup'] = (args) => modules.workflow.handleTool('workflow_cleanup', args);

  // ─────────────────────────────────────────────────────────────
  // MEMORY TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['memory_store'] = (args) => modules.memory.handleTool('store', args);
  handlers['memory_recall'] = (args) => modules.memory.handleTool('recall', args);
  handlers['memory_forget'] = (args) => modules.memory.handleTool('forget', args);
  handlers['memory_summary'] = (args) => modules.memory.handleTool('summary', args);
  handlers['memory_list'] = (args) => modules.memory.handleTool('list', args);

  // ─────────────────────────────────────────────────────────────
  // TESTING TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['testing_run'] = (args) => modules.testing.handleTool('testing_run', args);
  handlers['testing_run_affected'] = (args) => modules.testing.handleTool('testing_run_affected', args);
  handlers['testing_browser_open'] = (args) => modules.testing.handleTool('testing_browser_open', args);
  handlers['testing_browser_screenshot'] = (args) => modules.testing.handleTool('testing_browser_screenshot', args);
  handlers['testing_browser_logs'] = (args) => modules.testing.handleTool('testing_browser_logs', args);
  handlers['testing_browser_network'] = (args) => modules.testing.handleTool('testing_browser_network', args);
  handlers['testing_browser_errors'] = (args) => modules.testing.handleTool('testing_browser_errors', args);
  handlers['testing_browser_analysis'] = (args) => modules.testing.handleTool('testing_browser_analysis', args);
  handlers['testing_browser_close'] = (args) => modules.testing.handleTool('testing_browser_close', args);
  handlers['testing_cleanup'] = (args) => modules.testing.handleTool('testing_cleanup', args);
  handlers['testing_status'] = (args) => modules.testing.handleTool('testing_status', args);

  // ─────────────────────────────────────────────────────────────
  // PROCESS TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['process_check_port'] = (args) => modules.process.handleTool('check_port', args);
  handlers['process_check_all_ports'] = (args) => modules.process.handleTool('check_all_ports', args);
  handlers['process_kill_on_port'] = (args) => modules.process.handleTool('kill_on_port', args);
  handlers['process_kill'] = (args) => modules.process.handleTool('kill', args);
  handlers['process_spawn'] = (args) => modules.process.handleTool('spawn', args);
  handlers['process_list'] = (args) => modules.process.handleTool('list', args);
  handlers['process_cleanup'] = (args) => modules.process.handleTool('cleanup', args);
  handlers['process_status'] = (args) => modules.process.handleTool('status', args);

  // ─────────────────────────────────────────────────────────────
  // RESOURCE TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['resource_status'] = (args) => modules.resource.handleTool('resource_status', args);
  handlers['resource_update_tokens'] = (args) => modules.resource.handleTool('resource_update_tokens', args);
  handlers['resource_estimate_task'] = (args) => modules.resource.handleTool('resource_estimate_task', args);
  handlers['resource_checkpoint_create'] = (args) => modules.resource.handleTool('resource_checkpoint_create', args);
  handlers['resource_checkpoint_list'] = (args) => modules.resource.handleTool('resource_checkpoint_list', args);
  handlers['resource_checkpoint_restore'] = (args) => modules.resource.handleTool('resource_checkpoint_restore', args);
  handlers['resource_checkpoint_delete'] = (args) => modules.resource.handleTool('resource_checkpoint_delete', args);
  handlers['resource_checkpoint_diff'] = (args) => modules.resource.handleTool('resource_checkpoint_diff', args);
  handlers['resource_governor_state'] = (args) => modules.resource.handleTool('resource_governor_state', args);
  handlers['resource_action_allowed'] = (args) => modules.resource.handleTool('resource_action_allowed', args);

  // ─────────────────────────────────────────────────────────────
  // DOCUMENTS TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['documents_search'] = (args) => modules.documents.handleTool('documents_search', args);
  handlers['documents_find_by_type'] = (args) => modules.documents.handleTool('documents_find_by_type', args);
  handlers['documents_should_update'] = (args) => modules.documents.handleTool('documents_should_update', args);
  handlers['documents_update'] = (args) => modules.documents.handleTool('documents_update', args);
  handlers['documents_create'] = (args) => modules.documents.handleTool('documents_create', args);
  handlers['documents_register'] = (args) => modules.documents.handleTool('documents_register', args);
  handlers['documents_scan'] = (args) => modules.documents.handleTool('documents_scan', args);
  handlers['documents_list'] = (args) => modules.documents.handleTool('documents_list', args);
  handlers['documents_status'] = (args) => modules.documents.handleTool('documents_status', args);

  // ─────────────────────────────────────────────────────────────
  // AGENTS TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['agents_list'] = (args) => modules.agents.handleTool('list', args);
  handlers['agents_get'] = (args) => modules.agents.handleTool('get', args);
  handlers['agents_select'] = (args) => modules.agents.handleTool('select', args);
  handlers['agents_register'] = (args) => modules.agents.handleTool('register', args);
  handlers['agents_coordinate'] = (args) => modules.agents.handleTool('coordinate', args);
  handlers['agents_reload'] = (args) => modules.agents.handleTool('reload', args);
  handlers['agents_status'] = (args) => modules.agents.handleTool('status', args);

  // ─────────────────────────────────────────────────────────────
  // LATENT TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['latent_context_create'] = (args) => modules.latent.handleTool('latent_context_create', args);
  handlers['latent_context_get'] = (args) => modules.latent.handleTool('latent_context_get', args);
  handlers['latent_context_update'] = (args) => modules.latent.handleTool('latent_context_update', args);
  handlers['latent_phase_transition'] = (args) => modules.latent.handleTool('latent_phase_transition', args);
  handlers['latent_apply_patch'] = (args) => modules.latent.handleTool('latent_apply_patch', args);
  handlers['latent_validate_response'] = (args) => modules.latent.handleTool('latent_validate_response', args);
  handlers['latent_complete_task'] = (args) => modules.latent.handleTool('latent_complete_task', args);
  handlers['latent_list_contexts'] = (args) => modules.latent.handleTool('latent_list_contexts', args);
  handlers['latent_delete_context'] = (args) => modules.latent.handleTool('latent_delete_context', args);
  handlers['latent_status'] = (args) => modules.latent.handleTool('latent_status', args);
  handlers['latent_step_log'] = (args) => modules.latent.handleTool('latent_step_log', args);
  handlers['latent_diff_apply'] = (args) => modules.latent.handleTool('latent_diff_apply', args);
  handlers['latent_diff_confirm'] = (args) => modules.latent.handleTool('latent_diff_confirm', args);
  handlers['latent_diff_rollback'] = (args) => modules.latent.handleTool('latent_diff_rollback', args);
  handlers['latent_diff_config'] = (args) => modules.latent.handleTool('latent_diff_config', args);
  handlers['latent_diff_pending'] = (args) => modules.latent.handleTool('latent_diff_pending', args);

  // ─────────────────────────────────────────────────────────────
  // THINKING TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['thinking_get_model'] = (args) => modules.thinking.handleTool('thinking_get_model', args);
  handlers['thinking_suggest_model'] = (args) => modules.thinking.handleTool('thinking_suggest_model', args);
  handlers['thinking_list_models'] = (args) => modules.thinking.handleTool('thinking_list_models', args);
  handlers['thinking_get_workflow'] = (args) => modules.thinking.handleTool('thinking_get_workflow', args);
  handlers['thinking_suggest_workflow'] = (args) => modules.thinking.handleTool('thinking_suggest_workflow', args);
  handlers['thinking_list_workflows'] = (args) => modules.thinking.handleTool('thinking_list_workflows', args);
  handlers['thinking_save_snippet'] = (args) => modules.thinking.handleTool('thinking_save_snippet', args);
  handlers['thinking_get_style'] = (args) => modules.thinking.handleTool('thinking_get_style', args);
  handlers['thinking_list_snippets'] = (args) => modules.thinking.handleTool('thinking_list_snippets', args);
  handlers['thinking_status'] = (args) => modules.thinking.handleTool('thinking_status', args);

  // ─────────────────────────────────────────────────────────────
  // AUTO-AGENT TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['auto_decompose_task'] = (args) => modules.autoAgent.handleTool('auto_decompose_task', args);
  handlers['auto_analyze_complexity'] = (args) => modules.autoAgent.handleTool('auto_analyze_complexity', args);
  handlers['auto_route_tools'] = (args) => modules.autoAgent.handleTool('auto_route_tools', args);
  handlers['auto_fix_loop'] = (args) => modules.autoAgent.handleTool('auto_fix_loop', args);
  handlers['auto_fix_status'] = (args) => modules.autoAgent.handleTool('auto_fix_status', args);
  handlers['auto_store_error'] = (args) => modules.autoAgent.handleTool('auto_store_error', args);
  handlers['auto_recall_errors'] = (args) => modules.autoAgent.handleTool('auto_recall_errors', args);
  handlers['auto_agent_status'] = (args) => modules.autoAgent.handleTool('auto_agent_status', args);

  // ─────────────────────────────────────────────────────────────
  // RAG TOOLS
  // ─────────────────────────────────────────────────────────────
  const ragTools = modules.rag.getTools();
  handlers['rag_build_index'] = async (args) => ragTools.rag_build_index.handler(args as never);
  handlers['rag_query'] = async (args) => ragTools.rag_query.handler(args as never);
  handlers['rag_related_code'] = async (args) => ragTools.rag_related_code.handler(args as never);
  handlers['rag_status'] = async () => ragTools.rag_status.handler();
  handlers['rag_clear_index'] = async () => ragTools.rag_clear_index.handler();
  handlers['rag_get_chunk'] = async (args) => ragTools.rag_get_chunk.handler(args as never);

  // ─────────────────────────────────────────────────────────────
  // CODE OPTIMIZER TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['code_scan_repository'] = async (args) => modules.codeOptimizer.scanRepository(args as never);
  handlers['code_metrics'] = async (args) => modules.codeOptimizer.computeMetrics(args as never);
  handlers['code_hotspots'] = async (args) => Promise.resolve(modules.codeOptimizer.detectHotspots(args as never));
  handlers['code_refactor_plan'] = async (args) => Promise.resolve(modules.codeOptimizer.generateRefactorPlan(args as never));
  handlers['code_record_optimization'] = async (args) => modules.codeOptimizer.recordOptimization(args as never);
  handlers['code_generate_report'] = async (args) => Promise.resolve(modules.codeOptimizer.generateReport(args as never));
  handlers['code_quick_analysis'] = async (args) => modules.codeOptimizer.quickAnalysis(args as never);
  handlers['code_optimizer_status'] = async () => Promise.resolve(modules.codeOptimizer.getStatus());

  // ─────────────────────────────────────────────────────────────
  // SESSION TOOLS
  // ─────────────────────────────────────────────────────────────
  handlers['session_status'] = (args) => modules.session.handleTool('session_status', args);
  handlers['session_timeline'] = (args) => modules.session.handleTool('session_timeline', args);
  handlers['session_export'] = (args) => modules.session.handleTool('session_export', args);
  handlers['session_resume'] = (args) => modules.session.handleTool('session_resume', args);
  handlers['session_replay'] = (args) => modules.session.handleTool('session_replay', args);
  handlers['session_save'] = (args) => modules.session.handleTool('session_save', args);
  handlers['session_offer'] = (args) => modules.session.handleTool('session_offer', args);

  return handlers;
}

/**
 * Get handler for a tool, throwing if not found
 */
export function getHandler(handlers: InternalHandlers, toolName: string): (args: Record<string, unknown>) => Promise<unknown> {
  const handler = handlers[toolName];
  if (!handler) {
    throw new ToolHandlerMissingError(toolName);
  }
  return handler;
}

/**
 * Get list of all available tool names
 */
export function getAvailableTools(handlers: InternalHandlers): string[] {
  return Object.keys(handlers);
}
