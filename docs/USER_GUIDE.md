# Code Guardian Studio - User Guide

Complete guide to using Code Guardian Studio for code analysis and refactoring.

## Table of Contents

1. [Getting Started](#getting-started)
2. [License Tiers](#license-tiers)
3. [CLI Commands](#cli-commands)
4. [Multi-repo Setup](#multi-repo-setup)
5. [Context Profiles](#context-profiles)
6. [Security Analysis (STRIDE)](#security-analysis-stride)
7. [Onboarding & Migration](#onboarding--migration)
8. [Using CCG inside Claude Code](#using-ccg-inside-claude-code)
9. [Understanding Reports](#understanding-reports)
10. [Best Practices](#best-practices)
11. [Under the Hood](#under-the-hood)
12. [Appendix: MCP Tools for AI Agents](#appendix-mcp-tools-for-ai-agents)

---

## What's New

Recent updates to Code Guardian Studio:

### Session Resume (v1.4)
Resume work after browser refresh or disconnect. See [Session Resume Guide](SESSION_RESUME.md).

### Auto-Checkpoints & Diff (v1.4)
Automatic checkpoints before risky operations with on-demand diff comparison. See [Auto-Checkpoints Guide](AUTO_CHECKPOINTS_AND_DIFF.md).

### Completion Gates (v1.4)
Tasks require evidence (test pass, guard validation) before completion. See [Completion Gates Guide](COMPLETION_GATES.md).

### Testing Observability (v1.4)
Prioritized failure output (console > network > trace > screenshot). See [Testing Observability Guide](TESTING_OBSERVABILITY.md).

### Guard Rulesets (v1.4)
Predefined rule collections: `frontend`, `backend`, `security`, `testing`. See [Guard Rulesets Guide](GUARD_RULESETS.md).

### TaskGraph Workflows (v1.4)
DAG-based task orchestration with gated completion. See [TaskGraph Workflows Guide](TASKGRAPH_WORKFLOWS.md).

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

## License Tiers

Code Guardian Studio operates on an open-core model with three license tiers:

### Dev Tier (Free)

The Dev tier is completely free and works fully offline. No license key or internet connection required.

**Included Features:**
- Code Optimizer (basic analysis)
- Memory module (SQLite persistence)
- Guard module (security rules)
- Workflow/task management
- Basic markdown reports

**Usage:**
```bash
# No setup needed - just install and run
ccg code-optimize --report
```

### Team Tier ($19/month)

The Team tier unlocks advanced analysis and reporting features.

**Additional Features:**
- Advanced reports with Tech Debt Index (TDI)
- Before/After comparisons
- Trend charts and history
- ROI analysis
- **Latent Chain Mode** - Multi-phase reasoning
- **AutoAgent** - Task decomposition & error fixing
- **Thinking Models** - Structured reasoning workflows
- **RAG Module** - Semantic code search
- **Agents Module** - Multi-agent coordination
- **Testing Module** - Advanced test runner & browser testing
- **Documents Module** - Documentation management
- Priority support

**Setup:**
```bash
# Save license key to project
echo "CGS-TEAM-XXXX-YYYY" > .ccg/license.key

# Or set globally
echo "CGS-TEAM-XXXX-YYYY" > ~/.ccg/license.key
```

### Enterprise Tier

Enterprise tier includes everything in Team plus:
- SSO/SAML integration
- SOC2 compliance features
- Audit logging
- Dedicated support
- Custom integrations
- Unlimited seats

Contact sales@codeguardian.studio for Enterprise pricing.

### How License Verification Works

CCG uses a `LicenseGateway` to manage license verification:

1. **Offline-First**: Dev tier features always work without internet
2. **Local Cache**: Team/Enterprise licenses are cached for 24 hours
3. **Graceful Fallback**: If verification fails, falls back to cached license or Dev tier

The gateway is designed so your development workflow is never blocked by license issues:

| Scenario | Behavior |
|----------|----------|
| No license | Dev tier features |
| Valid license + online | Full tier features |
| Valid license + offline | Cached tier (24h grace) |
| Expired cache | Falls back to Dev tier |

**Note**: In the current version, the cloud API is stubbed. License keys are validated locally by format only. Future versions will connect to the official Code Guardian Studio license server.

### Self-Hosting vs Official Cloud

Code Guardian Studio follows an **open-core model**:

#### Dev Tier (Self-Hosted)

The Dev tier is **fully local and self-hostable**:
- All features work offline
- No external dependencies
- No license key required
- Ideal for individual developers and open-source projects

```bash
# Works completely offline
ccg code-optimize --report
```

#### Team/Enterprise (Official Cloud)

Team and Enterprise tiers in the official product are powered by:
- **Cloud backend** at `api.codeguardian.studio`
- **Paddle** for billing (Merchant of Record)
- License verification via `LicenseGateway`

Purchasing at [codeguardian.studio/pricing](https://codeguardian.studio/pricing) provides:
- License key delivered via email
- Access to advanced features
- Priority support

#### Advanced: Custom Backend

For advanced users who want to implement their own license backend:

1. Implement the `LicenseGateway` interface from `@ccg/cloud-client`
2. Create your own verification API endpoint
3. Handle billing separately

```typescript
import { LicenseGateway, setLicenseGateway } from '@ccg/cloud-client';

class MyCustomGateway implements LicenseGateway {
  // Your implementation
}

setLicenseGateway(new MyCustomGateway());
```

**Note**: Custom backends are **not officially supported**. The reference implementation
in `src/modules/license/` is provided for educational purposes only.


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
ccg init --multi-repo       # Create multi-repo config template
```

**What it creates:**
- `.ccg/` directory
- `config.json` configuration
- `.claude/hooks.json` for Claude Code integration
- `.mcp.json` MCP server config
- `.ccg/config.yml` (if `--multi-repo` flag used)

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

# Analyze specific repo (multi-repo mode)
ccg code-optimize --repo payments --report

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

## Multi-repo Setup

CCG supports managing multiple repositories or modules from a single configuration. This is ideal for:

- **Monorepos** with multiple packages
- **Multi-service architectures** with related services
- **Large organizations** tracking multiple codebases

### Quick Setup

```bash
# Initialize with multi-repo template
ccg init --multi-repo

# Edit the configuration
# nano .ccg/config.yml

# Analyze a specific repository
ccg code-optimize --repo core --report

# View trends for a repo
ccg report --repo payments --trend
```

### Configuration File

Multi-repo configuration is stored in `.ccg/config.yml`:

```yaml
# Code Guardian Studio - Multi-Repository Configuration
version: "1.0"

# Default repository when --repo is not specified
defaultRepo: core

# List of repositories/modules to manage
repos:
  # Main repository (current directory)
  - name: core
    path: "."
    description: "Main application code"

  # Separate service in parent directory
  - name: payments
    path: "../payments"
    description: "Payment processing service"

  # Monorepo sub-package
  - name: frontend
    path: "./apps/frontend"
    description: "Frontend web application"
    excludePatterns:
      - "**/*.test.tsx"
      - "**/__mocks__/**"

  # Shared library
  - name: shared
    path: "./packages/shared"
    description: "Shared utilities and types"
```

### Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Config file version (currently "1.0") |
| `defaultRepo` | No | Default repo when `--repo` is omitted |
| `repos` | Yes | Array of repository configurations |
| `repos[].name` | Yes | Unique identifier (alphanumeric + hyphens) |
| `repos[].path` | Yes | Path to repository (relative or absolute) |
| `repos[].description` | No | Human-readable description |
| `repos[].excludePatterns` | No | Glob patterns to exclude from analysis |
| `repos[].includePatterns` | No | Glob patterns to include (overrides excludes) |

### CLI Commands with Multi-repo

All main commands support the `--repo` flag:

```bash
# Quickstart for a specific repo
ccg quickstart --repo frontend

# Analyze specific repo
ccg code-optimize --repo payments --report

# View history for a repo
ccg report --repo core --summary

# View trends for a repo
ccg report --repo frontend --trend
```

### Example: Monorepo Setup

For a typical monorepo structure:

```
my-company/
├── .ccg/
│   └── config.yml
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
├── packages/
│   ├── shared/
│   ├── ui-components/
│   └── utils/
└── services/
    ├── auth/
    └── payments/
```

Configuration:

```yaml
version: "1.0"
defaultRepo: api

repos:
  # Applications
  - name: web
    path: "./apps/web"
    description: "Web application (Next.js)"

  - name: mobile
    path: "./apps/mobile"
    description: "Mobile app (React Native)"

  - name: api
    path: "./apps/api"
    description: "Backend API (NestJS)"

  # Packages
  - name: shared
    path: "./packages/shared"
    description: "Shared types and utilities"

  - name: ui
    path: "./packages/ui-components"
    description: "Reusable UI components"

  # Services
  - name: auth
    path: "./services/auth"
    description: "Authentication service"

  - name: payments
    path: "./services/payments"
    description: "Payment processing"
    excludePatterns:
      - "**/migrations/**"
      - "**/*.seed.ts"
```

### Example: Multi-Service Setup

For separate repositories managed together:

```
workspace/
├── main-app/           # Main CCG config lives here
│   └── .ccg/
│       └── config.yml
├── auth-service/
├── payment-service/
└── notification-service/
```

Configuration (in `main-app/.ccg/config.yml`):

```yaml
version: "1.0"
defaultRepo: main

repos:
  - name: main
    path: "."
    description: "Main application"

  - name: auth
    path: "../auth-service"
    description: "Authentication microservice"

  - name: payments
    path: "../payment-service"
    description: "Payment processing microservice"

  - name: notifications
    path: "../notification-service"
    description: "Notification service"
```

### Session and Report Tracking

Sessions and Tech Debt Index are tracked **per repository**:

```bash
# Each repo has independent history
ccg report --repo core --summary
ccg report --repo payments --summary

# Compare trends across repos
ccg report --repo core --trend
ccg report --repo payments --trend
```

Reports are saved locally with the repo name in the filename (gitignored by default):
```
docs/reports/optimization-2024-01-15-core-abc123.md
docs/reports/optimization-2024-01-15-payments-def456.md
```

### Team Tier Benefits

With a Team license, multi-repo reports include:

- **Cross-repo comparisons**: Compare Tech Debt Index across all repos
- **Aggregated trends**: See organization-wide improvement
- **Per-repo ROI**: Time savings calculated per repository

### Validation and Error Handling

CCG validates your configuration and provides helpful errors:

```bash
# Missing config file
$ ccg code-optimize --repo payments
Error: --repo flag requires .ccg/config.yml
Run "ccg init --multi-repo" to create one.

# Unknown repo name
$ ccg code-optimize --repo unknown
Error: Repository "unknown" not found in config.yml
Available repos: core, payments, frontend

# Invalid repo path
$ ccg code-optimize --repo payments
Error: Repository path does not exist: ../payments
```

### Best Practices

1. **Use descriptive names**: `payment-api` instead of `svc1`
2. **Set a defaultRepo**: Saves typing for your most-used repo
3. **Use relative paths**: Makes config portable across machines
4. **Document each repo**: Descriptions help team members understand structure
5. **Customize excludePatterns**: Skip test files, migrations, generated code

---

## Context Profiles

CCG supports environment-aware configuration profiles for different IDEs and contexts.

### Built-in Profiles

| Profile | Auto-Detection | Description |
|---------|---------------|-------------|
| `cli` | `CCG_PROFILE=cli` | Default for command-line usage |
| `vscode` | `VSCODE_PID` env or `.vscode/` folder | Optimized for VSCode extension |
| `cursor` | `Cursor` process or `.cursor/` folder | Optimized for Cursor IDE with AI-first workflow |
| `mcp` | `CCG_MCP_MODE=true` | MCP server mode for Claude Desktop |

### Profile Features

Each profile can customize:
- **Module settings**: Enable/disable modules, adjust thresholds
- **Notifications**: Status bar, inline notifications, verbosity
- **Conventions**: File naming, variable naming rules

### Auto-Detection

CCG automatically detects your environment:
```bash
# Auto-detected when running in VSCode
ccg status
# → Profile: vscode (auto-detected via VSCODE_PID)

# Force a specific profile
CCG_PROFILE=cli ccg code-optimize --report
```

### Custom Profiles

Create custom profiles in `.ccg/profiles.json`:
```json
{
  "activeProfile": "my-team",
  "autoDetect": true,
  "profiles": [
    {
      "id": "my-team",
      "name": "My Team Profile",
      "type": "custom",
      "extends": "vscode",
      "enabled": true,
      "overrides": {
        "modules": {
          "guard": { "strictMode": true },
          "latent": { "autoAttach": true }
        },
        "notifications": { "verbosity": "minimal" }
      }
    }
  ]
}
```

### MCP Tools for Profiles

```typescript
profile_list         // List all available profiles
profile_get          // Get profile by ID
profile_switch       // Switch active profile
profile_create       // Create custom profile
profile_detect       // Auto-detect best profile
profile_status       // Get current profile status
```

---

## Security Analysis (STRIDE)

CCG includes a Security Agent that performs STRIDE threat modeling on your codebase.

### What is STRIDE?

STRIDE is a threat modeling framework developed by Microsoft:

| Threat | Description | Example |
|--------|-------------|---------|
| **S**poofing | Impersonating a user or system | Fake authentication tokens |
| **T**ampering | Modifying data or code | SQL injection, XSS |
| **R**epudiation | Denying actions without proof | Missing audit logs |
| **I**nformation Disclosure | Exposing confidential data | Hardcoded secrets, error leaks |
| **D**enial of Service | Making system unavailable | Resource exhaustion, infinite loops |
| **E**levation of Privilege | Gaining unauthorized access | IDOR, missing authorization |

### Running Security Analysis

```bash
# Full STRIDE analysis
ccg security-scan

# Analyze specific files
ccg security-scan src/api/

# Output as JSON for CI
ccg security-scan --json > security-report.json
```

### Security Rules

The Guard module includes security-focused rules:

| Rule | Description |
|------|-------------|
| `blockSqlInjection` | Detect SQL injection vulnerabilities |
| `blockHardcodedSecrets` | Find hardcoded API keys, passwords |
| `blockSwallowedExceptions` | Empty catch blocks hiding errors |

### MCP Tools for Security

```typescript
security_stride_analyze   // Full STRIDE analysis
security_check_file       // Analyze single file
security_get_threats      // List detected threats
security_agent_select     // Select security agent for task
```

### CI Integration

```yaml
# .github/workflows/security.yml
- name: Security Scan
  run: |
    ccg security-scan --json > security.json
    if grep -q '"severity": "critical"' security.json; then
      echo "Critical security issues found!"
      exit 1
    fi
```

---

## Onboarding & Migration

CCG includes an Onboarding Agent that helps with initial setup and configuration migration.

### Auto-Migration

When you upgrade CCG, your configuration is automatically migrated:

```bash
# CCG detects old config and offers migration
ccg init
# → Found config v0.9.0, current is v1.2.0
# → Migrating configuration...
# → Migration complete!
```

### Migration Path

| From Version | To Version | Changes |
|--------------|------------|---------|
| 0.x | 1.0.0 | Restructure modules, add new defaults |
| 1.0.0 | 1.2.0 | Add autoAgent, latent modules |

### Validation & Auto-Fix

CCG validates your configuration and can auto-fix common issues:

```bash
# Check configuration health
ccg doctor

# Auto-fix configuration issues
ccg doctor --fix
```

**Common fixes:**
- Missing required modules → Adds with defaults
- Invalid thresholds → Corrects to valid ranges
- Deprecated options → Migrates to new format

### MCP Tools for Onboarding

```typescript
onboarding_status     // Check migration/validation status
onboarding_init       // Initialize new project
onboarding_migrate    // Migrate old configuration
onboarding_validate   // Validate current config
onboarding_autofix    // Auto-fix configuration issues
onboarding_welcome    // Show welcome message & next steps
```

### Setup Wizard

For new projects, CCG guides you through setup:

```bash
ccg init --wizard

# Interactive prompts:
# → Project type? (typescript-node, typescript-react, python, other)
# → Enable strict mode? (y/n)
# → Configure Claude Code integration? (y/n)
```

---

## Using CCG inside Claude Code

**This is the recommended way to use CCG.** Running CCG inside Claude Code (or Claude Desktop) gives you the full power of AI-assisted code analysis without copy-pasting code or memorizing commands.

### Why Use Claude Code?

| CLI Approach | Claude Code Approach |
|--------------|---------------------|
| Run `ccg code-optimize --report` | "Analyze this codebase and show me the hotspots" |
| Copy output to chat for analysis | Direct analysis with full context |
| Manually interpret scores | Claude explains what the scores mean |
| Look up docs for options | Just describe what you want |

### Quick Setup

```bash
# 1. Install CCG
npm install -g codeguardian-studio

# 2. Initialize in your project
cd /path/to/project
ccg init

# 3. Open project in Claude Code and start chatting
```

### Example Interactions

**Get a quick health check:**
> "Use Code Guardian Studio to scan this repository and show me the top hotspots."

**Run targeted analysis:**
> "Run the code optimization workflow on the payments service only."

**Understand results:**
> "Why is auth/login.ts flagged as a hotspot? How should I fix it?"

**Track progress:**
> "Compare the current code quality with our last analysis."

### Detailed Setup Guide

For complete setup instructions including:
- Prerequisites (Node.js, npm versions)
- MCP server configuration
- Environment variables
- Troubleshooting tips

See the dedicated [Claude Code Integration Guide](CLAUDE_CODE_SETUP.md).

### When to Use CLI vs Claude Code

| Use CLI when... | Use Claude Code when... |
|-----------------|-------------------------|
| Running in CI/CD pipelines | Interactive analysis |
| Scripting automated checks | Understanding results |
| Quick one-off scans | Planning refactoring |
| Generating reports for documentation | Getting AI assistance |

**Tip:** Use both together - run `ccg code-optimize --json` in CI, then discuss results with Claude Code.

---

## Understanding Reports

### Report Structure

Generated reports are saved locally in `docs/reports/optimization-*.md` (gitignored by default). Reports include:

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

### Free vs Team Reports

CCG offers two report tiers:

#### Free Tier (dev)
Basic reports include:
- Overview (files, lines, root path)
- Current metrics (complexity, TODOs, FIXMEs)
- Hotspots table (top 10 issues)
- Next steps recommendations

This is perfect for individual developers who want to analyze their code.

#### Team Tier (and Enterprise)
Advanced reports add:

**Tech Debt Summary**
Track progress over time with deltas:
```
| Metric              | Previous | Current | Delta   |
|---------------------|----------|---------|---------|
| Hotspots            | 25       | 18      | -7      |
| Total Score         | 1250     | 890     | -360    |
| High-complexity     | 12       | 8       | -4      |
```

**Before vs After Comparison**
Visual comparison between analysis sessions:
- Files analyzed, complexity, hotspots side-by-side
- Highlights improvements automatically
- Perfect for sprint retrospectives

**Tech Debt Index (Team tier)**
A single composite score (0-100) representing overall codebase health:

| Grade | Index | Meaning |
|-------|-------|---------|
| A | 0-20 | Excellent - minimal tech debt |
| B | 21-40 | Good - a few areas need attention |
| C | 41-60 | Fair - debt accumulating |
| D | 61-80 | Poor - prioritize refactoring |
| F | 81-100 | Critical - major issues |

The index is calculated from:
- **Hotspot component (40%)**: Based on hotspot count and total score
- **Complexity component (30%)**: Based on avg complexity and high-complexity files
- **Size component (20%)**: Based on large file ratio
- **Debt density (10%)**: Hotspots per 1000 lines of code

**Trend Tracking**
Team reports show your last 5 sessions with:
- Visual trend chart (ASCII)
- Direction indicator (improving/stable/degrading)
- Index change over time

Use the CLI to view trends:
```bash
# View latest session
ccg report

# View session summary
ccg report --summary

# View trend chart
ccg report --trend
```

**ROI Notes**
Understand business value:
- Estimated hours saved from addressed hotspots
- Review time saved from reduced complexity
- Tips for maximizing team productivity

To upgrade to Team:
```bash
# If you have a license key
ccg activate

# Or visit codeguardian.studio/pricing
```

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

### Quick Fixes vs Full Optimization

Not every situation calls for the same approach. Here's when to use each:

| Scenario | Approach | Tool/Command |
|----------|----------|--------------|
| Found a bug in one file | Quick fix | Claude Code: "Fix this specific issue" |
| Pre-commit check | Quick scan | `ccg code-optimize --ci --threshold 70` |
| Sprint planning | Full analysis | `ccg code-optimize --report` |
| Before major refactor | Deep analysis | Claude Code: "Analyze and plan refactoring" |
| Tech debt review | Comprehensive report | `ccg code-optimize --strategy complexity --report` |

**Quick fixes** are best when:
- You know exactly what file needs work
- The fix is isolated (doesn't affect other files)
- You need immediate results

**Full optimization** is best when:
- You're planning sprint work
- You want to track progress over time
- You need to understand the whole codebase
- You're onboarding new team members

### Combining CLI with Claude Code

The most effective workflow uses **both** CLI and Claude Code:

**Step 1: Run CLI analysis**
```bash
ccg code-optimize --report
```

**Step 2: Discuss results with Claude**
> "I just ran ccg code-optimize. The report shows these hotspots: [paste top 3]. Help me prioritize and create a refactoring plan."

**Step 3: Let Claude implement fixes**
> "Start with the auth/login.ts hotspot. Show me the specific issues and fix them."

**Step 4: Verify improvements**
```bash
ccg code-optimize --report
# Compare scores with previous report
```

**Why this works:**
- CLI gives you repeatable, measurable metrics
- Claude Code provides intelligent analysis and implementation
- Reports create accountability and track progress
- The combination catches issues neither would alone

### CI/CD Integration

CCG integrates with CI/CD pipelines to enforce code quality on every pull request.

#### Quick Setup (Basic)

Add to your CI pipeline:

```yaml
# .github/workflows/code-quality.yml
- name: Code Quality Check
  run: ccg code-optimize --ci --threshold 70
```

#### Full GitHub Action (with PR Comments)

For automatic PR comments and detailed analysis, use the full workflow:

```yaml
# .github/workflows/codeguardian-pr.yml
name: Code Guardian Analysis

on:
  pull_request:
    branches: [main, master, develop]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm install -g codeguardian-studio

      - name: Initialize CCG
        run: ccg init --yes || true

      - name: Run Analysis
        id: analysis
        run: |
          ccg code-optimize --json --ci --threshold 70 > .ccg/ci-report.json
          ccg code-optimize --report --output .ccg/ci-report.md

      - name: Post PR Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('.ccg/ci-report.json', 'utf8'));
            const hotspots = report.hotspots?.hotspots || [];

            let body = `## 🔍 Code Guardian Analysis\n\n`;
            body += `> ${hotspots.length} hotspot(s) found\n\n`;

            if (hotspots.length > 0) {
              body += `| File | Score | Issue |\n|------|-------|-------|\n`;
              hotspots.slice(0, 5).forEach(h => {
                body += `| \`${h.path}\` | ${h.score.toFixed(0)} | ${h.reasons[0]} |\n`;
              });
            }

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });

      - name: Quality Gate
        run: |
          CRITICAL=$(cat .ccg/ci-report.json | jq '[.hotspots.hotspots[] | select(.score >= 80)] | length')
          if [ "$CRITICAL" -gt 0 ]; then
            echo "❌ Critical hotspots detected"
            exit 1
          fi
```

#### CI Mode Options

```bash
# Fail if any hotspot exceeds threshold
ccg code-optimize --ci --threshold 70

# Stricter threshold for critical code
ccg code-optimize --ci --threshold 50

# JSON output for parsing in scripts
ccg code-optimize --json --ci --threshold 70 > report.json
```

**Exit codes (CI mode):**
- `0` - All hotspots below threshold
- `1` - One or more hotspots exceed threshold

#### Team Tier: Automatic PR Comments

With a Team license, PR comments automatically include:
- Before/after comparison (if previous analysis exists)
- Tech debt trend indicators
- ROI estimates

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
4. **Report is saved** → locally in `docs/reports/` (gitignored)

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

### AST Analysis

CCG uses **TypeScript parser** for accurate code analysis:

**How it works:**
- Parses code into Abstract Syntax Tree (AST)
- Extracts functions, classes, imports accurately
- Calculates true cyclomatic complexity
- Identifies code patterns (not just regex matching)

**Benefits:**
- More accurate than regex-based analysis
- Works with TypeScript, JavaScript, JSX/TSX
- Proper handling of nested structures

### Hybrid Search (BM25)

CCG combines multiple search strategies for better results:

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **BM25** | Term frequency scoring | Finding specific functions/variables |
| **Semantic** | Vector similarity | Finding related concepts |
| **Hybrid** | Combined scoring | Best overall results |

**How BM25 helps:**
- Better ranking for exact term matches
- Handles long/short queries differently
- Configurable weighting between strategies

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

> **See Also:** [TOOLS_REFERENCE.md](./TOOLS_REFERENCE.md) for a complete auto-generated list of all 160+ MCP tools.

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

### Session Tools

- `session_init` - Initialize new session
- `session_status` - Get session state
- `session_save` - Save session manually
- `session_resume` - Resume from previous session
- `session_offer` - Check for resumable session
- `session_timeline` - View session events
- `session_replay` - Replay timeline for debugging
- `session_export` - Export session to file
- `session_end` - End and save session

### Checkpoint Tools

- `resource_checkpoint_create` - Create checkpoint
- `resource_checkpoint_list` - List all checkpoints
- `resource_checkpoint_restore` - Restore to checkpoint
- `resource_checkpoint_delete` - Delete checkpoint
- `resource_checkpoint_diff` - Compare two checkpoints
- `resource_governor_state` - Get token budget state
- `resource_action_allowed` - Check if action is allowed

### Testing Tools

- `testing_run` - Run tests
- `testing_run_affected` - Run tests for changed files
- `testing_browser_open` - Open browser session
- `testing_browser_analysis` - Get prioritized failure analysis
- `testing_browser_screenshot` - Capture screenshot
- `testing_browser_logs` - Get console logs
- `testing_browser_network` - Get network requests
- `testing_browser_errors` - Get JavaScript errors
- `testing_browser_close` - Close browser session

### TaskGraph Tools

- `auto_workflow_start` - Start workflow from description
- `auto_decompose_task` - Decompose complex task into DAG

For complete tool schemas, see individual guide documents or use Claude Code's MCP tool discovery.

---

## Getting Help

- **Quickstart issues?** See [QUICKSTART.md](QUICKSTART.md)
- **Advanced features?** See [LATENT_CHAIN_GUIDE.md](LATENT_CHAIN_GUIDE.md)
- **Session recovery?** See [SESSION_RESUME.md](SESSION_RESUME.md)
- **Gate requirements?** See [COMPLETION_GATES.md](COMPLETION_GATES.md)
- **GitHub Issues:** https://github.com/phuongrealmax/claude-code-guardian/issues
- **Website:** https://codeguardian.studio

---

**Last updated:** 2025-12-15
