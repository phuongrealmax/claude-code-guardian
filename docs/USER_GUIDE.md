# Code Guardian Studio - User Guide

Complete guide to using Code Guardian Studio for code analysis and refactoring.

## Table of Contents

1. [Getting Started](#getting-started)
2. [CLI Commands](#cli-commands)
3. [Understanding Reports](#understanding-reports)
4. [Best Practices](#best-practices)
5. [Under the Hood](#under-the-hood)
6. [Appendix: MCP Tools for AI Agents](#appendix-mcp-tools-for-ai-agents)

---

## Getting Started

### New Users: 3-Minute Quickstart

If this is your first time using CCG, start here:

```bash
npm install -g codeguardian-studio
ccg quickstart
```

See the [Quickstart Guide](QUICKSTART.md) for detailed walkthrough.

### Experienced Users: Manual Setup

```bash
# 1. Install
npm install -g codeguardian-studio

# 2. Initialize
ccg init

# 3. Configure (optional)
# Edit .ccg/config.json

# 4. Run analysis
ccg code-optimize --report
```

---

## CLI Commands

All CCG functionality is available through simple CLI commands. No JSON or tool schemas required.

### `ccg quickstart`

**Purpose:** One-command setup and analysis for new users.

**What it does:**
- Auto-initializes CCG
- Scans codebase
- Analyzes metrics
- Generates report

**Usage:**
```bash
ccg quickstart
```

**When to use:**
- First time using CCG
- Quick health check
- Onboarding new team members

---

### `ccg init`

**Purpose:** Initialize CCG in your project.

**Usage:**
```bash
ccg init                    # Standard profile
ccg init --profile minimal  # Minimal config
ccg init --profile strict   # Strict rules
ccg init --force            # Overwrite existing
```

**What it creates:**
- `.ccg/` directory
- `config.json` configuration
- `.claude/hooks.json` for Claude Code integration
- `.mcp.json` MCP server config

---

### `ccg code-optimize`

**Purpose:** Analyze code quality and generate reports.

**Basic usage:**
```bash
ccg code-optimize           # Console output
ccg code-optimize --report  # Generate markdown report
ccg code-optimize --json    # Output as JSON
```

**Common options:**
```bash
# Generate human-readable report
ccg code-optimize --report

# Get JSON for scripts/CI
ccg code-optimize --json > analysis.json

# See advanced options
ccg code-optimize --help-advanced
```

**Advanced usage:**
```bash
# Focus on complexity instead of file size
ccg code-optimize --strategy complexity --report

# Scan more files (default: 1000)
ccg code-optimize --max-files 5000 --report

# Limit hotspots returned
ccg code-optimize --max-hotspots 10 --report

# Custom report location
ccg code-optimize --report --output custom-report.md

# CI mode - fail if score exceeds threshold
ccg code-optimize --ci --threshold 70

# CI with custom threshold
ccg code-optimize --ci --threshold 50
```

**Exit codes (CI mode):**
- `0` - Success, no hotspots above threshold
- `1` - Failure, hotspots found above threshold

---

### `ccg status`

**Purpose:** Check CCG configuration and data.

**Usage:**
```bash
ccg status       # Human-readable
ccg status --json # JSON output
```

**What it shows:**
- Initialization status
- Config file location
- Memory database status
- Checkpoints count
- Active tasks

---

### `ccg doctor`

**Purpose:** Diagnose configuration issues.

**Usage:**
```bash
ccg doctor
```

**What it checks:**
- Required directories exist
- Config files are valid JSON
- MCP server registration
- Hooks configuration

**Output:**
- Errors (blocking issues)
- Warnings (non-critical)
- Info (suggestions)
- Fix commands for each issue

---

## Understanding Reports

### Report Structure

Generated reports (`docs/reports/optimization-*.md`) include:

#### 1. Overview
```
Repository: your-project
Scanned: 1,234 files (~45,000 lines)
Strategy: mixed (complexity + size)
```

#### 2. Metrics Summary
```
Files analyzed: 234
Avg complexity: 12.5
TODOs: 45
FIXMEs: 8
```

#### 3. Hotspots Table

| Rank | Score | File | Reason | Goal |
|------|-------|------|--------|------|
| 1 | 85 | src/payment.ts | Very high complexity: 85, Deep nesting: level 9 | simplify |
| 2 | 72 | src/api.ts | High complexity: 72, Large file: 650 lines | refactor |
| 3 | 65 | src/utils.ts | High complexity: 65, Many branches: 45 | split-module |

#### 4. Recommendations
- Step-by-step refactor plan
- Estimated effort
- Risk assessment

### Interpreting Scores

**Complexity Score (0-100):**
- `0-30`: Healthy code
- `31-50`: Moderate complexity, monitor
- `51-70`: High complexity, plan refactor
- `71-100`: Critical, refactor ASAP

**File size:**
- < 200 lines: Good
- 200-500 lines: Acceptable
- 500-1000 lines: Consider splitting
- \> 1000 lines: Definitely split

**Nesting depth:**
- 1-3 levels: Good
- 4-6 levels: Moderate
- 7-9 levels: High, needs simplification
- 10+ levels: Critical, refactor immediately

### Goals Explained

- **simplify**: Reduce complexity (break down functions, reduce nesting)
- **refactor**: Restructure code architecture
- **add-tests**: No tests found, add coverage
- **split-module**: File too large, extract modules
- **document**: Complex logic needs comments

---

## Best Practices

### Regular Analysis

```bash
# Before starting major work
ccg code-optimize --report

# After completing features
ccg code-optimize --report

# Compare reports to track improvement
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/code-quality.yml
- name: Code Quality Check
  run: ccg code-optimize --ci --threshold 70
```

### Team Workflow

1. **Weekly health checks:**
   - Run `ccg code-optimize --report`
   - Review top 5 hotspots in team meeting
   - Assign refactor tasks

2. **Before major releases:**
   - Run full analysis
   - Address all critical hotspots (score > 70)
   - Document decisions in Memory

3. **Code reviews:**
   - Check if PR introduces new hotspots
   - Use `ccg code-optimize --strategy complexity` on changed files

### Configuration Tips

Edit `.ccg/config.json`:

```json
{
  "version": "1.0.0",
  "rules": {
    "enabled": true,
    "no-fake-tests": true,
    "no-disabled-features": true
  },
  "optimizer": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.test.ts"
    ],
    "maxFileSize": 524288
  }
}
```

---

## Under the Hood

This section explains how CCG works internally. You don't need to understand this to use CCG, but it helps if you're curious.

### What is CCG?

Code Guardian Studio is an **MCP (Model Context Protocol) server** that runs locally on your machine. It provides tools that Claude Code (or any MCP-compatible AI) can use to analyze code.

**Key architecture:**
- **Runs locally**: No cloud APIs, all analysis happens on your machine
- **MCP server**: Exposes 50+ tools to AI assistants
- **CLI wrapper**: Human-friendly commands that call MCP tools internally

When you run `ccg quickstart`, here's what happens:

1. **CLI parses your command** → determines you want quickstart
2. **CLI calls MCP tools internally** → `code_scan_repository`, `code_metrics`, `code_hotspots`
3. **Results are formatted** → from JSON to human-readable markdown
4. **Report is saved** → in `docs/reports/`

### Latent Chain Mode

Latent Chain is CCG's approach to **multi-phase reasoning** for complex tasks.

**The problem:**
- Traditional AI tools handle one-shot tasks (e.g., "analyze this file")
- Complex tasks (e.g., "refactor entire auth system") need multiple phases

**The solution - 4 phases:**

1. **Analysis**: Understand the problem
   - Map code structure
   - Identify dependencies
   - Note constraints

2. **Plan**: Design the solution
   - Break down into steps
   - Identify risks
   - Estimate effort

3. **Implementation**: Execute the plan
   - Make code changes
   - Run tests
   - Verify correctness

4. **Review**: Validate results
   - Check all requirements met
   - Ensure no regressions
   - Document changes

**How it works:**
- **Context is persisted** across phases (not re-explained each time)
- **Decisions are tracked** in a "latent context" (like KV-cache)
- **Only deltas are communicated** (changes, not full state)

**Example:**
```
User: "Refactor the authentication system"

Phase 1 (Analysis):
- AI maps: login.ts, auth-middleware.ts, session.ts
- Identifies: JWT tokens, passport.js
- Notes constraint: "No breaking changes to API"

Phase 2 (Plan):
- AI creates: 5-step refactor plan
- Risk: Session migration
- Estimate: 3-4 hours

Phase 3 (Impl):
- AI edits files, runs tests
- Uses Memory to recall "No breaking changes"

Phase 4 (Review):
- AI verifies: All tests pass, API unchanged
- Documents: New patterns in Memory
```

**Benefits:**
- Tasks stay focused per phase
- Context doesn't explode (only deltas shared)
- AI can "go back" to earlier phases if needed

### Memory System

CCG has a **persistent memory** that survives across sessions.

**What's stored:**
- **Decisions**: "Use JWT for auth, not sessions"
- **Facts**: "Database is PostgreSQL 15"
- **Code patterns**: Example of how to write tests
- **Errors**: "Don't use deprecated API X"
- **Conventions**: "Always use async/await, never callbacks"

**Why it matters:**
- AI doesn't re-learn your project every session
- Consistency across refactors
- Faster analysis (recalls past decisions)

**Storage:**
- Location: `.ccg/memory.db` (SQLite database)
- Format: Searchable by tags, type, importance
- Privacy: 100% local, never leaves your machine

**Example workflow:**
```
Session 1:
You: "We use React 18 with hooks, no class components"
AI: Stores in Memory with importance=9, tags=["react", "convention"]

Session 2 (next week):
AI: Recalls "React hooks" convention automatically
AI: Suggests functional component, not class
```

### Guard System

Prevents dangerous code patterns before they're committed.

**What it blocks:**
- **Fake tests**: Tests without assertions
  ```ts
  it('should work', async () => {
    await doSomething();  // ❌ No expect/assert
  });
  ```

- **Disabled features**: Skipped tests, commented code
  ```ts
  it.skip('important test', () => {  // ❌ Test disabled
  ```

- **Empty catches**: Silent error swallowing
  ```ts
  try {
    critical();
  } catch (e) {  // ❌ Empty catch
  }
  ```

**When it runs:**
- Before git commits (via hook)
- During code generation (AI uses `guard_validate` tool)
- Manual: `ccg guard-check file.ts`

### Performance

**Real-world benchmarks** (tested December 2025):

| Repo Size | Files | LOC | Analysis Time | Files Analyzed |
|-----------|-------|-----|---------------|----------------|
| Small | 25 | ~4,400 | < 1 second | 25 |
| Medium | 118 | ~36,000 | < 1 second | 200 |
| Large | 600 | ~105,000 | < 1 second | 200* |

*Large repos are limited by `--max-files 1000` default for performance. Increase with `ccg code-optimize --max-files 5000` if needed.

**What these numbers mean:**
- **Analysis is extremely fast**: All repo sizes complete in under 1 second
- **Scanning is efficient**: Even 100k+ LOC repos scan instantly
- **Hotspot detection is smart**: CCG finds the top 20 issues without analyzing every file

**Best practices by repo size:**

**Small repos (< 10k LOC):**
- Run `ccg quickstart` anytime, no configuration needed
- Analysis completes instantly
- Great for frequent checks during development

**Medium repos (10k-50k LOC):**
- Use default settings: `ccg code-optimize --report`
- Consider CI integration with `--ci --threshold 70`
- Run weekly to track technical debt

**Large repos (50k+ LOC):**
- First run: `ccg code-optimize --max-files 2000 --report` to scan more files
- Subsequent runs: Use default settings (1000 files is usually enough)
- Focus on high-scoring hotspots first (> 70)
- Consider running on specific directories: `cd src/critical && ccg quickstart`

**Performance tips:**
- **Incremental analysis**: CCG caches results in `.ccg/optimizer-cache.json`
- **Parallel scanning**: Multiple files analyzed concurrently
- **Smart sampling**: For huge repos, analyzing 1000 representative files gives accurate results
- **CI optimization**: Use `--json` output for faster parsing in automation

---

## Appendix: MCP Tools for AI Agents

This section is for AI agents (like Claude) or developers building integrations. **Human users don't need to use these tools directly** - the CLI commands above call them internally.

### Code Optimizer Tools

#### `code_scan_repository`
Scan project structure and count LOC.

**Parameters:**
```typescript
{
  rootPath?: string;        // Project root (default: cwd)
  includePatterns?: string[]; // Globs to include
  excludePatterns?: string[]; // Globs to exclude
  maxFiles?: number;         // Limit files scanned
}
```

#### `code_metrics`
Calculate complexity metrics for files.

**Parameters:**
```typescript
{
  files: string[];          // File paths to analyze
  maxFileSizeBytes?: number; // Skip files larger than this
}
```

**Returns:**
```typescript
{
  path: string;
  lines: number;
  maxNestingDepth: number;
  branchScore: number;
  complexityScore: number;
  todoCount: number;
  fixmeCount: number;
}[]
```

#### `code_hotspots`
Identify files needing attention.

**Parameters:**
```typescript
{
  metrics: CodeMetric[];
  strategy: 'size' | 'complexity' | 'mixed';
  maxResults?: number;
  thresholds?: {
    minLines?: number;
    minComplexity?: number;
    minNesting?: number;
  };
}
```

#### `code_refactor_plan`
Generate refactor steps.

**Parameters:**
```typescript
{
  hotspots: Hotspot[];
  goal: 'readability' | 'performance' | 'architecture' | 'testing' | 'mixed';
  constraints?: string[];
  maxStepsPerFile?: number;
}
```

#### `code_generate_report`
Create markdown report.

**Parameters:**
```typescript
{
  sessionId: string;
  scanResult?: ScanResult;
  metricsBefore?: MetricsResult;
  hotspots?: HotspotsResult;
  strategy?: 'size' | 'complexity' | 'mixed';
  outputPath?: string;
  registerInDocuments?: boolean;
  storeInMemory?: boolean;
}
```

#### `code_quick_analysis`
All-in-one: scan + metrics + hotspots.

**Parameters:**
```typescript
{
  maxFiles?: number;
  maxHotspots?: number;
  strategy?: 'size' | 'complexity' | 'mixed';
}
```

### Memory Tools

- `memory_store` - Save information
- `memory_recall` - Search memories
- `memory_forget` - Delete memory by ID
- `memory_summary` - Overview of all memories
- `memory_list` - List memories with filters

### Guard Tools

- `guard_validate` - Check code for issues
- `guard_check_test` - Validate test files
- `guard_rules` - List available rules
- `guard_toggle_rule` - Enable/disable rules
- `guard_status` - Guard module status

### Workflow Tools

- `workflow_task_create` - Create task
- `workflow_task_start` - Begin working on task
- `workflow_task_update` - Update progress
- `workflow_task_complete` - Mark as done
- `workflow_task_list` - List tasks
- `workflow_current` - Get active task

### Latent Chain Tools

- `latent_context_create` - Initialize task context
- `latent_context_get` - Retrieve context
- `latent_context_update` - Update with delta
- `latent_phase_transition` - Move between phases
- `latent_apply_patch` - Apply code changes
- `latent_complete_task` - Finish task

For complete tool schemas and examples, see the [original Vietnamese guide](USER_GUIDE.md.bak) or use Claude Code's MCP tool discovery.

---

## Getting Help

- **Quickstart issues?** See [QUICKSTART.md](QUICKSTART.md)
- **Advanced features?** See [LATENT_CHAIN_GUIDE.md](LATENT_CHAIN_GUIDE.md)
- **GitHub Issues:** https://github.com/phuongrealmax/claude-code-guardian/issues
- **Website:** https://codeguardian.studio

---

**Last updated:** 2025-12-05
