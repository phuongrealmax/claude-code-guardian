## TEMPLATES IMPLEMENTATION

---

### 1. TEMPLATES DIRECTORY STRUCTURE

```
templates/
├── config.template.json          # Main CCG configuration
├── hooks.template.json           # Claude Code hooks
├── mcp.template.json             # MCP server configuration
├── commands/
│   ├── ccg.md                    # Main CCG slash command
│   ├── ccg-task.md               # Task management commands
│   ├── ccg-memory.md             # Memory commands
│   ├── ccg-guard.md              # Guard commands
│   ├── ccg-test.md               # Testing commands
│   └── ccg-process.md            # Process commands
├── CLAUDE.md                     # Project instructions for Claude
└── examples/
    ├── config-minimal.json       # Minimal config
    ├── config-strict.json        # Strict mode config
    └── config-frontend.json      # Frontend project config
```

---

### 2. MAIN CONFIGURATION TEMPLATE

```json
// templates/config.template.json

{
  "$schema": "https://raw.githubusercontent.com/anthropic-community/claude-code-guardian/main/schemas/config.schema.json",
  "version": "1.0.0",
  
  "project": {
    "name": "",
    "type": "typescript-node",
    "root": "."
  },
  
  "modules": {
    "memory": {
      "enabled": true,
      "maxItems": 100,
      "autoSave": true,
      "persistPath": ".ccg/memory.db",
      "compressionEnabled": true
    },
    
    "guard": {
      "enabled": true,
      "strictMode": true,
      "rules": {
        "blockFakeTests": true,
        "blockDisabledFeatures": true,
        "blockEmptyCatch": true,
        "blockEmojiInCode": true,
        "blockSwallowedExceptions": true,
        "customRules": []
      }
    },
    
    "process": {
      "enabled": true,
      "ports": {
        "dev": 3000,
        "api": 8080,
        "test": 9000
      },
      "autoKillOnConflict": true,
      "trackSpawnedProcesses": true
    },
    
    "resource": {
      "enabled": true,
      "checkpoints": {
        "auto": true,
        "thresholds": [50, 70, 85, 95],
        "maxCheckpoints": 10,
        "compressOld": true
      },
      "warningThreshold": 70,
      "pauseThreshold": 95
    },
    
    "testing": {
      "enabled": true,
      "autoRun": false,
      "testCommand": "npm test",
      "browser": {
        "enabled": true,
        "headless": true,
        "captureConsole": true,
        "captureNetwork": true,
        "screenshotOnError": true
      },
      "cleanup": {
        "autoCleanTestData": true,
        "testDataPrefix": "test_",
        "testDataLocations": ["tmp", "test-data", ".test"]
      }
    },
    
    "documents": {
      "enabled": true,
      "locations": {
        "readme": "README.md",
        "docs": "docs",
        "api": "docs/api",
        "specs": "docs/specs",
        "changelog": "CHANGELOG.md"
      },
      "updateInsteadOfCreate": true,
      "namingConvention": "kebab-case"
    },
    
    "workflow": {
      "enabled": true,
      "autoTrackTasks": true,
      "requireTaskForLargeChanges": false,
      "largeChangeThreshold": 100
    }
  },
  
  "notifications": {
    "showInline": true,
    "showStatusBar": true,
    "verbosity": "normal",
    "sound": {
      "enabled": false,
      "criticalOnly": true
    }
  },
  
  "conventions": {
    "fileNaming": "kebab-case",
    "variableNaming": "camelCase",
    "componentNaming": "PascalCase",
    "noEmoji": true,
    "noUnicode": true
  }
}
```

---

### 3. HOOKS TEMPLATE

```json
// templates/hooks.template.json

{
  "$schema": "https://docs.anthropic.com/schemas/claude-code-hooks.schema.json",
  "version": "1.0",
  
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook session-start",
        "timeout": 10000,
        "onError": "warn"
      }
    ],
    
    "PreToolCall": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook pre-tool \"$TOOL_NAME\"",
        "timeout": 5000,
        "onError": "warn",
        "filter": {
          "tools": [
            "write_file",
            "edit_file",
            "create_file",
            "str_replace_editor",
            "bash"
          ]
        },
        "env": {
          "CCG_TOOL_INPUT": "$TOOL_INPUT_JSON"
        }
      }
    ],
    
    "PostToolCall": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook post-tool \"$TOOL_NAME\"",
        "timeout": 30000,
        "onError": "warn",
        "filter": {
          "tools": [
            "write_file",
            "edit_file",
            "create_file",
            "str_replace_editor"
          ]
        },
        "env": {
          "CCG_TOOL_INPUT": "$TOOL_INPUT_JSON",
          "CCG_TOOL_OUTPUT": "$TOOL_OUTPUT_JSON",
          "CCG_TOOL_SUCCESS": "$TOOL_SUCCESS",
          "CCG_TOOL_DURATION": "$TOOL_DURATION_MS"
        }
      }
    ],
    
    "Stop": [
      {
        "type": "command",
        "command": "npx @anthropic-community/claude-code-guardian hook session-end",
        "timeout": 15000,
        "onError": "ignore"
      }
    ]
  }
}
```

---

### 4. MCP SERVER TEMPLATE

```json
// templates/mcp.template.json

{
  "mcpServers": {
    "claude-code-guardian": {
      "command": "npx",
      "args": ["@anthropic-community/claude-code-guardian"],
      "env": {
        "CCG_PROJECT_ROOT": "${workspaceFolder}",
        "CCG_LOG_LEVEL": "info"
      }
    }
  }
}
```

---

### 5. MAIN SLASH COMMAND

```markdown
<!-- templates/commands/ccg.md -->

# Claude Code Guardian

🛡️ **Claude Code Guardian (CCG)** helps you code better by providing memory, guard rails, task tracking, and more.

## Quick Status

Show current CCG status:
- Memory items loaded
- Current task progress
- Token usage
- Active processes

## Commands

### Dashboard
```
/ccg
```
Show the main CCG dashboard with quick actions.

### Status
```
/ccg status
```
Show detailed status of all modules.

### Help
```
/ccg help [module]
```
Show help for CCG or a specific module.

## Modules

- **Memory** - `/ccg memory` - Store and recall information
- **Task** - `/ccg task` - Manage tasks and progress
- **Guard** - `/ccg guard` - Code validation rules
- **Test** - `/ccg test` - Run tests and browser checks
- **Process** - `/ccg process` - Manage ports and processes
- **Checkpoint** - `/ccg checkpoint` - Save and restore progress
- **Docs** - `/ccg docs` - Document management

## Quick Actions

| Command | Description |
|---------|-------------|
| `/ccg` | Dashboard |
| `/ccg status` | Full status |
| `/ccg task start "name"` | Start a task |
| `/ccg task done` | Complete current task |
| `/ccg checkpoint` | Create checkpoint |
| `/ccg test` | Run tests |
| `/ccg process list` | List processes |

---

When this command is invoked, use the `session_status` MCP tool to get current status and display it in a friendly format.
```

---

### 6. TASK COMMAND

```markdown
<!-- templates/commands/ccg-task.md -->

# CCG Task Management

Manage your coding tasks with progress tracking, notes, and checkpoints.

## Commands

### Start a Task
```
/ccg task start "task name" [--priority high|medium|low]
```
Start working on a new task. This will:
- Create a task entry
- Set it as the current active task
- Begin tracking progress and files modified

**Examples:**
```
/ccg task start "Implement user authentication"
/ccg task start "Fix login bug" --priority high
```

### Update Progress
```
/ccg task progress <percentage>
```
Update the current task's progress (0-100).

**Examples:**
```
/ccg task progress 50
/ccg task progress 75
```

### Add a Note
```
/ccg task note "note content" [--type note|decision|blocker|idea]
```
Add a note to the current task.

**Examples:**
```
/ccg task note "Decided to use JWT for tokens" --type decision
/ccg task note "Need to check database schema" --type blocker
```

### Complete Task
```
/ccg task done [task-id]
```
Mark a task as completed.

### Pause Task
```
/ccg task pause
```
Pause the current task. Progress will be saved.

### Resume Task
```
/ccg task resume [task-id]
```
Resume a paused task.

### List Tasks
```
/ccg task list [--status pending|in_progress|completed|all]
```
List tasks with optional status filter.

### Task Details
```
/ccg task show [task-id]
```
Show details of a specific task or current task.

## Task Workflow

```
┌──────────┐     ┌─────────────┐     ┌───────────┐
│  Start   │ ──► │ In Progress │ ──► │ Completed │
└──────────┘     └─────────────┘     └───────────┘
                       │
                       ▼
                 ┌───────────┐
                 │  Paused   │
                 └───────────┘
```

## Best Practices

1. **Start with a clear task name** - Be specific about what you're doing
2. **Update progress regularly** - Helps with time estimation
3. **Add notes for decisions** - Document why you made choices
4. **Mark blockers** - Track what's preventing progress
5. **Complete tasks** - Don't leave tasks hanging

---

When these commands are invoked, use the appropriate `workflow_*` MCP tools.
```

---

### 7. MEMORY COMMAND

```markdown
<!-- templates/commands/ccg-memory.md -->

# CCG Memory

Store and recall information across sessions. Memory persists between conversations.

## Commands

### Store Memory
```
/ccg memory save "content" [--type fact|decision|pattern|error|note] [--importance 1-10] [--tags tag1,tag2]
```
Save information to memory.

**Types:**
- `fact` - Project facts and information
- `decision` - Architectural or design decisions
- `pattern` - Code patterns and conventions
- `error` - Error solutions and fixes
- `note` - General notes

**Examples:**
```
/ccg memory save "Using PostgreSQL with Prisma ORM" --type fact --importance 8
/ccg memory save "Auth uses JWT with 1h expiry" --type decision --importance 9
/ccg memory save "Always use camelCase for variables" --type pattern --tags conventions
```

### Recall Memory
```
/ccg memory search "query" [--type type] [--limit n]
```
Search stored memories.

**Examples:**
```
/ccg memory search "authentication"
/ccg memory search "database" --type decision
/ccg memory search "error" --limit 5
```

### List Recent
```
/ccg memory recent [--limit n]
```
Show recently accessed memories.

### View All
```
/ccg memory list [--type type]
```
List all memories, optionally filtered by type.

### Delete Memory
```
/ccg memory forget <memory-id>
```
Remove a specific memory.

### Memory Summary
```
/ccg memory summary
```
Show summary of stored memories by type.

## Memory Types

| Type | Use For | Example |
|------|---------|---------|
| `fact` | Project information | "Database is PostgreSQL" |
| `decision` | Design choices | "Using microservices architecture" |
| `pattern` | Code conventions | "Components use PascalCase" |
| `error` | Bug fixes | "Port 3000 conflict: kill node process" |
| `note` | General notes | "TODO: Review auth flow" |

## Importance Levels

- **1-3**: Low importance, general notes
- **4-6**: Medium importance, useful information
- **7-8**: High importance, key decisions
- **9-10**: Critical, must remember

Higher importance memories are kept longer and returned first in searches.

## Tips

1. **Be specific** - Clear, searchable content
2. **Use types correctly** - Helps with filtering
3. **Tag consistently** - Makes searching easier
4. **Set importance** - Prioritizes what to remember

---

When these commands are invoked, use the `memory_*` MCP tools.
```

---

### 8. GUARD COMMAND

```markdown
<!-- templates/commands/ccg-guard.md -->

# CCG Guard

Code validation and protection against common mistakes.

## Commands

### Guard Status
```
/ccg guard status
```
Show current guard rules and statistics.

### Validate Code
```
/ccg guard check [file]
```
Manually validate a file or the last modified file.

### Enable/Disable Rules
```
/ccg guard enable <rule>
/ccg guard disable <rule>
```
Enable or disable specific guard rules.

**Available Rules:**
- `fake-tests` - Block tests without assertions
- `disabled-features` - Block commented-out features
- `empty-catch` - Block empty catch blocks
- `emoji-code` - Block emoji in code
- `swallowed-exceptions` - Block ignored errors

### View Rule Details
```
/ccg guard rule <rule-name>
```
Show details about a specific rule.

### Strict Mode
```
/ccg guard strict on|off
```
Enable or disable strict mode (blocks vs warns).

## Guard Rules

### 1. Fake Tests (`fake-tests`)
Detects tests that don't actually test anything:
- Tests without assertions
- Tests that just call functions without checking results
- Skipped test blocks

```javascript
// ❌ BLOCKED: No assertions
it('should work', () => {
  myFunction();
});

// ✅ OK: Has assertions
it('should work', () => {
  expect(myFunction()).toBe(true);
});
```

### 2. Disabled Features (`disabled-features`)
Detects accidentally disabled functionality:
- Commented-out critical code
- `if (false)` blocks
- Empty function implementations

```javascript
// ❌ BLOCKED: Disabled auth
// function validateToken(token) {
//   return jwt.verify(token);
// }

// ❌ BLOCKED: Empty implementation
function validateToken(token) {
  return;  // Disabled for testing
}
```

### 3. Empty Catch (`empty-catch`)
Detects swallowed errors:

```javascript
// ❌ BLOCKED: Empty catch
try {
  await saveData();
} catch (e) {}

// ✅ OK: Handles error
try {
  await saveData();
} catch (e) {
  console.error('Save failed:', e);
  throw e;
}
```

### 4. Emoji in Code (`emoji-code`)
Prevents emoji that can cause encoding issues:

```javascript
// ❌ BLOCKED
const status = '✅ Complete';

// ✅ OK
const status = 'Complete';
```

### 5. Swallowed Exceptions (`swallowed-exceptions`)
Detects caught but ignored errors:

```javascript
// ❌ BLOCKED: Error ignored
catch (error) {
  // TODO: handle later
}

// ✅ OK: Error handled
catch (error) {
  logger.error(error);
  throw new AppError('Operation failed', error);
}
```

## Severity Levels

| Level | Action | Use |
|-------|--------|-----|
| `info` | Log only | Minor suggestions |
| `warning` | Warn user | Should be fixed |
| `error` | Highlight | Must be fixed |
| `block` | Prevent save | Critical issues |

## Statistics

The guard tracks:
- Total validations
- Issues found by rule
- Blocks prevented
- Auto-fixes applied

---

When these commands are invoked, use the `guard_*` MCP tools.
```

---

### 9. TEST COMMAND

```markdown
<!-- templates/commands/ccg-test.md -->

# CCG Testing

Run tests and perform browser checks.

## Commands

### Run Tests
```
/ccg test [file-pattern]
```
Run tests, optionally filtered by pattern.

**Examples:**
```
/ccg test                    # Run all tests
/ccg test auth               # Run auth-related tests
/ccg test --coverage         # Run with coverage
```

### Run Affected Tests
```
/ccg test affected
```
Run only tests affected by recent changes.

### Browser Testing
```
/ccg test browser <url>
```
Open a browser session for testing.

**Examples:**
```
/ccg test browser http://localhost:3000
/ccg test browser http://localhost:3000/login
```

### Take Screenshot
```
/ccg test screenshot [selector]
```
Capture screenshot of current browser session.

**Examples:**
```
/ccg test screenshot              # Full page
/ccg test screenshot "#main"      # Specific element
/ccg test screenshot --full       # Full page scroll
```

### Get Console Logs
```
/ccg test console
```
Show console output from browser session.

### Get Network Requests
```
/ccg test network [--errors]
```
Show network requests from browser session.

### Close Browser
```
/ccg test browser close
```
Close the current browser session.

### Cleanup
```
/ccg test cleanup
```
Clean up test data and temporary files.

### Test Status
```
/ccg test status
```
Show testing module status and last results.

## Browser Testing Workflow

```
1. /ccg test browser http://localhost:3000
   → Opens browser, captures console & network

2. Interact with the page...

3. /ccg test screenshot
   → Captures current state

4. /ccg test console
   → Check for errors

5. /ccg test browser close
   → Cleanup
```

## Test Results

Results include:
- ✅ Passed tests
- ❌ Failed tests
- ⏭️ Skipped tests
- 📊 Coverage (if enabled)

## Tips

1. **Run affected tests** after changes to save time
2. **Use browser testing** for UI components
3. **Check console logs** for runtime errors
4. **Cleanup regularly** to avoid stale test data

---

When these commands are invoked, use the `testing_*` MCP tools.
```

---

### 10. PROCESS COMMAND

```markdown
<!-- templates/commands/ccg-process.md -->

# CCG Process Management

Manage development server ports and processes.

## Commands

### List Processes
```
/ccg process list
```
Show all tracked processes and port usage.

### Check Port
```
/ccg process port <port>
```
Check if a port is available and what's using it.

**Examples:**
```
/ccg process port 3000
/ccg process port 8080
```

### Kill Process
```
/ccg process kill <port|pid>
```
Kill a process by port or PID.

**Examples:**
```
/ccg process kill 3000      # Kill process on port 3000
/ccg process kill --pid 1234  # Kill by PID
```

### Start Server
```
/ccg process start <command> [--port port] [--name name]
```
Start a tracked process.

**Examples:**
```
/ccg process start "npm run dev" --port 3000 --name "dev-server"
/ccg process start "npm run api" --port 8080 --name "api-server"
```

### Cleanup
```
/ccg process cleanup
```
Kill all CCG-spawned processes and release ports.

### Status
```
/ccg process status
```
Show process management status.

## Configured Ports

Default port assignments (from config):

| Name | Port | Purpose |
|------|------|---------|
| dev | 3000 | Development server |
| api | 8080 | API server |
| test | 9000 | Test server |

## Port Conflict Resolution

When a port is in use:

1. **Check what's using it:**
   ```
   /ccg process port 3000
   ```

2. **Kill if needed:**
   ```
   /ccg process kill 3000
   ```

3. **Or find available port:**
   CCG will suggest the next available port.

## Automatic Behavior

With `autoKillOnConflict: true`:
- CCG automatically kills conflicting processes
- Warning is shown before killing
- Only kills processes on configured ports

## Best Practices

1. **Use consistent ports** - Configure in `.ccg/config.json`
2. **Name your processes** - Easier to track
3. **Cleanup on exit** - CCG does this automatically
4. **Check before starting** - Avoid conflicts

## Troubleshooting

### Port still in use after kill
```bash
# Manual check
lsof -i :3000

# Force kill
kill -9 <pid>
```

### Zombie processes
```
/ccg process cleanup
```

---

When these commands are invoked, use the `process_*` MCP tools.
```

---

### 11. CLAUDE.md PROJECT INSTRUCTIONS

```markdown
<!-- templates/CLAUDE.md -->

# Project Instructions for Claude

This project uses **Claude Code Guardian (CCG)** for enhanced development assistance.

## CCG Features

- 🧠 **Memory** - I remember context between sessions
- 🛡️ **Guard** - Code validation and protection
- ⚡ **Tasks** - Progress tracking and checkpoints
- 🧪 **Testing** - Automated test running and browser checks
- 🖥️ **Process** - Port and process management
- 📁 **Documents** - Document registry and management

## How to Work With CCG

### Starting a Session
When you start working, CCG automatically:
1. Loads previous memory and context
2. Resumes any in-progress tasks
3. Checks for running processes

### Working on Tasks
1. Start a task: `/ccg task start "task name"`
2. I'll track progress, files modified, and decisions
3. Complete with: `/ccg task done`

### Memory
- I'll remember important decisions automatically
- You can ask me to remember: "Remember that we're using PostgreSQL"
- I'll recall relevant context when needed

### Guard Protection
I'll automatically check code for:
- Tests without assertions
- Disabled features
- Empty catch blocks
- Emoji in code
- Swallowed exceptions

If I detect issues, I'll warn or block depending on severity.

### Testing
- I can run tests after changes
- For UI work, I can open a browser and check for errors
- Use `/ccg test browser <url>` for visual testing

### Checkpoints
- Checkpoints are created automatically at token thresholds
- Manual checkpoint: `/ccg checkpoint`
- Restore if needed: `/ccg checkpoint restore <id>`

## Slash Commands

| Command | Description |
|---------|-------------|
| `/ccg` | Show dashboard |
| `/ccg status` | Detailed status |
| `/ccg task` | Task management |
| `/ccg memory` | Memory management |
| `/ccg test` | Testing |
| `/ccg process` | Process management |
| `/ccg checkpoint` | Checkpoint management |
| `/ccg docs` | Document management |

## Project Conventions

<!-- Customize these for your project -->

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Tests: `*.test.ts` or `*.spec.ts`

### Code Style
- Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### No Emoji in Code
Emoji can cause encoding issues. Use text descriptions instead.

## Important Project Context

<!-- Add project-specific context here -->

### Architecture
- [Describe your architecture]

### Key Decisions
- [List important decisions]

### Common Tasks
- [List common development tasks]

## Getting Help

- `/ccg help` - General help
- `/ccg help <module>` - Module-specific help
- Ask me directly about any CCG feature

---

*This file helps Claude understand how to work with your project and CCG.*
```

---

### 12. EXAMPLE CONFIGURATIONS

#### Minimal Config

```json
// templates/examples/config-minimal.json

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
      "maxItems": 50,
      "autoSave": true,
      "persistPath": ".ccg/memory.db",
      "compressionEnabled": false
    },
    "guard": {
      "enabled": true,
      "strictMode": false,
      "rules": {
        "blockFakeTests": true,
        "blockDisabledFeatures": false,
        "blockEmptyCatch": true,
        "blockEmojiInCode": false,
        "blockSwallowedExceptions": false
      }
    },
    "process": {
      "enabled": true,
      "ports": {
        "dev": 3000
      },
      "autoKillOnConflict": false,
      "trackSpawnedProcesses": true
    },
    "resource": {
      "enabled": true,
      "checkpoints": {
        "auto": false,
        "thresholds": [85, 95],
        "maxCheckpoints": 5,
        "compressOld": false
      },
      "warningThreshold": 80,
      "pauseThreshold": 95
    },
    "testing": {
      "enabled": false,
      "autoRun": false,
      "testCommand": "npm test",
      "browser": {
        "enabled": false,
        "headless": true,
        "captureConsole": false,
        "captureNetwork": false,
        "screenshotOnError": false
      },
      "cleanup": {
        "autoCleanTestData": false,
        "testDataPrefix": "test_",
        "testDataLocations": []
      }
    },
    "documents": {
      "enabled": false,
      "locations": {},
      "updateInsteadOfCreate": false,
      "namingConvention": "kebab-case"
    },
    "workflow": {
      "enabled": true,
      "autoTrackTasks": false,
      "requireTaskForLargeChanges": false,
      "largeChangeThreshold": 200
    }
  },
  "notifications": {
    "showInline": true,
    "showStatusBar": true,
    "verbosity": "minimal",
    "sound": {
      "enabled": false,
      "criticalOnly": true
    }
  },
  "conventions": {
    "fileNaming": "kebab-case",
    "variableNaming": "camelCase",
    "componentNaming": "PascalCase",
    "noEmoji": false,
    "noUnicode": false
  }
}
```

#### Strict Config

```json
// templates/examples/config-strict.json

{
  "version": "1.0.0",
  "project": {
    "name": "enterprise-project",
    "type": "typescript-node",
    "root": "."
  },
  "modules": {
    "memory": {
      "enabled": true,
      "maxItems": 200,
      "autoSave": true,
      "persistPath": ".ccg/memory.db",
      "compressionEnabled": true
    },
    "guard": {
      "enabled": true,
      "strictMode": true,
      "rules": {
        "blockFakeTests": true,
        "blockDisabledFeatures": true,
        "blockEmptyCatch": true,
        "blockEmojiInCode": true,
        "blockSwallowedExceptions": true,
        "customRules": [
          {
            "name": "no-console-log",
            "pattern": "console\\.log\\(",
            "message": "Use logger instead of console.log",
            "severity": "warning"
          },
          {
            "name": "no-any-type",
            "pattern": ":\\s*any\\b",
            "message": "Avoid using 'any' type",
            "severity": "warning"
          },
          {
            "name": "require-error-handling",
            "pattern": "\\.catch\\(\\s*\\(\\s*\\)\\s*=>",
            "message": "Error handler must use error parameter",
            "severity": "error"
          }
        ]
      }
    },
    "process": {
      "enabled": true,
      "ports": {
        "dev": 3000,
        "api": 8080,
        "test": 9000,
        "storybook": 6006
      },
      "autoKillOnConflict": true,
      "trackSpawnedProcesses": true
    },
    "resource": {
      "enabled": true,
      "checkpoints": {
        "auto": true,
        "thresholds": [40, 60, 75, 85, 95],
        "maxCheckpoints": 20,
        "compressOld": true
      },
      "warningThreshold": 60,
      "pauseThreshold": 90
    },
    "testing": {
      "enabled": true,
      "autoRun": true,
      "testCommand": "npm run test:affected",
      "browser": {
        "enabled": true,
        "headless": true,
        "captureConsole": true,
        "captureNetwork": true,
        "screenshotOnError": true
      },
      "cleanup": {
        "autoCleanTestData": true,
        "testDataPrefix": "test_",
        "testDataLocations": ["tmp", "test-data", ".test", "coverage"]
      }
    },
    "documents": {
      "enabled": true,
      "locations": {
        "readme": "README.md",
        "docs": "docs",
        "api": "docs/api",
        "specs": "docs/specs",
        "architecture": "docs/architecture",
        "changelog": "CHANGELOG.md",
        "contributing": "CONTRIBUTING.md"
      },
      "updateInsteadOfCreate": true,
      "namingConvention": "kebab-case"
    },
    "workflow": {
      "enabled": true,
      "autoTrackTasks": true,
      "requireTaskForLargeChanges": true,
      "largeChangeThreshold": 50
    }
  },
  "notifications": {
    "showInline": true,
    "showStatusBar": true,
    "verbosity": "verbose",
    "sound": {
      "enabled": true,
      "criticalOnly": false
    }
  },
  "conventions": {
    "fileNaming": "kebab-case",
    "variableNaming": "camelCase",
    "componentNaming": "PascalCase",
    "noEmoji": true,
    "noUnicode": true
  }
}
```

#### Frontend Project Config

```json
// templates/examples/config-frontend.json

{
  "version": "1.0.0",
  "project": {
    "name": "frontend-app",
    "type": "typescript-react",
    "root": "."
  },
  "modules": {
    "memory": {
      "enabled": true,
      "maxItems": 100,
      "autoSave": true,
      "persistPath": ".ccg/memory.db",
      "compressionEnabled": true
    },
    "guard": {
      "enabled": true,
      "strictMode": true,
      "rules": {
        "blockFakeTests": true,
        "blockDisabledFeatures": true,
        "blockEmptyCatch": true,
        "blockEmojiInCode": true,
        "blockSwallowedExceptions": true,
        "customRules": [
          {
            "name": "no-inline-styles",
            "pattern": "style=\\{\\{",
            "message": "Use CSS classes or styled-components instead of inline styles",
            "severity": "warning"
          },
          {
            "name": "require-key-prop",
            "pattern": "\\.map\\([^)]+\\)(?!.*key=)",
            "message": "Array items should have unique key props",
            "severity": "warning"
          }
        ]
      }
    },
    "process": {
      "enabled": true,
      "ports": {
        "dev": 3000,
        "storybook": 6006,
        "api-mock": 3001
      },
      "autoKillOnConflict": true,
      "trackSpawnedProcesses": true
    },
    "resource": {
      "enabled": true,
      "checkpoints": {
        "auto": true,
        "thresholds": [50, 70, 85, 95],
        "maxCheckpoints": 10,
        "compressOld": true
      },
      "warningThreshold": 70,
      "pauseThreshold": 95
    },
    "testing": {
      "enabled": true,
      "autoRun": false,
      "testCommand": "npm test -- --watchAll=false",
      "browser": {
        "enabled": true,
        "headless": false,
        "captureConsole": true,
        "captureNetwork": true,
        "screenshotOnError": true
      },
      "cleanup": {
        "autoCleanTestData": true,
        "testDataPrefix": "test_",
        "testDataLocations": ["tmp", ".test", "coverage"]
      }
    },
    "documents": {
      "enabled": true,
      "locations": {
        "readme": "README.md",
        "docs": "docs",
        "components": "docs/components",
        "storybook": "src/stories"
      },
      "updateInsteadOfCreate": true,
      "namingConvention": "PascalCase"
    },
    "workflow": {
      "enabled": true,
      "autoTrackTasks": true,
      "requireTaskForLargeChanges": false,
      "largeChangeThreshold": 100
    }
  },
  "notifications": {
    "showInline": true,
    "showStatusBar": true,
    "verbosity": "normal",
    "sound": {
      "enabled": false,
      "criticalOnly": true
    }
  },
  "conventions": {
    "fileNaming": "PascalCase",
    "variableNaming": "camelCase",
    "componentNaming": "PascalCase",
    "noEmoji": true,
    "noUnicode": true
  }
}
```

---

### 13. CONFIG JSON SCHEMA

```json
// schemas/config.schema.json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://raw.githubusercontent.com/anthropic-community/claude-code-guardian/main/schemas/config.schema.json",
  "title": "Claude Code Guardian Configuration",
  "description": "Configuration schema for Claude Code Guardian",
  "type": "object",
  "required": ["version", "modules"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Configuration version",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "project": {
      "type": "object",
      "description": "Project configuration",
      "properties": {
        "name": {
          "type": "string",
          "description": "Project name"
        },
        "type": {
          "type": "string",
          "enum": ["typescript-react", "typescript-node", "javascript", "python", "other"],
          "description": "Project type"
        },
        "root": {
          "type": "string",
          "description": "Project root directory",
          "default": "."
        }
      }
    },
    "modules": {
      "type": "object",
      "description": "Module configurations",
      "properties": {
        "memory": {
          "$ref": "#/definitions/memoryModule"
        },
        "guard": {
          "$ref": "#/definitions/guardModule"
        },
        "process": {
          "$ref": "#/definitions/processModule"
        },
        "resource": {
          "$ref": "#/definitions/resourceModule"
        },
        "testing": {
          "$ref": "#/definitions/testingModule"
        },
        "documents": {
          "$ref": "#/definitions/documentsModule"
        },
        "workflow": {
          "$ref": "#/definitions/workflowModule"
        }
      }
    },
    "notifications": {
      "$ref": "#/definitions/notifications"
    },
    "conventions": {
      "$ref": "#/definitions/conventions"
    }
  },
  "definitions": {
    "memoryModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "maxItems": { "type": "integer", "minimum": 10, "maximum": 1000 },
        "autoSave": { "type": "boolean" },
        "persistPath": { "type": "string" },
        "compressionEnabled": { "type": "boolean" }
      }
    },
    "guardModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "strictMode": { "type": "boolean" },
        "rules": {
          "type": "object",
          "properties": {
            "blockFakeTests": { "type": "boolean" },
            "blockDisabledFeatures": { "type": "boolean" },
            "blockEmptyCatch": { "type": "boolean" },
            "blockEmojiInCode": { "type": "boolean" },
            "blockSwallowedExceptions": { "type": "boolean" },
            "customRules": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "pattern", "message", "severity"],
                "properties": {
                  "name": { "type": "string" },
                  "pattern": { "type": "string" },
                  "message": { "type": "string" },
                  "severity": { "type": "string", "enum": ["warning", "error", "block"] }
                }
              }
            }
          }
        }
      }
    },
    "processModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "ports": {
          "type": "object",
          "additionalProperties": { "type": "integer", "minimum": 1, "maximum": 65535 }
        },
        "autoKillOnConflict": { "type": "boolean" },
        "trackSpawnedProcesses": { "type": "boolean" }
      }
    },
    "resourceModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "checkpoints": {
          "type": "object",
          "properties": {
            "auto": { "type": "boolean" },
            "thresholds": {
              "type": "array",
              "items": { "type": "integer", "minimum": 1, "maximum": 100 }
            },
            "maxCheckpoints": { "type": "integer", "minimum": 1 },
            "compressOld": { "type": "boolean" }
          }
        },
        "warningThreshold": { "type": "integer", "minimum": 1, "maximum": 100 },
        "pauseThreshold": { "type": "integer", "minimum": 1, "maximum": 100 }
      }
    },
    "testingModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "autoRun": { "type": "boolean" },
        "testCommand": { "type": "string" },
        "browser": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "headless": { "type": "boolean" },
            "captureConsole": { "type": "boolean" },
            "captureNetwork": { "type": "boolean" },
            "screenshotOnError": { "type": "boolean" }
          }
        },
        "cleanup": {
          "type": "object",
          "properties": {
            "autoCleanTestData": { "type": "boolean" },
            "testDataPrefix": { "type": "string" },
            "testDataLocations": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },
    "documentsModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "locations": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        },
        "updateInsteadOfCreate": { "type": "boolean" },
        "namingConvention": { "type": "string" }
      }
    },
    "workflowModule": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled": { "type": "boolean" },
        "autoTrackTasks": { "type": "boolean" },
        "requireTaskForLargeChanges": { "type": "boolean" },
        "largeChangeThreshold": { "type": "integer", "minimum": 1 }
      }
    },
    "notifications": {
      "type": "object",
      "properties": {
        "showInline": { "type": "boolean" },
        "showStatusBar": { "type": "boolean" },
        "verbosity": { "type": "string", "enum": ["minimal", "normal", "verbose"] },
        "sound": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "criticalOnly": { "type": "boolean" }
          }
        }
      }
    },
    "conventions": {
      "type": "object",
      "properties": {
        "fileNaming": { "$ref": "#/definitions/namingConvention" },
        "variableNaming": { "$ref": "#/definitions/namingConvention" },
        "componentNaming": { "$ref": "#/definitions/namingConvention" },
        "noEmoji": { "type": "boolean" },
        "noUnicode": { "type": "boolean" }
      }
    },
    "namingConvention": {
      "type": "string",
      "enum": ["camelCase", "PascalCase", "snake_case", "kebab-case", "SCREAMING_SNAKE_CASE"]
    }
  }
}
```

---

### 14. TEMPLATE COPY SCRIPT

```typescript
// src/bin/init-templates.ts

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';

export interface InitOptions {
  projectName?: string;
  projectType?: string;
  force?: boolean;
  minimal?: boolean;
  strict?: boolean;
}

export function initializeProject(targetDir: string, options: InitOptions = {}): void {
  const templatesDir = join(__dirname, '..', '..', 'templates');
  
  console.log(chalk.blue('\n🛡️ Initializing Claude Code Guardian\n'));
  
  // Determine config template
  let configTemplate = 'config.template.json';
  if (options.minimal) {
    configTemplate = 'examples/config-minimal.json';
  } else if (options.strict) {
    configTemplate = 'examples/config-strict.json';
  }
  
  // Create directories
  const dirs = [
    '.ccg',
    '.ccg/checkpoints',
    '.ccg/tasks',
    '.ccg/registry',
    '.ccg/logs',
    '.ccg/screenshots',
    '.claude',
    '.claude/commands',
  ];
  
  for (const dir of dirs) {
    const fullPath = join(targetDir, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(chalk.gray(`  Created ${dir}/`));
    }
  }
  
  // Copy and customize config
  const configContent = readFileSync(join(templatesDir, configTemplate), 'utf-8');
  let config = JSON.parse(configContent);
  
  if (options.projectName) {
    config.project.name = options.projectName;
  }
  if (options.projectType) {
    config.project.type = options.projectType;
  }
  
  writeFile(join(targetDir, '.ccg', 'config.json'), JSON.stringify(config, null, 2), options.force);
  console.log(chalk.green('✓ Created .ccg/config.json'));
  
  // Copy hooks
  copyTemplate(templatesDir, targetDir, 'hooks.template.json', '.claude/hooks.json', options.force);
  console.log(chalk.green('✓ Created .claude/hooks.json'));
  
  // Copy slash commands
  const commands = [
    'ccg.md',
    'ccg-task.md',
    'ccg-memory.md',
    'ccg-guard.md',
    'ccg-test.md',
    'ccg-process.md',
  ];
  
  for (const cmd of commands) {
    copyTemplate(templatesDir, targetDir, `commands/${cmd}`, `.claude/commands/${cmd}`, options.force);
  }
  console.log(chalk.green('✓ Created slash commands'));
  
  // Copy CLAUDE.md
  copyTemplate(templatesDir, targetDir, 'CLAUDE.md', 'CLAUDE.md', options.force);
  console.log(chalk.green('✓ Created CLAUDE.md'));
  
  // Create or update .mcp.json
  const mcpPath = join(targetDir, '.mcp.json');
  if (existsSync(mcpPath) && !options.force) {
    console.log(chalk.yellow('ℹ  .mcp.json exists - add CCG manually if needed'));
  } else {
    const mcpContent = readFileSync(join(templatesDir, 'mcp.template.json'), 'utf-8');
    writeFile(mcpPath, mcpContent, options.force);
    console.log(chalk.green('✓ Created .mcp.json'));
  }
  
  // Add to .gitignore
  updateGitignore(targetDir);
  
  // Success message
  console.log(chalk.blue('\n🎉 CCG initialized successfully!\n'));
  console.log('Next steps:');
  console.log(`  1. Review configuration in ${chalk.cyan('.ccg/config.json')}`);
  console.log(`  2. Customize ${chalk.cyan('CLAUDE.md')} with project details`);
  console.log(`  3. Run ${chalk.cyan('claude')} to start with CCG`);
  console.log(`  4. Type ${chalk.cyan('/ccg')} to see the dashboard\n`);
}

function copyTemplate(
  templatesDir: string,
  targetDir: string,
  templatePath: string,
  targetPath: string,
  force?: boolean
): void {
  const source = join(templatesDir, templatePath);
  const target = join(targetDir, targetPath);
  
  if (existsSync(target) && !force) {
    return;
  }
  
  const dir = dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  copyFileSync(source, target);
}

function writeFile(path: string, content: string, force?: boolean): void {
  if (existsSync(path) && !force) {
    return;
  }
  
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, content, 'utf-8');
}

function updateGitignore(targetDir: string): void {
  const gitignorePath = join(targetDir, '.gitignore');
  
  const ccgIgnores = `
# Claude Code Guardian
.ccg/memory.db
.ccg/state.json
.ccg/checkpoints/
.ccg/logs/
.ccg/screenshots/
`;
  
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.ccg/memory.db')) {
      writeFileSync(gitignorePath, content + ccgIgnores, 'utf-8');
      console.log(chalk.green('✓ Updated .gitignore'));
    }
  } else {
    writeFileSync(gitignorePath, ccgIgnores.trim() + '\n', 'utf-8');
    console.log(chalk.green('✓ Created .gitignore'));
  }
}
```

---

### 15. SUMMARY

Đã tạo đầy đủ templates:

| Template | Purpose |
|----------|---------|
| `config.template.json` | Main configuration với tất cả options |
| `hooks.template.json` | Claude Code hooks integration |
| `mcp.template.json` | MCP server configuration |
| `ccg.md` | Main dashboard command |
| `ccg-task.md` | Task management commands |
| `ccg-memory.md` | Memory commands |
| `ccg-guard.md` | Guard commands |
| `ccg-test.md` | Testing commands |
| `ccg-process.md` | Process management commands |
| `CLAUDE.md` | Project instructions for Claude |
| `config-minimal.json` | Lightweight config |
| `config-strict.json` | Enterprise-grade config |
| `config-frontend.json` | Frontend-specific config |
| `config.schema.json` | JSON Schema for validation |

**Init command flow:**
```
ccg init
    │
    ├── Create .ccg/ directories
    ├── Copy config template
    ├── Copy hooks.json
    ├── Copy slash commands
    ├── Copy CLAUDE.md
    ├── Create/update .mcp.json
    └── Update .gitignore
```

**Bạn muốn tiếp tục với:**

1. **Testing Strategy** - Unit tests, integration tests
2. **Build & Publish** - CI/CD, npm publishing guide
3. **Module Initializer** - Tích hợp tất cả modules vào server
4. **Documentation** - README, API docs, guides