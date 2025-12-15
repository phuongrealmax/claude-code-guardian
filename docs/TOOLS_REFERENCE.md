# MCP Tools Reference

> Auto-generated from source code. Do not edit manually.
>
> Run `node scripts/generate-tools-docs.mjs` to regenerate.

## Overview

This document lists all MCP tools available in Code Guardian Studio.
For detailed usage, see the individual guide documents linked below.

## Table of Contents

- [Agent Tools](#agent-tools)
- [AutoAgent Tools](#autoagent-tools)
- [Code Optimizer Tools](#code-optimizer-tools)
- [Document Tools](#document-tools)
- [Guard Tools](#guard-tools)
- [Latent Chain Tools](#latent-chain-tools)
- [Memory Tools](#memory-tools)
- [Other Tools](#other-tools)
- [Process Tools](#process-tools)
- [Profile Tools](#profile-tools)
- [RAG Tools](#rag-tools)
- [Resource Tools](#resource-tools)
- [Session Tools](#session-tools)
- [Testing Tools](#testing-tools)
- [Thinking Tools](#thinking-tools)
- [Workflow Tools](#workflow-tools)

## Agent Tools

> Multi-agent coordination

| Tool | Description |
|------|-------------|
| `agents_coordinate` | Coordinate |
| `agents_get` | Get |
| `agents_list` | List |
| `agents_register` | Register |
| `agents_reload` | Reload |
| `agents_select` | Select |
| `agents_status` | Status |

## AutoAgent Tools

> Automatic task decomposition

| Tool | Description |
|------|-------------|
| `auto_agent_status` | Agent Status |
| `auto_analyze_complexity` | Analyze Complexity |
| `auto_analyze_graph` | Analyze Graph |
| `auto_complete_node` | Complete Node |
| `auto_create_graph` | Create Graph |
| `auto_decompose_task` | Decompose Task |
| `auto_delete_graph` | Delete Graph |
| `auto_fail_node` | Fail Node |
| `auto_fix_loop` | Fix Loop |
| `auto_fix_status` | Fix Status |
| `auto_get_next_nodes` | Get Next Nodes |
| `auto_graph_status` | Graph Status |
| `auto_list_graphs` | List Graphs |
| `auto_recall_errors` | Recall Errors |
| `auto_route_tools` | Route Tools |
| `auto_run_graph` | Run Graph |
| `auto_start_node` | Start Node |
| `auto_store_error` | Store Error |
| `auto_workflow_start` | Workflow Start |

## Code Optimizer Tools

> Code analysis and optimization

| Tool | Description |
|------|-------------|
| `code_generate_report` | Generate Report |
| `code_hotspots` | Hotspots |
| `code_metrics` | Metrics |
| `code_optimizer_status` | Optimizer Status |
| `code_quick_analysis` | Quick Analysis |
| `code_record_optimization` | Record Optimization |
| `code_refactor_plan` | Refactor Plan |
| `code_scan_repository` | Scan Repository |

## Document Tools

> Documentation management

| Tool | Description |
|------|-------------|
| `documents_create` | Create |
| `documents_find_by_type` | Find By Type |
| `documents_list` | List |
| `documents_register` | Register |
| `documents_scan` | Scan |
| `documents_search` | Search |
| `documents_should_update` | Should Update |
| `documents_status` | Status |
| `documents_update` | Update |

## Guard Tools

> Code validation and rules

| Tool | Description |
|------|-------------|
| `guard_check_test` | Check Test |
| `guard_rules` | Rules |
| `guard_status` | Status |
| `guard_toggle_rule` | Toggle Rule |
| `guard_validate` | Validate |

## Latent Chain Tools

> Multi-phase reasoning mode

| Tool | Description |
|------|-------------|
| `latent_apply_patch` | Apply Patch |
| `latent_complete_task` | Complete Task |
| `latent_context_create` | Context Create |
| `latent_context_get` | Context Get |
| `latent_context_update` | Context Update |
| `latent_delete_context` | Delete Context |
| `latent_diff_apply` | Diff Apply |
| `latent_diff_config` | Diff Config |
| `latent_diff_confirm` | Diff Confirm |
| `latent_diff_pending` | Diff Pending |
| `latent_diff_rollback` | Diff Rollback |
| `latent_list_contexts` | List Contexts |
| `latent_phase_transition` | Phase Transition |
| `latent_status` | Status |
| `latent_step_log` | Step Log |
| `latent_validate_response` | Validate Response |

## Memory Tools

> Persistent memory storage

| Tool | Description |
|------|-------------|
| `memory_forget` | Forget |
| `memory_list` | List |
| `memory_recall` | Recall |
| `memory_store` | Store |
| `memory_summary` | Summary |

## Other Tools

> Miscellaneous tools

| Tool | Description |
|------|-------------|
| `ast_dependencies` | Dependencies |
| `ast_detect_language` | Detect Language |
| `ast_parse` | Parse |
| `ast_status` | Status |
| `ast_symbols` | Symbols |
| `check_all_ports` | All Ports |
| `check_port` | Port |
| `check_test` | Test |
| `kill_on_port` | On Port |
| `onboarding_autofix` | Autofix |
| `onboarding_init` | Init |
| `onboarding_migrate` | Migrate |
| `onboarding_status` | Status |
| `onboarding_validate` | Validate |
| `onboarding_welcome` | Welcome |
| `stride_analyze` | Analyze |
| `stride_analyze_files` | Analyze Files |
| `stride_categories` | Categories |
| `stride_checklist` | Checklist |
| `stride_threats` | Threats |
| `toggle_rule` | Rule |

## Process Tools

> Process and port management

| Tool | Description |
|------|-------------|
| `process_check_all_ports` | Check All Ports |
| `process_check_port` | Check Port |
| `process_cleanup` | Cleanup |
| `process_kill` | Kill |
| `process_kill_on_port` | Kill On Port |
| `process_list` | List |
| `process_spawn` | Spawn |
| `process_status` | Status |

## Profile Tools

> Context profiles

| Tool | Description |
|------|-------------|
| `profile_create` | Create |
| `profile_delete` | Delete |
| `profile_detect` | Detect |
| `profile_get` | Get |
| `profile_list` | List |
| `profile_status` | Status |
| `profile_switch` | Switch |
| `profile_update` | Update |

## RAG Tools

> Semantic code search

| Tool | Description |
|------|-------------|
| `rag_build_index` | Build Index |
| `rag_clear_index` | Clear Index |
| `rag_get_chunk` | Get Chunk |
| `rag_query` | Query |
| `rag_related_code` | Related Code |
| `rag_status` | Status |

## Resource Tools

> Checkpoints, tokens, and resources

| Tool | Description |
|------|-------------|
| `resource_action_allowed` | Action Allowed |
| `resource_checkpoint_create` | Checkpoint Create |
| `resource_checkpoint_delete` | Checkpoint Delete |
| `resource_checkpoint_diff` | Checkpoint Diff |
| `resource_checkpoint_list` | Checkpoint List |
| `resource_checkpoint_restore` | Checkpoint Restore |
| `resource_estimate_task` | Estimate Task |
| `resource_governor_state` | Governor State |
| `resource_status` | Status |
| `resource_update_tokens` | Update Tokens |

## Session Tools

> Session management and resume

| Tool | Description |
|------|-------------|
| `session_end` | End |
| `session_export` | Export |
| `session_init` | Init |
| `session_offer` | Offer |
| `session_replay` | Replay |
| `session_resume` | Resume |
| `session_save` | Save |
| `session_status` | Status |
| `session_timeline` | Timeline |

## Testing Tools

> Test execution and browser testing

| Tool | Description |
|------|-------------|
| `testing_browser_analysis` | Browser Analysis |
| `testing_browser_close` | Browser Close |
| `testing_browser_errors` | Browser Errors |
| `testing_browser_logs` | Browser Logs |
| `testing_browser_network` | Browser Network |
| `testing_browser_open` | Browser Open |
| `testing_browser_screenshot` | Browser Screenshot |
| `testing_cleanup` | Cleanup |
| `testing_run` | Run |
| `testing_run_affected` | Run Affected |
| `testing_status` | Status |

## Thinking Tools

> Reasoning models and workflows

| Tool | Description |
|------|-------------|
| `thinking_get_model` | Get Model |
| `thinking_get_style` | Get Style |
| `thinking_get_workflow` | Get Workflow |
| `thinking_list_models` | List Models |
| `thinking_list_snippets` | List Snippets |
| `thinking_list_workflows` | List Workflows |
| `thinking_save_snippet` | Save Snippet |
| `thinking_status` | Status |
| `thinking_suggest_model` | Suggest Model |
| `thinking_suggest_workflow` | Suggest Workflow |

## Workflow Tools

> Task and workflow management

| Tool | Description |
|------|-------------|
| `workflow_cleanup` | Cleanup |
| `workflow_current` | Current |
| `workflow_status` | Status |
| `workflow_task_complete` | Task Complete |
| `workflow_task_create` | Task Create |
| `workflow_task_delete` | Task Delete |
| `workflow_task_fail` | Task Fail |
| `workflow_task_list` | Task List |
| `workflow_task_note` | Task Note |
| `workflow_task_pause` | Task Pause |
| `workflow_task_start` | Task Start |
| `workflow_task_update` | Task Update |

## Related Documentation

- [User Guide](USER_GUIDE.md) - Complete CLI and MCP reference
- [Session Resume](SESSION_RESUME.md) - Session tools in detail
- [Auto-Checkpoints](AUTO_CHECKPOINTS_AND_DIFF.md) - Checkpoint tools
- [Completion Gates](COMPLETION_GATES.md) - Workflow gate tools
- [Guard Rulesets](GUARD_RULESETS.md) - Guard validation tools
- [Testing Observability](TESTING_OBSERVABILITY.md) - Testing tools
- [TaskGraph Workflows](TASKGRAPH_WORKFLOWS.md) - AutoAgent tools

---

*Generated: 2025-12-15*