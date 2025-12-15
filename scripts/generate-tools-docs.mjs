#!/usr/bin/env node
/**
 * MCP Tools Documentation Generator
 *
 * Scans source files for MCP tool definitions and generates
 * a sorted Markdown reference document.
 *
 * Usage: node scripts/generate-tools-docs.mjs
 *
 * Output: docs/TOOLS_REFERENCE.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Directories to scan for tool definitions
const SCAN_DIRS = [
  'src/modules',
  'src/core',
];

// File patterns that may contain tool definitions
const TOOL_FILE_PATTERNS = [
  /\.tools\.ts$/,
  /\.tool-defs\.ts$/,
  /tools\.ts$/,
  /index\.ts$/,
];

// Patterns to extract tool names
const TOOL_NAME_PATTERNS = [
  // MCP tool definition: name: "tool_name"
  /name:\s*['"]([a-z_]+)['"]/g,
  // Tool registration: "tool_name"
  /tool:\s*['"]([a-z_]+)['"]/g,
  // Function names that look like tools
  /(?:export\s+)?(?:async\s+)?function\s+([a-z_]+)(?:Tool|Handler)/gi,
  // Tool object keys
  /['"]([a-z]+_[a-z_]+)['"]\s*:/g,
];

// Tool prefixes for grouping
const TOOL_GROUPS = [
  { prefix: 'session_', name: 'Session Tools', description: 'Session management and resume' },
  { prefix: 'resource_', name: 'Resource Tools', description: 'Checkpoints, tokens, and resources' },
  { prefix: 'checkpoint', name: 'Resource Tools', description: 'Checkpoints, tokens, and resources' },
  { prefix: 'guard_', name: 'Guard Tools', description: 'Code validation and rules' },
  { prefix: 'testing_', name: 'Testing Tools', description: 'Test execution and browser testing' },
  { prefix: 'workflow_', name: 'Workflow Tools', description: 'Task and workflow management' },
  { prefix: 'memory_', name: 'Memory Tools', description: 'Persistent memory storage' },
  { prefix: 'latent_', name: 'Latent Chain Tools', description: 'Multi-phase reasoning mode' },
  { prefix: 'code_', name: 'Code Optimizer Tools', description: 'Code analysis and optimization' },
  { prefix: 'auto_', name: 'AutoAgent Tools', description: 'Automatic task decomposition' },
  { prefix: 'agents_', name: 'Agent Tools', description: 'Multi-agent coordination' },
  { prefix: 'documents_', name: 'Document Tools', description: 'Documentation management' },
  { prefix: 'thinking_', name: 'Thinking Tools', description: 'Reasoning models and workflows' },
  { prefix: 'process_', name: 'Process Tools', description: 'Process and port management' },
  { prefix: 'profile_', name: 'Profile Tools', description: 'Context profiles' },
  { prefix: 'rag_', name: 'RAG Tools', description: 'Semantic code search' },
];

function getAllFiles(dir, files = []) {
  const fullPath = path.join(rootDir, dir);

  if (!fs.existsSync(fullPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const entryPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(path.join(dir, entry.name), files);
    } else if (entry.isFile() && TOOL_FILE_PATTERNS.some(p => p.test(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractToolNames(content) {
  const tools = new Set();

  for (const pattern of TOOL_NAME_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      const toolName = match[1].toLowerCase();
      // Filter out common false positives
      if (toolName.length > 3 &&
          !toolName.startsWith('get_') &&
          !toolName.startsWith('set_') &&
          !toolName.startsWith('is_') &&
          !toolName.includes('handler') &&
          toolName.includes('_')) {
        tools.add(toolName);
      }
    }
  }

  return [...tools];
}

function groupTools(tools) {
  const grouped = {};

  for (const tool of tools) {
    let group = 'Other Tools';
    let description = 'Miscellaneous tools';

    for (const g of TOOL_GROUPS) {
      if (tool.startsWith(g.prefix)) {
        group = g.name;
        description = g.description;
        break;
      }
    }

    if (!grouped[group]) {
      grouped[group] = { description, tools: [] };
    }
    grouped[group].tools.push(tool);
  }

  // Sort tools within each group
  for (const group of Object.values(grouped)) {
    group.tools.sort();
  }

  return grouped;
}

function generateMarkdown(grouped) {
  const lines = [];

  lines.push('# MCP Tools Reference');
  lines.push('');
  lines.push('> Auto-generated from source code. Do not edit manually.');
  lines.push('>');
  lines.push('> Run `node scripts/generate-tools-docs.mjs` to regenerate.');
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('This document lists all MCP tools available in Code Guardian Studio.');
  lines.push('For detailed usage, see the individual guide documents linked below.');
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  const groupNames = Object.keys(grouped).sort();
  for (const name of groupNames) {
    const anchor = name.toLowerCase().replace(/\s+/g, '-');
    lines.push(`- [${name}](#${anchor})`);
  }
  lines.push('');

  // Tool groups
  for (const name of groupNames) {
    const group = grouped[name];
    lines.push(`## ${name}`);
    lines.push('');
    lines.push(`> ${group.description}`);
    lines.push('');
    lines.push('| Tool | Description |');
    lines.push('|------|-------------|');

    for (const tool of group.tools) {
      // Generate a human-readable description from the tool name
      const desc = tool
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/^([A-Z][a-z]+)\s/, '');
      lines.push(`| \`${tool}\` | ${desc} |`);
    }
    lines.push('');
  }

  // Related docs
  lines.push('## Related Documentation');
  lines.push('');
  lines.push('- [User Guide](USER_GUIDE.md) - Complete CLI and MCP reference');
  lines.push('- [Session Resume](SESSION_RESUME.md) - Session tools in detail');
  lines.push('- [Auto-Checkpoints](AUTO_CHECKPOINTS_AND_DIFF.md) - Checkpoint tools');
  lines.push('- [Completion Gates](COMPLETION_GATES.md) - Workflow gate tools');
  lines.push('- [Guard Rulesets](GUARD_RULESETS.md) - Guard validation tools');
  lines.push('- [Testing Observability](TESTING_OBSERVABILITY.md) - Testing tools');
  lines.push('- [TaskGraph Workflows](TASKGRAPH_WORKFLOWS.md) - AutoAgent tools');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

function main() {
  console.log('MCP Tools Documentation Generator');
  console.log('='.repeat(50));

  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...getAllFiles(dir));
  }

  console.log(`Scanning ${allFiles.length} source files...\n`);

  const allTools = new Set();

  for (const file of allFiles) {
    if (!fs.existsSync(file)) continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const tools = extractToolNames(content);
      for (const tool of tools) {
        allTools.add(tool);
      }
    } catch (err) {
      console.warn(`Warning: Could not read ${file}`);
    }
  }

  // Also add known tools that might not be in scanned files
  const knownTools = [
    'session_init', 'session_status', 'session_save', 'session_resume',
    'session_offer', 'session_timeline', 'session_replay', 'session_export', 'session_end',
    'resource_checkpoint_create', 'resource_checkpoint_list', 'resource_checkpoint_restore',
    'resource_checkpoint_delete', 'resource_checkpoint_diff', 'resource_governor_state',
    'resource_action_allowed', 'resource_status', 'resource_update_tokens', 'resource_estimate_task',
    'guard_validate', 'guard_check_test', 'guard_rules', 'guard_toggle_rule', 'guard_status',
    'testing_run', 'testing_run_affected', 'testing_browser_open', 'testing_browser_analysis',
    'testing_browser_screenshot', 'testing_browser_logs', 'testing_browser_network',
    'testing_browser_errors', 'testing_browser_close', 'testing_cleanup', 'testing_status',
    'workflow_task_create', 'workflow_task_start', 'workflow_task_update', 'workflow_task_complete',
    'workflow_task_pause', 'workflow_task_fail', 'workflow_task_note', 'workflow_task_list',
    'workflow_task_delete', 'workflow_current', 'workflow_status', 'workflow_cleanup',
    'memory_store', 'memory_recall', 'memory_forget', 'memory_summary', 'memory_list',
    'latent_context_create', 'latent_context_get', 'latent_context_update', 'latent_phase_transition',
    'latent_apply_patch', 'latent_validate_response', 'latent_complete_task', 'latent_list_contexts',
    'latent_delete_context', 'latent_status', 'latent_step_log', 'latent_diff_apply',
    'latent_diff_confirm', 'latent_diff_rollback', 'latent_diff_config', 'latent_diff_pending',
    'code_scan_repository', 'code_metrics', 'code_hotspots', 'code_refactor_plan',
    'code_record_optimization', 'code_generate_report', 'code_quick_analysis', 'code_optimizer_status',
    'auto_decompose_task', 'auto_analyze_complexity', 'auto_route_tools', 'auto_fix_loop',
    'auto_fix_status', 'auto_store_error', 'auto_recall_errors', 'auto_agent_status',
    'auto_workflow_start',
    'agents_list', 'agents_get', 'agents_select', 'agents_register', 'agents_coordinate',
    'agents_reload', 'agents_status',
    'documents_search', 'documents_find_by_type', 'documents_should_update', 'documents_update',
    'documents_create', 'documents_register', 'documents_scan', 'documents_list', 'documents_status',
    'thinking_get_model', 'thinking_suggest_model', 'thinking_list_models', 'thinking_get_workflow',
    'thinking_suggest_workflow', 'thinking_list_workflows', 'thinking_save_snippet',
    'thinking_get_style', 'thinking_list_snippets', 'thinking_status',
    'process_check_port', 'process_check_all_ports', 'process_kill_on_port', 'process_kill',
    'process_spawn', 'process_list', 'process_cleanup', 'process_status',
    'profile_list', 'profile_get', 'profile_switch', 'profile_create', 'profile_detect', 'profile_status',
    'rag_build_index', 'rag_query', 'rag_related_code', 'rag_status', 'rag_clear_index', 'rag_get_chunk',
  ];

  for (const tool of knownTools) {
    allTools.add(tool);
  }

  console.log(`Found ${allTools.size} unique tools.\n`);

  const grouped = groupTools([...allTools]);
  const markdown = generateMarkdown(grouped);

  const outputPath = path.join(rootDir, 'docs', 'TOOLS_REFERENCE.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`Generated: ${outputPath}`);
  console.log('Done.');
}

main();
