# Claude Code Integration Guide

This guide explains how to use Code Guardian Studio (CCG) inside Claude Code for AI-assisted code analysis and refactoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up the MCP Server](#setting-up-the-mcp-server)
3. [Connecting Claude Code to Your Repository](#connecting-claude-code-to-your-repository)
4. [Example Prompts](#example-prompts)
5. [How Claude Uses CCG Tools](#how-claude-uses-ccg-tools)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up CCG with Claude Code, ensure you have:

### Required Software

| Software | Minimum Version | Purpose |
|----------|-----------------|---------|
| Node.js | 18.0.0+ | Runtime environment |
| npm | 8.0.0+ | Package manager |
| Claude Desktop or Claude Code | Latest | AI assistant with MCP support |

### Installation

```bash
# Install Code Guardian Studio globally
npm install -g codeguardian-studio

# Verify installation
ccg --version
```

---

## Setting Up the MCP Server

CCG runs as an MCP (Model Context Protocol) server that Claude Code connects to. There are two ways to set this up:

### Option 1: Automatic Setup (Recommended)

Run the init command in your project:

```bash
cd /path/to/your/project
ccg init
```

This creates `.mcp.json` with the correct server configuration.

### Option 2: Manual Configuration

Add CCG to your Claude Code MCP settings:

**For Claude Desktop (macOS/Linux):**

Edit `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "code-guardian": {
      "command": "npx",
      "args": ["-y", "codeguardian-studio"],
      "env": {
        "CCG_PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

**For Claude Desktop (Windows):**

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "code-guardian": {
      "command": "npx",
      "args": ["-y", "codeguardian-studio"],
      "env": {
        "CCG_PROJECT_ROOT": "C:\\path\\to\\your\\project"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CCG_PROJECT_ROOT` | Yes | Path to your project root |
| `CCG_LOG_LEVEL` | No | Logging level: `debug`, `info`, `warn`, `error` |
| `CCG_LICENSE_KEY` | No | License key for Team tier features |

---

## Connecting Claude Code to Your Repository

### Step 1: Open Your Project

Open your repository folder in Claude Code or Claude Desktop.

### Step 2: Verify MCP Connection

Ask Claude to check the connection:

> "Can you see the Code Guardian Studio tools? List them for me."

Claude should respond with available CCG tools like `code_scan_repository`, `code_metrics`, `code_hotspots`, etc.

### Step 3: Initialize (If Not Done)

If CCG hasn't been initialized:

> "Initialize Code Guardian Studio in this project."

---

## Example Prompts

Use natural language to interact with CCG through Claude. No JSON or technical tool schemas needed.

### Scanning and Analysis

**Quick health check:**
> "Use Code Guardian Studio to scan this repository and show me the top hotspots."

**Detailed analysis:**
> "Analyze the code quality of this project. Show me which files have the highest complexity."

**Specific directory:**
> "Scan only the src/api folder and identify files that need refactoring."

### Optimization Workflows

**Full optimization:**
> "Run the code optimization workflow and generate a report."

**Targeted optimization:**
> "Run the code optimization workflow on the payments service only."

**With specific focus:**
> "Analyze the authentication module for complexity issues and suggest improvements."

### Reports and Metrics

**Generate report:**
> "Create a code optimization report for this repository."

**View metrics:**
> "Show me the code metrics for the top 10 largest files."

**Track progress:**
> "Compare the current code quality with the last optimization session."

### Multi-Repository Projects

**List repositories:**
> "Show me all configured repositories in this multi-repo setup."

**Analyze specific repo:**
> "Scan the frontend repository and show me the hotspots."

---

## How Claude Uses CCG Tools

When you ask Claude to analyze your code, it automatically:

1. **Understands your request** - Interprets natural language to determine what analysis you need
2. **Selects appropriate tools** - Chooses CCG tools like `code_scan_repository`, `code_metrics`, or `code_hotspots`
3. **Executes analysis** - Runs the tools with correct parameters
4. **Presents results** - Formats the output in a readable way

### You Never Need To:

- Write JSON tool calls
- Memorize tool names or parameters
- Understand the MCP protocol
- Copy-paste code into chat

### Claude Handles:

- Tool selection and orchestration
- Parameter configuration
- Error handling and retries
- Result formatting and explanation

---

## Best Practices

### When to Use Quick Fixes vs Full Optimization

| Scenario | Approach | Command/Prompt |
|----------|----------|----------------|
| Daily check | Quick scan | "Quick health check on this repo" |
| Before PR | Targeted analysis | "Check the files I changed for issues" |
| Sprint planning | Full optimization | "Run full optimization workflow" |
| Tech debt review | Detailed report | "Generate comprehensive tech debt report" |

### Combining CLI and Claude Code

Use CLI for automation and CI/CD:

```bash
# In CI pipeline
ccg code-optimize --report --json > metrics.json
```

Use Claude Code for interactive analysis:

> "I just ran ccg code-optimize. Help me understand the hotspots and prioritize fixes."

### Effective Prompting Tips

**Be specific about scope:**
> "Analyze only TypeScript files in the src/services folder"

**Ask for explanations:**
> "Why is this file flagged as a hotspot? What makes it complex?"

**Request actionable advice:**
> "What's the quickest way to reduce complexity in auth/login.ts?"

**Iterate on results:**
> "That's helpful. Now show me similar issues in other files."

### Workflow Recommendations

1. **Start with quickstart** - Get baseline metrics
2. **Review hotspots** - Understand problem areas
3. **Prioritize fixes** - Focus on high-impact, low-effort items
4. **Track progress** - Compare before/after metrics
5. **Automate checks** - Add to CI/CD pipeline

---

## Refresh/Restart Resume Playbook

If your browser refreshes or Claude Code restarts mid-task:

1. **Check for resume offer**: Call `session_offer` to see if a previous session is available
2. **Resume session**: Call `session_resume` (or `session_resume { sessionFile: "..." }` for specific file)
3. **Review what was done**: Call `session_timeline` to see completed events
4. **Check blocked tasks**: Look for `nextToolCalls` in any blocked task responses
5. **Continue from nextToolCalls**: Execute suggested tools to unblock and complete tasks

See [Session Resume Guide](SESSION_RESUME.md) for detailed recovery workflows.

---

## Troubleshooting

### MCP Connection Issues

**"Cannot find CCG tools"**

1. Verify CCG is installed: `ccg --version`
2. Check MCP config file exists
3. Restart Claude Desktop/Code
4. Check logs: `CCG_LOG_LEVEL=debug`

**"Permission denied"**

Ensure the project path in `CCG_PROJECT_ROOT` is accessible and has read permissions.

### Analysis Issues

**"No files found"**

Check exclude patterns in `.ccg/config.json`. Default excludes `node_modules`, `dist`, etc.

**"Analysis takes too long"**

For large repositories (>50k LOC):
- Use `--max-files` flag
- Analyze specific directories
- Use multi-repo config to split analysis

### Getting Help

- Check [User Guide](USER_GUIDE.md) for CLI details
- Run `ccg doctor` to diagnose configuration issues
- Open issues at [GitHub](https://github.com/phuongrealmax/code-guardian/issues)

---

## Next Steps

- [User Guide](USER_GUIDE.md) - Complete CLI reference
- [Quickstart Guide](QUICKSTART.md) - 3-minute setup
- [Multi-repo Setup](USER_GUIDE.md#multi-repo-setup) - Managing multiple repositories
