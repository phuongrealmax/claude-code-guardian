# Code Guardian Studio

> AI-powered code refactor engine for large repositories, built on Claude Code + MCP.

**Website & Docs:** https://codeguardian.studio

---

## What is Code Guardian Studio?

Code Guardian Studio (CCG) is an MCP server that transforms Claude Code into an intelligent refactoring assistant. It scans your codebase, finds hotspots, generates optimization reports, and helps you refactor safely.

### Key Stats (from dogfooding CCG on itself)

| Metric | Value |
|--------|-------|
| Lines Analyzed | 68,000 |
| Files Scanned | 212 |
| Hotspots Found | 20 |
| Analysis Time | < 1 minute |

## 3-Minute Quickstart

Get your first code analysis in one command:

```bash
# Install globally
npm install -g codeguardian-studio

# Run quickstart (auto-initializes + analyzes your code)
ccg quickstart
```

That's it! The quickstart command will:
- Initialize CCG in your project
- Scan your codebase
- Analyze code complexity and hotspots
- Generate a detailed markdown report

Open the generated report and start fixing hotspots (highest score first).

**Want more control?** See [Manual Setup](#manual-setup) or read the full [Quickstart Guide](docs/QUICKSTART.md).

## Features

### Code Optimizer (8 tools)
- `code_scan_repository` - Map your entire codebase
- `code_metrics` - Calculate complexity, nesting, branch scores
- `code_hotspots` - Find files that need attention
- `code_refactor_plan` - Generate step-by-step refactor plans
- `code_record_optimization` - Log optimization sessions
- `code_generate_report` - Create Markdown reports
- `code_quick_analysis` - Scan + metrics + hotspots in one call
- `code_optimizer_status` - Check module status

### Additional Modules
- **Memory** - Persistent storage across sessions
- **Guard** - Block dangerous patterns (fake tests, empty catches, etc.)
- **Workflow** - Task management and tracking
- **Latent Chain** - Multi-phase reasoning for complex tasks
- **Agents** - Specialized agent coordination
- **Thinking** - Structured reasoning models
- **Documents** - Documentation management
- **Testing** - Test runner integration

## Pricing

| Plan | Price | Best For |
|------|-------|----------|
| Dev | Free | Solo devs & side projects |
| Team | $39/mo | Product teams & agencies |
| Enterprise | Custom | Large orgs & compliance |

## Links

- **Website:** https://codeguardian.studio
- **Case Study:** https://codeguardian.studio/case-study
- **Partners:** https://codeguardian.studio/partners
- **GitHub:** https://github.com/phuongrealmax/claude-code-guardian

## Manual Setup

If you prefer step-by-step control:

```bash
# 1. Install
npm install -g codeguardian-studio

# 2. Initialize CCG in your project
ccg init

# 3. Run analysis with custom options
ccg code-optimize --report

# 4. For advanced options
ccg code-optimize --help-advanced
```

See the [User Guide](docs/USER_GUIDE.md) for more details.

## License

MIT

---

Built with Claude. Protected by Guardian.
