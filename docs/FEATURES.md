# CCG Features

Complete guide to all Code Guardian Studio features and 113+ MCP tools.

## Overview

Code Guardian Studio (CCG) is the most comprehensive MCP server for Claude Code, offering:

- **113+ MCP tools** across 17 modules
- **Session persistence** with automatic save/resume
- **Long-term memory** across conversations
- **Real-time progress dashboard** with WebSocket updates
- **Code analysis** with hotspot detection
- **Workflow management** with task tracking
- **Latent Chain reasoning** for complex tasks

---

## Pricing Tiers

CCG features are available across three tiers:

| Tier | Price | Description |
|------|-------|-------------|
| 🆓 **Dev** | Free | Core features for individual developers |
| 💎 **Team** | $19/mo | Advanced features for professional teams |
| 🏢 **Enterprise** | Custom | SSO, audit logs, dedicated support |

See [Pricing](https://codeguardian.studio/pricing) for details.

---

## Module Overview

| Module | Tools | Tier | Purpose |
|--------|-------|------|---------|
| [CCG Entrypoint](#ccg-entrypoint) | 1 | 🆓 | Natural language command interface |
| [Session](#session-management) | 10 | 🆓 | Session lifecycle, export, resume |
| [Memory](#memory-system) | 5 | 🆓 | Persistent knowledge storage |
| [Workflow](#workflow-management) | 12 | 🆓 | Task tracking and management |
| [Guard](#guard-module) | 5 | 🆓 | Code validation rules |
| [Code Optimizer](#code-optimizer) | 8 | 🆓 | Metrics, hotspots, refactoring |
| [Process](#process-management) | 8 | 🆓 | Process and port control |
| [Resource](#resource-management) | 10 | 🆓 | Token budgeting, checkpoints |
| [Progress](#progress-dashboard) | 4 | 🆓 | Real-time workflow visualization |
| [Profile](#profile-module) | 8 | 🆓 | Context profiles |
| [Latent Chain](#latent-chain) | 16 | 💎 | Multi-phase reasoning |
| [AutoAgent](#autoagent) | 20 | 💎 | Task decomposition, error fixing |
| [Thinking](#thinking-module) | 10 | 💎 | Reasoning models and workflows |
| [RAG](#rag-module) | 6 | 💎 | Semantic code search |
| [Agents](#agents-module) | 7 | 💎 | Multi-agent coordination |
| [Testing](#testing-module) | 11 | 💎 | Test runner, browser testing |
| [Documents](#documents-module) | 9 | 💎 | Documentation management |

---

## CCG Entrypoint

The `/ccg` command provides natural language access to all CCG tools.

### ccg_run

Single entrypoint for natural language commands.

**Usage:**
```
/ccg "analyze code"
/ccg "run tests"
/ccg "check memory"
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Natural language command |
| `dryRun` | boolean | Preview without execution |
| `translationMode` | enum | `auto`, `pattern`, `claude`, `tiny` |

**Example Prompts:**
- `"analyze code"` - Run code analysis
- `"run tests"` - Execute test suite
- `"check memory"` - View memory summary
- `"validate code"` - Run guard validation
- `"scan repo"` - Full repository scan

---

## Session Management

Manage sessions with automatic save and resume capability.

### Tools

| Tool | Description |
|------|-------------|
| `session_init` | Initialize new session, load memory |
| `session_end` | End session, save all data |
| `session_status` | Get current session info |
| `session_timeline` | View session event history |
| `session_export` | Export session to JSON |
| `session_resume` | Resume from previous session |
| `session_replay` | Replay timeline in dry-run mode |
| `session_save` | Manual session save |
| `session_offer` | Check for resumable sessions |

### Features

**Automatic Session Management:**
- Sessions auto-save on significant events
- Resume work after disconnects or crashes
- Full context preservation including tasks and memory

**Session Timeline:**
- Track all task completions
- Record phase transitions
- Create checkpoints at key moments

**Export & Import:**
```typescript
// Export current session
session_export({ outputPath: "backup.json" })

// Resume from backup
session_resume({ sessionFile: "backup.json" })
```

---

## Memory System

Persistent knowledge storage that survives across sessions.

### Tools

| Tool | Description |
|------|-------------|
| `memory_store` | Save information with tags and importance |
| `memory_recall` | Search and retrieve memories |
| `memory_list` | List all stored memories |
| `memory_forget` | Remove specific memory |
| `memory_summary` | Get memory statistics |

### Memory Types

| Type | Purpose | Example |
|------|---------|---------|
| `decision` | Choices made | "Using React Query for data fetching" |
| `fact` | Learned information | "API uses JWT tokens" |
| `code_pattern` | Reusable patterns | "Error handling template" |
| `error` | Mistakes to avoid | "Don't use deprecated API" |
| `note` | General notes | "User prefers verbose logs" |
| `convention` | Project rules | "Use camelCase for variables" |
| `architecture` | System design | "Microservices with event bus" |

### Example Usage

```typescript
// Store a decision
memory_store({
  content: "Using PostgreSQL for persistence",
  type: "decision",
  importance: 8,
  tags: ["database", "architecture"]
})

// Recall related memories
memory_recall({
  query: "database",
  type: "decision",
  minImportance: 5
})
```

---

## Workflow Management

Track tasks, progress, and blockers throughout your development session.

### Tools

| Tool | Description |
|------|-------------|
| `workflow_task_create` | Create a new task |
| `workflow_task_start` | Begin working on task |
| `workflow_task_update` | Update progress |
| `workflow_task_complete` | Mark task done |
| `workflow_task_pause` | Pause current task |
| `workflow_task_fail` | Mark task as failed |
| `workflow_task_note` | Add notes to task |
| `workflow_task_list` | List all tasks |
| `workflow_task_delete` | Remove a task |
| `workflow_current` | Get active task |
| `workflow_status` | Workflow summary |
| `workflow_cleanup` | Clean old tasks |

### Task States

```
pending -> in_progress -> completed
                      -> paused
                      -> blocked
                      -> failed
```

### Example Workflow

```typescript
// Create task
const task = workflow_task_create({
  name: "Implement auth",
  priority: "high",
  tags: ["feature", "security"]
})

// Start working
workflow_task_start({ taskId: task.id })

// Update progress
workflow_task_update({ taskId: task.id, progress: 50 })

// Add notes
workflow_task_note({
  taskId: task.id,
  content: "Using JWT with 1h expiry",
  type: "decision"
})

// Complete
workflow_task_complete({ taskId: task.id })
```

---

## Guard Module

Validate code for quality issues, security problems, and bad patterns.

### Tools

| Tool | Description |
|------|-------------|
| `guard_validate` | Run validation rules on code |
| `guard_check_test` | Check for fake tests |
| `guard_rules` | List available rules |
| `guard_toggle_rule` | Enable/disable rules |
| `guard_status` | Module status |

### Available Rulesets

| Ruleset | Purpose |
|---------|---------|
| `default` | General code validation |
| `frontend` | React/Vue component rules |
| `backend` | API/server code rules |
| `security` | Security audit rules |
| `testing` | Test file validation |

### Common Rules

| Rule | Detects |
|------|---------|
| `fake-tests` | Tests without assertions |
| `empty-catch` | Empty catch blocks |
| `disabled-features` | Commented/disabled code |
| `inline-styles` | Inline CSS (frontend) |
| `mixed-concerns` | Business logic in UI |
| `sql-injection` | SQL injection vulnerabilities |
| `xss` | Cross-site scripting risks |

### Example

```typescript
guard_validate({
  code: fileContent,
  filename: "auth.ts",
  ruleset: "security",
  strict: true
})
```

---

## Code Optimizer

Analyze codebases, find hotspots, and plan refactoring.

### Tools

| Tool | Description |
|------|-------------|
| `code_scan_repository` | Scan entire codebase |
| `code_metrics` | Calculate file metrics |
| `code_hotspots` | Find problem areas |
| `code_refactor_plan` | Generate refactor steps |
| `code_record_optimization` | Log optimization work |
| `code_generate_report` | Create markdown report |
| `code_quick_analysis` | All-in-one analysis |
| `code_optimizer_status` | Module status |

### Metrics Calculated

| Metric | Description |
|--------|-------------|
| Lines | Total, code, comment, blank |
| Nesting Depth | Maximum nesting level |
| Branch Score | Complexity from conditionals |
| TODO/FIXME | Pending work markers |
| Complexity Score | Weighted composite |

### Hotspot Detection

Hotspots are files that need attention, ranked by:
- **Size**: Large files that should be split
- **Complexity**: High cyclomatic complexity
- **Nesting**: Deep nesting levels
- **Mixed concerns**: Files doing too much

### Example Workflow

```typescript
// Quick analysis (recommended)
const result = code_quick_analysis({
  strategy: "mixed",
  maxHotspots: 20
})

// Or step by step:
// 1. Scan repository
const scan = code_scan_repository()

// 2. Calculate metrics
const metrics = code_metrics({ files: scan.sourceFiles })

// 3. Find hotspots
const hotspots = code_hotspots({
  metrics,
  strategy: "complexity"
})

// 4. Generate plan
const plan = code_refactor_plan({
  hotspots,
  goal: "readability"
})

// 5. Generate report
code_generate_report({
  sessionId: "2024-01",
  scanResult: scan,
  hotspots,
  refactorPlan: plan
})
```

---

## Testing Module 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Run tests and perform browser testing with Playwright.

### Tools

| Tool | Description |
|------|-------------|
| `testing_run` | Execute tests |
| `testing_run_affected` | Run tests for changed files |
| `testing_browser_open` | Open browser session |
| `testing_browser_screenshot` | Take screenshot |
| `testing_browser_logs` | Get console logs |
| `testing_browser_network` | View network requests |
| `testing_browser_errors` | Get JS errors |
| `testing_browser_analysis` | Comprehensive analysis |
| `testing_browser_close` | Close browser |
| `testing_cleanup` | Clean test artifacts |
| `testing_status` | Module status |

### Test Runner

```typescript
// Run all tests
testing_run()

// Run with coverage
testing_run({ coverage: true })

// Run specific files
testing_run({ files: ["auth.test.ts"] })

// Run by pattern
testing_run({ grep: "login" })
```

### Browser Testing

```typescript
// Open browser
const session = testing_browser_open({
  url: "http://localhost:3000"
})

// Take screenshot
testing_browser_screenshot({
  sessionId: session.id,
  fullPage: true
})

// Get analysis
testing_browser_analysis({
  sessionId: session.id
})

// Close when done
testing_browser_close({ sessionId: session.id })
```

---

## Latent Chain 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Multi-phase reasoning for complex tasks with context persistence.

### Tools

| Tool | Description |
|------|-------------|
| `latent_context_create` | Start new reasoning context |
| `latent_context_get` | Retrieve context |
| `latent_context_update` | Update with delta |
| `latent_phase_transition` | Move to next phase |
| `latent_apply_patch` | Apply code patch |
| `latent_complete_task` | Finish task |
| `latent_delete_context` | Remove context |
| `latent_list_contexts` | List active contexts |
| `latent_step_log` | Log reasoning step |
| `latent_validate_response` | Validate response format |
| `latent_diff_apply` | Apply unified diff |
| `latent_diff_config` | Configure diff editor |
| `latent_diff_confirm` | Confirm pending edit |
| `latent_diff_pending` | List pending edits |
| `latent_diff_rollback` | Rollback changes |
| `latent_status` | Module status |

### Phases

```
analysis -> plan -> impl -> review
              ^       |
              +-------+  (go back if issues)
```

### Context Structure

```typescript
{
  taskId: "fix-auth-bug",
  phase: "analysis",
  codeMap: {
    files: ["src/auth.ts"],
    hotSpots: ["src/auth.ts:45"]
  },
  decisions: [
    { id: "D001", summary: "Use JWT", rationale: "Industry standard" }
  ],
  risks: ["Token expiry edge cases"],
  constraints: ["No breaking changes"]
}
```

### Example Flow

```typescript
// Create context
latent_context_create({
  taskId: "fix-auth",
  phase: "analysis"
})

// Log analysis step
latent_step_log({
  taskId: "fix-auth",
  phase: "analysis",
  description: "Found root cause in token validation"
})

// Transition to plan
latent_phase_transition({
  taskId: "fix-auth",
  toPhase: "plan",
  summary: "Analysis complete"
})

// Update with decisions
latent_context_update({
  taskId: "fix-auth",
  delta: {
    decisions: [{ id: "D001", summary: "Add token refresh" }]
  }
})

// Complete task
latent_complete_task({
  taskId: "fix-auth",
  summary: "Fixed token expiry bug"
})
```

---

## AutoAgent 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Automatic task decomposition and error fixing.

### Tools

| Tool | Description |
|------|-------------|
| `auto_decompose_task` | Break task into subtasks |
| `auto_analyze_complexity` | Score task complexity |
| `auto_route_tools` | Suggest tools for action |
| `auto_fix_loop` | Auto-fix errors |
| `auto_fix_status` | Fix loop status |
| `auto_store_error` | Save error pattern |
| `auto_recall_errors` | Find similar errors |
| `auto_create_graph` | Create task graph |
| `auto_run_graph` | Execute task graph |
| `auto_get_next_nodes` | Get next executable nodes |
| `auto_start_node` | Start graph node |
| `auto_complete_node` | Complete graph node |
| `auto_fail_node` | Mark node failed |
| `auto_graph_status` | Graph status |
| `auto_list_graphs` | List all graphs |
| `auto_delete_graph` | Delete graph |
| `auto_workflow_start` | Start from template |
| `auto_workflow_execute` | Execute workflow |
| `auto_workflow_mermaid` | Visualize workflow |
| `auto_agent_status` | Module status |

### Task Decomposition

```typescript
auto_decompose_task({
  taskName: "Add authentication",
  taskDescription: "Implement JWT auth with login/logout",
  files: ["src/auth/"],
  constraints: ["Must be backward compatible"]
})

// Returns:
// - Complexity score (1-10)
// - Subtasks with dependencies
// - Suggested tools per subtask
```

### Error Auto-Fix

```typescript
auto_fix_loop({
  errorType: "TypeError",
  errorMessage: "Cannot read property 'map' of undefined",
  file: "src/components/List.tsx",
  maxRetries: 3
})
```

---

## Agents Module 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Coordinate specialized agents for domain-specific tasks.

### Tools

| Tool | Description |
|------|-------------|
| `agents_list` | List available agents |
| `agents_get` | Get agent details |
| `agents_select` | Find best agent for task |
| `agents_register` | Register new agent |
| `agents_coordinate` | Coordinate multiple agents |
| `agents_reload` | Reload agent definitions |
| `agents_status` | Module status |

### Built-in Agents

| Agent | Specialization |
|-------|----------------|
| `trading-agent` | Financial/trading systems |
| `laravel-agent` | Laravel/PHP development |
| `orchestration-agent` | System orchestration |

### Agent Coordination

```typescript
// Sequential: one after another
agents_coordinate({
  task: "Review and test auth",
  agentIds: ["code-reviewer", "test-runner"],
  mode: "sequential"
})

// Review: first does work, others review
agents_coordinate({
  task: "Implement feature",
  agentIds: ["developer", "reviewer", "tester"],
  mode: "review"
})
```

---

## Documents Module 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Manage project documentation.

### Tools

| Tool | Description |
|------|-------------|
| `documents_search` | Search by query |
| `documents_find_by_type` | Find by type |
| `documents_should_update` | Check if update needed |
| `documents_update` | Update existing doc |
| `documents_create` | Create new doc |
| `documents_register` | Register existing doc |
| `documents_scan` | Scan for documents |
| `documents_list` | List all docs |
| `documents_status` | Module status |

### Document Types

- `readme` - README files
- `spec` - Specifications
- `api` - API documentation
- `guide` - User guides
- `changelog` - Version history
- `architecture` - System design
- `config` - Configuration docs

---

## Process Management

Manage processes and ports.

### Tools

| Tool | Description |
|------|-------------|
| `process_check_port` | Check if port available |
| `process_check_all_ports` | Check configured ports |
| `process_kill_on_port` | Kill process on port |
| `process_kill` | Kill by PID |
| `process_spawn` | Start new process |
| `process_list` | List running processes |
| `process_cleanup` | Kill all CCG processes |
| `process_status` | Module status |

### Example

```typescript
// Check if port is free
process_check_port({ port: 3000 })

// Kill process on port
process_kill_on_port({ port: 3000, force: true })

// Start dev server
process_spawn({
  command: "npm",
  args: ["run", "dev"],
  port: 3000,
  name: "dev-server"
})
```

---

## Resource Management

Manage tokens, checkpoints, and resources.

### Tools

| Tool | Description |
|------|-------------|
| `resource_status` | Token usage stats |
| `resource_update_tokens` | Update token count |
| `resource_estimate_task` | Estimate task tokens |
| `resource_checkpoint_create` | Save checkpoint |
| `resource_checkpoint_list` | List checkpoints |
| `resource_checkpoint_restore` | Restore checkpoint |
| `resource_checkpoint_delete` | Delete checkpoint |
| `resource_checkpoint_diff` | Compare checkpoints |
| `resource_governor_state` | Get budget mode |
| `resource_action_allowed` | Check if action allowed |

### Governor Modes

| Mode | Threshold | Restrictions |
|------|-----------|--------------|
| `normal` | < 70% | None |
| `conservative` | 70-84% | Delta-only, no browser testing |
| `critical` | >= 85% | Checkpoint required, finish up |

---

## Progress Dashboard

Real-time workflow visualization.

### Tools

| Tool | Description |
|------|-------------|
| `progress_status` | Get workflow progress |
| `progress_blockers` | List blocked nodes |
| `progress_mermaid` | Generate Mermaid diagram |
| `progress_clear` | Reset progress state |

### Mermaid Visualization

```typescript
progress_mermaid({
  direction: "TD",  // top-down
  showGateBadges: true
})

// Returns Mermaid diagram code
```

---

## RAG Module 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Semantic code search using embeddings.

### Tools

| Tool | Description |
|------|-------------|
| `rag_build_index` | Index codebase |
| `rag_query` | Semantic search |
| `rag_related_code` | Find similar code |
| `rag_get_chunk` | Get code chunk details |
| `rag_clear_index` | Clear index |
| `rag_status` | Module status |

---

## Thinking Module 💎

> **Requires Team tier** - [Upgrade](https://codeguardian.studio/pricing)

Structured reasoning models and workflows.

### Tools

| Tool | Description |
|------|-------------|
| `thinking_get_model` | Get reasoning model |
| `thinking_suggest_model` | Suggest model for task |
| `thinking_list_models` | List all models |
| `thinking_get_workflow` | Get SOP workflow |
| `thinking_suggest_workflow` | Suggest workflow |
| `thinking_list_workflows` | List workflows |
| `thinking_save_snippet` | Save code template |
| `thinking_get_style` | Get style reference |
| `thinking_list_snippets` | List snippets |
| `thinking_status` | Module status |

### Thinking Models

| Model | Use Case |
|-------|----------|
| `chain-of-thought` | Step-by-step reasoning |
| `tree-of-thoughts` | Multiple approaches |
| `react` | Reasoning + Acting |
| `self-consistency` | Verification |
| `decomposition` | Break down problems |
| `first-principles` | Fundamental analysis |

### Workflows

| Workflow | Purpose |
|----------|---------|
| `pre-commit` | Before committing |
| `code-review` | Reviewing code |
| `refactoring` | Safe refactoring |
| `deploy` | Deployment checklist |
| `bug-fix` | Bug fixing process |
| `feature-development` | New features |
| `security-audit` | Security review |

---

## Profile Module

Manage context profiles for different projects or modes.

### Tools

| Tool | Description |
|------|-------------|
| `profile_create` | Create profile |
| `profile_get` | Get profile details |
| `profile_switch` | Switch active profile |
| `profile_update` | Update profile |
| `profile_delete` | Delete profile |
| `profile_list` | List profiles |
| `profile_detect` | Auto-detect profile |
| `profile_status` | Module status |

---

## Quick Reference

### Most Used Tools

| Task | Tool |
|------|------|
| Start session | `session_init` |
| Analyze code | `code_quick_analysis` |
| Run tests | `testing_run` |
| Validate code | `guard_validate` |
| Store knowledge | `memory_store` |
| Create task | `workflow_task_create` |
| Check tokens | `resource_status` |

### Common Workflows

**1. Code Analysis:**
```
session_init -> code_quick_analysis -> code_generate_report
```

**2. Bug Fix:**
```
session_init -> latent_context_create -> latent_step_log ->
latent_phase_transition -> latent_complete_task
```

**3. Test & Validate:**
```
testing_run -> guard_validate -> workflow_task_complete
```

---

## Related Documentation

- [User Guide](USER_GUIDE.md) - Complete CLI and MCP reference
- [Quickstart](QUICKSTART.md) - Get started in 3 minutes
- [Comparison](COMPARISON.md) - CCG vs competitors
- [Session Resume](SESSION_RESUME.md) - Session management details
- [Latent Chain Guide](LATENT_CHAIN_GUIDE.md) - Multi-phase reasoning
- [Tools Reference](TOOLS_REFERENCE.md) - Auto-generated tool list

---

*Last updated: 2025-12-23*
