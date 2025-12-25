# Code Guardian Studio

[![npm version](https://img.shields.io/npm/v/codeguardian-studio)](https://www.npmjs.com/package/codeguardian-studio)
[![npm downloads](https://img.shields.io/npm/dm/codeguardian-studio)](https://www.npmjs.com/package/codeguardian-studio)
[![license](https://img.shields.io/npm/l/codeguardian-studio)](https://github.com/phuongrealmax/code-guardian/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/codeguardian-studio)](https://nodejs.org)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-113%2B-blue)](https://codeguardian.studio)
[![MCP Server](https://img.shields.io/badge/MCP-mcp.so-purple)](https://mcp.so/server/code-guardian)
[![GitHub stars](https://img.shields.io/github/stars/phuongrealmax/code-guardian?style=social)](https://github.com/phuongrealmax/code-guardian)
[![GitHub Discussions](https://img.shields.io/github/discussions/phuongrealmax/code-guardian)](https://github.com/phuongrealmax/code-guardian/discussions)

> AI-powered code refactor engine for large repositories, built on Claude Code + MCP.

**Version:** 4.1.0 | **License:** MIT (open-core)

**Website & Docs:** https://codeguardian.studio

---

## Why CCG?

CCG stands out as the **most comprehensive MCP server** for Claude Code:

| | CCG | Guardrails AI | NeMo | Semgrep MCP |
|---|:---:|:---:|:---:|:---:|
| **MCP Tools** | 113+ | - | - | ~10 |
| **Code Analysis** | ✅ | ❌ | ❌ | ✅ |
| **Hotspot Detection** | ✅ | ❌ | ❌ | ❌ |
| **Workflow Management** | ✅ | ❌ | ❌ | ❌ |
| **Session Persistence** | ✅ | ❌ | ❌ | ❌ |
| **Memory System** | ✅ | ❌ | ❌ | ❌ |
| **Progress Dashboard** | ✅ | ❌ | ❌ | ❌ |
| **Latent Chain Reasoning** | ✅ | ❌ | ❌ | ❌ |
| **Guard Rules** | ✅ | ✅ | ✅ | ✅ |

**Key Differentiators:**
- **All-in-one**: Guard + Metrics + Workflow + Memory in a single server
- **113+ MCP tools**: The most comprehensive toolset available
- **Session management**: Resume work across conversations
- **Real-time progress**: Track refactoring progress with live dashboard
- **Latent Chain**: Multi-phase reasoning for complex tasks

> **Want detailed comparisons?** See [CCG vs Competitors](docs/COMPARISON.md)

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
| Dev | Free | Solo devs, fully offline |
| Team | $19/mo | Product teams & agencies |
| Enterprise | Custom | Large orgs & compliance |

Dev tier is 100% local and self-hostable. Team/Enterprise require license validation via `api.codeguardian.studio`.

See [License Tiers](docs/USER_GUIDE.md#license-tiers) for feature comparison.

## Links

- **Website:** https://codeguardian.studio
- **Case Study:** https://codeguardian.studio/case-study
- **Partners:** https://codeguardian.studio/partners
- **GitHub:** https://github.com/phuongrealmax/code-guardian
- **MCP Directory:** https://mcp.so/server/code-guardian
- **GitHub Action:** [ccg-action](ccg-action/) - CI/CD integration for PR analysis

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

## Installation Requirements

CCG uses `better-sqlite3` (native SQLite bindings) which requires build tools on your system:

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install build-essential python3
npm install -g codeguardian-studio
```

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

npm install -g codeguardian-studio
```

### Windows
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

npm install -g codeguardian-studio
```

### Docker
```dockerfile
FROM node:20-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g codeguardian-studio
```

### Troubleshooting

**Error: `gyp ERR! stack Error: not found: make`**
- Solution: Install build tools (see above for your OS)

**Error: `Module did not self-register`**
- Solution: Node.js version mismatch. Rebuild with:
  ```bash
  npm rebuild better-sqlite3
  ```

**ARM64 compatibility:**
- ✅ Supported on Apple Silicon (M1/M2/M3)
- ✅ Supported on Ubuntu ARM64
- May require build from source on some platforms

## Documentation

- [Features](docs/FEATURES.md) - Complete guide to 113+ MCP tools
- [User Guide](docs/USER_GUIDE.md) - Complete feature documentation
- [Quickstart](docs/QUICKSTART.md) - Get started in 3 minutes
- [Comparison](docs/COMPARISON.md) - CCG vs competitors
- [Migration Guide](docs/MIGRATION_OPEN_CORE.md) - Upgrading to v4.0.0
- [License System](docs/LICENSE_SYSTEM.md) - Open-core architecture
- [Changelog](CHANGELOG.md) - Version history

## Community & Support

Have questions or ideas? We'd love to hear from you!

- 💬 **[GitHub Discussions](https://github.com/phuongrealmax/code-guardian/discussions)** - Ask questions, share ideas, get help
- 🐛 **[Report Issues](https://github.com/phuongrealmax/code-guardian/issues)** - Bug reports and feature requests
- ⭐ **[Star us on GitHub](https://github.com/phuongrealmax/code-guardian)** - Show your support!

## License

MIT (open-core). See [LICENSE](LICENSE) for details.

---

Built with Claude. Protected by Guardian.
