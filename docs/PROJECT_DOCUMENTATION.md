# Claude Code Guardian (CCG) - Project Documentation

> Version 1.0.0 | Updated: November 2025

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Infrastructure](#core-infrastructure)
4. [Modules](#modules)
5. [MCP Tools Reference](#mcp-tools-reference)
6. [Configuration](#configuration)
7. [Usage Guide](#usage-guide)
8. [Development](#development)

---

## Overview

### What is Claude Code Guardian?

Claude Code Guardian (CCG) is an MCP (Model Context Protocol) server that enhances Claude's coding capabilities with:

- **Persistent Memory** - Store decisions, facts, patterns across sessions
- **Code Validation** - Guard against fake tests, empty catches, disabled features
- **Multi-Agent Architecture** - Specialized agents for different domains
- **Project-Scoped Context** - Domain-specific business rules and conventions
- **Workflow Management** - Task tracking and progress monitoring
- **Resource Management** - Token usage and checkpoint system
- **Process Management** - Port and process lifecycle control
- **Testing Support** - Test templates and browser automation
- **Document Management** - Document registry and update detection

### Key Features

| Feature | Description |
|---------|-------------|
| Memory Module | Persistent SQLite-backed memory with search and recall |
| Guard Module | Code validation with configurable rules |
| Agents Module | Multi-agent system with delegation rules |
| Commands Module | Slash command registry with templates |
| Workflow Module | Task creation, tracking, progress |
| Resource Module | Token tracking, auto-checkpoints |
| Process Module | Port management, process spawning |
| Testing Module | Test runner, browser automation, templates |
| Documents Module | Document registry, update detection |

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Protocol**: MCP (Model Context Protocol)
- **Database**: SQLite (better-sqlite3)
- **Browser**: Playwright (optional)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code                               │
│                    (MCP Client)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (stdio)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CCG MCP Server                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core Infrastructure                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐  │   │
│  │  │ EventBus │ │  Logger  │ │ConfigMgr   │ │ StateMgr │  │   │
│  │  └──────────┘ └──────────┘ └────────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Modules                              │   │
│  │  ┌────────┐ ┌───────┐ ┌────────┐ ┌──────────┐          │   │
│  │  │ Memory │ │ Guard │ │ Agents │ │ Commands │          │   │
│  │  └────────┘ └───────┘ └────────┘ └──────────┘          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐   │   │
│  │  │ Workflow │ │ Resource │ │ Process │ │  Testing  │   │   │
│  │  └──────────┘ └──────────┘ └─────────┘ └───────────┘   │   │
│  │  ┌───────────┐                                          │   │
│  │  │ Documents │                                          │   │
│  │  └───────────┘                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Persistent Storage                          │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  memory.db   │  │ project-memory  │  │   checkpoints    │   │
│  │   (SQLite)   │  │    (.json)      │  │     (.json)      │   │
│  └──────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
claude-code-guardian/
├── src/
│   ├── core/                    # Core infrastructure
│   │   ├── types.ts            # Type definitions
│   │   ├── event-bus.ts        # Event system
│   │   ├── logger.ts           # Logging utility
│   │   ├── config-manager.ts   # Configuration management
│   │   ├── state-manager.ts    # Session state
│   │   └── index.ts            # Core exports
│   │
│   ├── modules/                 # Feature modules
│   │   ├── memory/             # Memory module
│   │   │   ├── memory.types.ts
│   │   │   ├── memory.service.ts
│   │   │   ├── memory.tools.ts
│   │   │   ├── project-memory.ts  # Project-scoped memory
│   │   │   └── index.ts
│   │   │
│   │   ├── guard/              # Code validation
│   │   │   ├── guard.types.ts
│   │   │   ├── guard.service.ts
│   │   │   ├── guard.tools.ts
│   │   │   ├── rules/          # Validation rules
│   │   │   └── index.ts
│   │   │
│   │   ├── agents/             # Multi-agent system
│   │   │   ├── agents.types.ts
│   │   │   ├── agents.service.ts
│   │   │   ├── agents.tools.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── commands/           # Slash commands
│   │   │   ├── commands.types.ts
│   │   │   ├── commands.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── workflow/           # Task management
│   │   ├── resource/           # Token & checkpoints
│   │   ├── process/            # Port & process management
│   │   ├── testing/            # Test runner & templates
│   │   ├── documents/          # Document registry
│   │   └── index.ts            # Module exports
│   │
│   ├── hooks/                   # Hook handlers
│   │   ├── session-start.hook.ts
│   │   ├── pre-tool-call.hook.ts
│   │   ├── post-tool-call.hook.ts
│   │   ├── session-end.hook.ts
│   │   └── index.ts
│   │
│   ├── bin/                     # CLI tools
│   │   ├── ccg.ts              # Main CLI
│   │   └── hook-command.ts     # Hook executor
│   │
│   ├── server.ts               # MCP server factory
│   └── index.ts                # Entry point
│
├── templates/                   # Configuration templates
├── schemas/                     # JSON schemas
├── docs/                        # Documentation
├── dist/                        # Compiled output
└── .ccg/                        # Runtime data directory
```

---

## Core Infrastructure

### EventBus

Central event system for inter-module communication.

```typescript
// Event Types
type CCGEventType =
  | 'session:start' | 'session:end'
  | 'task:create' | 'task:complete'
  | 'guard:warning' | 'guard:block'
  | 'memory:store' | 'memory:recall'
  | 'agent:registered' | 'agent:selected'
  | 'resource:checkpoint'
  // ... more events

// Usage
eventBus.emit({
  type: 'memory:store',
  timestamp: new Date(),
  data: { id: 'mem-123', type: 'decision' }
});

eventBus.on('memory:store', (event) => {
  console.log('Memory stored:', event.data);
});
```

### Logger

Structured logging with levels and context.

```typescript
const logger = new Logger('info', 'ModuleName');

logger.debug('Debug message', { data: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### ConfigManager

Configuration loading and management.

```typescript
const config = await configManager.load();
const memoryConfig = await configManager.get('modules.memory');
```

### StateManager

Session state management.

```typescript
const session = stateManager.createSession();
stateManager.getSession();
stateManager.endSession();
```

---

## Modules

### 1. Memory Module

Persistent memory storage with SQLite backend.

#### Features
- Store decisions, facts, code patterns, errors
- Search and recall with relevance scoring
- Duplicate detection and merging
- Importance-based retention

#### Types
```typescript
type MemoryType =
  | 'decision'      // Choices made
  | 'fact'          // Learned information
  | 'code_pattern'  // Reusable code
  | 'error'         // Mistakes to avoid
  | 'note'          // General notes
  | 'convention'    // Project rules
  | 'architecture'; // System design
```

#### Project-Scoped Memory

Domain-specific memory with business principles.

```typescript
// Supported domains
type ProjectDomain =
  | 'erp'           // ERP systems
  | 'trading'       // Trading platforms
  | 'orchestration' // Worker/queue systems
  | 'ecommerce'     // E-commerce
  | 'cms'           // Content management
  | 'api'           // API services
  | 'general';      // Generic

// Business principles per domain
const ERP_PRINCIPLES = [
  'All inventory operations must be warehouse-scoped',
  'Negative stock is not allowed by default',
  'Customer debt must be tracked per transaction'
];

const TRADING_PRINCIPLES = [
  'Max leverage must be configurable and enforced',
  'Stop loss is required for all positions',
  'Strategy logic must be isolated and testable'
];
```

### 2. Guard Module

Code validation and quality enforcement.

#### Built-in Rules
| Rule | Description |
|------|-------------|
| `fake-test` | Detect tests without assertions |
| `disabled-feature` | Find commented/disabled code |
| `empty-catch` | Find empty catch blocks |
| `emoji-code` | Detect emojis in code |
| `swallowed-exception` | Find caught but ignored errors |

#### Validation Result
```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  blocked: boolean;
  suggestions: string[];
}
```

### 3. Agents Module

Multi-agent architecture for specialized task handling.

#### Built-in Agents

| Agent | Role | Specializations |
|-------|------|-----------------|
| `trading-agent` | Quant & Trading Engineer | Trading logic, risk management, backtesting |
| `laravel-agent` | Laravel Backend Engineer | PHP, Eloquent, REST APIs, migrations |
| `react-agent` | React Frontend Engineer | React, TypeScript, components, hooks |
| `node-agent` | Node.js Orchestration Engineer | Workers, queues, event-driven |

#### Delegation Rules
```typescript
interface DelegationRule {
  id: string;
  pattern: string;           // Pattern to match
  matchType: 'keyword' | 'file_pattern' | 'domain' | 'regex';
  priority: number;          // Higher = more specific
}
```

#### Agent Selection
```typescript
// Select best agent for a task
const selection = agentsModule.selectAgent({
  task: 'Implement trading strategy backtest',
  files: ['strategy.py', 'backtest.py'],
  domain: 'trading'
});
// Returns: { agent: trading-agent, confidence: 0.85, reason: '...' }
```

#### Cross-Agent Coordination
```typescript
const result = agentsModule.coordinateAgents({
  task: 'Full-stack feature review',
  agentIds: ['react-agent', 'laravel-agent'],
  mode: 'review'  // 'sequential' | 'parallel' | 'review'
});
```

### 4. Commands Module

Slash command registry and execution.

#### Built-in Commands

**Base Commands (All projects)**
| Command | Description |
|---------|-------------|
| `/add-endpoint` | Create API endpoint with tests |
| `/build-dashboard` | Create dashboard component |
| `/full-review` | Comprehensive code review |
| `/risk-check` | Security risk analysis |

**ERP Commands**
| Command | Description |
|---------|-------------|
| `/add-crud` | Generate CRUD operations |
| `/add-report` | Create report with filters |
| `/check-stock` | Validate inventory code |
| `/debt-flow` | Review debt tracking |

**Trading Commands**
| Command | Description |
|---------|-------------|
| `/backtest` | Create/review backtest |
| `/live-trade-check` | Pre-deployment safety |
| `/strategy-review` | Review strategy code |

**Orchestration Commands**
| Command | Description |
|---------|-------------|
| `/add-worker` | Create background worker |
| `/orchestration-flow` | Design/review flow |
| `/cost-analysis` | Analyze API costs |

#### Command Execution
```typescript
const result = commandsModule.executeCommand('/add-endpoint users POST');
// Returns expanded prompt with arguments substituted
```

### 5. Workflow Module

Task management and progress tracking.

#### Task States
```
pending → in_progress → completed
              ↓
           paused
              ↓
           blocked → failed
```

#### Task Operations
```typescript
// Create task
const task = await workflowModule.createTask({
  name: 'Implement auth',
  priority: 'high',
  tags: ['auth', 'security']
});

// Start task
await workflowModule.startTask(task.id);

// Update progress
await workflowModule.updateProgress(task.id, 50);

// Complete task
await workflowModule.completeTask(task.id);
```

### 6. Resource Module

Token usage tracking and checkpoints.

#### Features
- Token usage monitoring
- Auto-checkpoints at thresholds (70%, 85%, 95%)
- Manual checkpoint creation
- Checkpoint restoration

#### Checkpoints
```typescript
// Create checkpoint
await resourceModule.createCheckpoint({
  name: 'Before refactoring',
  reason: 'before_risky_operation'
});

// List checkpoints
const checkpoints = await resourceModule.listCheckpoints();

// Restore from checkpoint
await resourceModule.restoreCheckpoint(checkpointId);
```

### 7. Process Module

Port and process lifecycle management.

#### Features
- Port availability checking
- Process spawning with tracking
- Automatic cleanup on session end
- Kill processes on port

#### Operations
```typescript
// Check port
const status = await processModule.checkPort(3000);

// Spawn process
const result = await processModule.spawn({
  command: 'npm',
  args: ['run', 'dev'],
  port: 3000,
  name: 'dev-server'
});

// Kill on port
await processModule.killOnPort(3000);
```

### 8. Testing Module

Test execution and browser automation.

#### Test Templates

| Template | Stack | Type |
|----------|-------|------|
| Laravel CRUD Test | PHP/PHPUnit | CRUD operations |
| React Component Test | Jest/RTL | Component testing |
| Python Backtest Test | pytest | Trading strategy |
| Node.js Worker Test | Jest | Background jobs |

#### Browser Testing
```typescript
// Open browser
const session = await testingModule.openBrowser('http://localhost:3000');

// Take screenshot
const screenshot = await testingModule.screenshot(session.id);

// Get console logs
const logs = await testingModule.getConsoleLogs(session.id);

// Close browser
await testingModule.closeBrowser(session.id);
```

### 9. Documents Module

Document registry and management.

#### Features
- Automatic document discovery
- Document type detection
- Update detection (prevent duplicates)
- Search by content or type

#### Document Types
```typescript
type DocumentType =
  | 'readme'       // README files
  | 'spec'         // Specifications
  | 'api'          // API documentation
  | 'guide'        // How-to guides
  | 'changelog'    // Change logs
  | 'architecture' // Architecture docs
  | 'config'       // Configuration docs
  | 'other';       // Miscellaneous
```

---

## MCP Tools Reference

### Session Tools

| Tool | Description |
|------|-------------|
| `session_init` | Initialize CCG session |
| `session_end` | End session, save data |
| `session_status` | Get current status |

### Memory Tools

| Tool | Description |
|------|-------------|
| `memory_store` | Store new memory |
| `memory_recall` | Search memories |
| `memory_forget` | Delete memory |
| `memory_summary` | Get summary |
| `memory_list` | List all memories |

### Guard Tools

| Tool | Description |
|------|-------------|
| `guard_validate` | Validate code |
| `guard_check_test` | Check test for fakes |
| `guard_rules` | List rules |
| `guard_toggle_rule` | Enable/disable rule |
| `guard_status` | Get status |

### Agent Tools

| Tool | Description |
|------|-------------|
| `agents_list` | List all agents |
| `agents_get` | Get agent details |
| `agents_select` | Select agent for task |
| `agents_register` | Register new agent |
| `agents_coordinate` | Coordinate multiple agents |
| `agents_reload` | Reload from files |
| `agents_status` | Get status |

### Workflow Tools

| Tool | Description |
|------|-------------|
| `workflow_task_create` | Create task |
| `workflow_task_start` | Start task |
| `workflow_task_update` | Update progress |
| `workflow_task_complete` | Mark complete |
| `workflow_task_pause` | Pause task |
| `workflow_task_fail` | Mark failed |
| `workflow_task_note` | Add note |
| `workflow_task_list` | List tasks |
| `workflow_current` | Get current task |
| `workflow_status` | Get status |

### Resource Tools

| Tool | Description |
|------|-------------|
| `resource_status` | Get token status |
| `resource_update_tokens` | Update usage |
| `resource_estimate_task` | Estimate tokens |
| `resource_checkpoint_create` | Create checkpoint |
| `resource_checkpoint_list` | List checkpoints |
| `resource_checkpoint_restore` | Restore checkpoint |
| `resource_checkpoint_delete` | Delete checkpoint |

### Process Tools

| Tool | Description |
|------|-------------|
| `process_check_port` | Check port status |
| `process_check_all_ports` | Check all ports |
| `process_kill_on_port` | Kill process on port |
| `process_kill` | Kill by PID |
| `process_spawn` | Spawn process |
| `process_list` | List processes |
| `process_cleanup` | Cleanup all |
| `process_status` | Get status |

### Testing Tools

| Tool | Description |
|------|-------------|
| `testing_run` | Run tests |
| `testing_run_affected` | Run affected tests |
| `testing_browser_open` | Open browser |
| `testing_browser_screenshot` | Take screenshot |
| `testing_browser_logs` | Get console logs |
| `testing_browser_network` | Get network requests |
| `testing_browser_errors` | Get errors |
| `testing_browser_close` | Close browser |
| `testing_cleanup` | Cleanup test data |
| `testing_status` | Get status |

### Document Tools

| Tool | Description |
|------|-------------|
| `documents_search` | Search documents |
| `documents_find_by_type` | Find by type |
| `documents_should_update` | Check if update needed |
| `documents_update` | Update document |
| `documents_create` | Create document |
| `documents_register` | Register existing |
| `documents_scan` | Scan project |
| `documents_list` | List all |
| `documents_status` | Get status |

---

## Configuration

### Main Configuration (`.ccg/config.json`)

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-project",
    "type": "typescript-node",
    "root": "."
  },
  "modules": {
    "memory": {
      "enabled": true,
      "maxItems": 1000,
      "autoSave": true,
      "persistPath": ".ccg/memory.db"
    },
    "guard": {
      "enabled": true,
      "strictMode": false,
      "rules": {
        "blockFakeTests": true,
        "blockDisabledFeatures": true,
        "blockEmptyCatch": true,
        "blockEmojiInCode": true
      }
    },
    "agents": {
      "enabled": true,
      "agentsFilePath": "AGENTS.md",
      "agentsDir": ".claude/agents",
      "autoReload": true,
      "enableCoordination": true
    },
    "workflow": {
      "enabled": true,
      "autoTrackTasks": true
    },
    "resource": {
      "enabled": true,
      "checkpoints": {
        "auto": true,
        "thresholds": [70, 85, 95]
      }
    },
    "process": {
      "enabled": true,
      "ports": {
        "dev": 3000,
        "api": 8080
      }
    },
    "testing": {
      "enabled": true,
      "testCommand": "npm test"
    },
    "documents": {
      "enabled": true,
      "updateInsteadOfCreate": true
    }
  }
}
```

### MCP Configuration (`.mcp.json`)

```json
{
  "mcpServers": {
    "claude-code-guardian": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "CCG_PROJECT_ROOT": ".",
        "CCG_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CCG_PROJECT_ROOT` | Project root directory | `process.cwd()` |
| `CCG_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |
| `CCG_CONFIG_PATH` | Custom config path | `.ccg/config.json` |

---

## Usage Guide

### Installation

```bash
# Clone repository
git clone https://github.com/anthropics/claude-code-guardian.git
cd claude-code-guardian

# Install dependencies
npm install

# Build
npm run build

# Initialize in your project
npx ccg init
```

### Basic Workflow

1. **Session Start**
   - CCG loads memory and pending tasks
   - Returns session ID and status

2. **During Session**
   - Store important decisions in memory
   - Track tasks with workflow
   - Validate code with guard
   - Select appropriate agents for tasks

3. **Session End**
   - Memory is persisted
   - Tasks are saved
   - Processes are cleaned up

### Best Practices

1. **Memory Usage**
   - Store decisions with importance 8-10 for critical items
   - Use tags for easy recall
   - Let CCG handle duplicate detection

2. **Task Management**
   - Create tasks for multi-step work
   - Update progress regularly
   - Add notes for context

3. **Code Validation**
   - Run guard before commits
   - Enable strict mode for critical projects
   - Review blocked items carefully

4. **Agent Selection**
   - Provide task context for better matching
   - Use domain hints when applicable
   - Let coordination handle cross-domain tasks

---

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running Locally

```bash
# Start server
npm start

# With debug logging
CCG_LOG_LEVEL=debug npm start
```

### Adding a New Module

1. Create directory in `src/modules/<module-name>/`
2. Create type definitions (`*.types.ts`)
3. Create service class (`*.service.ts`)
4. Create MCP tools (`*.tools.ts`)
5. Create index with module class (`index.ts`)
6. Register in `src/modules/index.ts`
7. Add to server tool routing in `src/server.ts`

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

---

## Appendix

### File Locations

| Item | Path |
|------|------|
| Memory Database | `.ccg/memory.db` |
| Project Memory | `.ccg/project-memory.json` |
| Checkpoints | `.ccg/checkpoints/` |
| Tasks | `.ccg/tasks.json` |
| Documents Registry | `.ccg/documents.json` |
| Config | `.ccg/config.json` |

### Event Reference

```typescript
// Session events
'session:start' | 'session:end' | 'session:pause' | 'session:resume'

// Task events
'task:create' | 'task:start' | 'task:progress' | 'task:complete' | 'task:fail'

// Guard events
'guard:warning' | 'guard:block' | 'guard:pass'

// Resource events
'resource:warning' | 'resource:critical' | 'resource:checkpoint'

// Memory events
'memory:store' | 'memory:recall' | 'memory:forget'

// Agent events
'agent:registered' | 'agent:updated' | 'agent:removed' | 'agent:selected'

// Process events
'process:spawn' | 'process:kill' | 'process:port-conflict'

// Document events
'document:create' | 'document:update' | 'document:register'
```

---

**Claude Code Guardian** - Enhancing Claude's coding capabilities with memory, validation, and multi-agent intelligence.
