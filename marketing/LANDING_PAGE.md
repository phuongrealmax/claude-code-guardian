# Claude Code Guardian - Landing Page Content v1

> Copy-paste ready for Next.js, Notion, or any markdown-based site.

---

## HERO SECTION

### Headline
**Turn Claude Code into a refactor engine for your biggest repos.**

### Subheadline
Claude Code Guardian adds a Code Optimizer layer on top of Claude — scanning your repo, finding hotspots, refactoring safely and generating human-readable reports in one command.

### CTA Buttons
- **Primary:** `Get Started Free` → links to npm install instructions
- **Secondary:** `View Sample Report` → links to sample optimization report

### Hero Visual
- Terminal showing: `ccg code-optimize --report`
- Output showing hotspots table with color-coded scores
- Fade to generated markdown report

---

## SOCIAL PROOF BAR (placeholder)

> "CCG found 12 hotspots in our 80k LOC monorepo that we'd been ignoring for months. The refactor plan saved us weeks."
> — *Tech Lead, [Company]*

---

## PROBLEM SECTION

### Headline
**Your repo is growing. Your technical debt is growing faster.**

### Pain Points (3 columns)

| The Reality | What You've Tried | Why It Fails |
|-------------|-------------------|--------------|
| Legacy code piles up | Manual code reviews | Too slow, inconsistent |
| New devs break old code | Static analysis tools | Too noisy, no context |
| Refactoring feels risky | Periodic "cleanup sprints" | Never enough time |

### Transition
**What if Claude could do the heavy lifting — safely?**

---

## SOLUTION SECTION

### Headline
**Meet Claude Code Guardian's Code Optimizer**

### Subheadline
8 MCP tools that transform Claude Code into an intelligent refactoring assistant.

### 3 Pillars

#### 1. Scan & Analyze
**Find what matters, ignore what doesn't.**

- `code_scan_repository` — Map your entire codebase in seconds
- `code_metrics` — Calculate complexity, nesting, TODOs, FIXMEs
- `code_hotspots` — Rank files by "refactor priority" score

*Output: A ranked list of your messiest files with actionable reasons.*

#### 2. Plan & Refactor
**AI-guided refactoring with human oversight.**

- `code_refactor_plan` — Generate step-by-step refactor roadmap
- Latent Chain Mode — Analysis → Plan → Implement → Review
- Guard Module — Block dangerous patterns before they land

*Output: Safe, incremental changes you can review and approve.*

#### 3. Report & Track
**Document everything. Prove the improvement.**

- `code_generate_report` — Markdown reports with before/after metrics
- `code_record_optimization` — Log sessions for team visibility
- CI Integration — Auto-comment hotspots on every PR

*Output: Professional reports you can share with stakeholders.*

---

## HOW IT WORKS

### 4 Steps to a Cleaner Codebase

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   1. INSTALL    │───▶│    2. SCAN      │───▶│   3. REFACTOR   │───▶│   4. REPORT     │
│                 │    │                 │    │                 │    │                 │
│  npm install    │    │  ccg code-      │    │  Claude applies │    │  Generated .md  │
│  ccg init       │    │  optimize       │    │  safe patches   │    │  with metrics   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Step 1: Install & Connect
```bash
npm install -g @anthropic-community/claude-code-guardian
ccg init
```
*30 seconds. Works with any Node.js project.*

### Step 2: Open in Claude Code
```
"Analyze this repository and find the top 10 hotspots
that need refactoring for better maintainability."
```
*Claude uses CCG tools automatically via MCP.*

### Step 3: Run Optimizer (CLI or Claude)
```bash
ccg code-optimize --report --strategy mixed
```
*Or let Claude run it conversationally.*

### Step 4: Review the Report
```markdown
## Guardian Optimization Report

### Hotspots Analyzed: 15
### Files Changed: 8
### Complexity Reduction: -23%
### Tests: ✅ All Passing
```
*Share with your team. Track progress over time.*

---

## FEATURES GRID

| Feature | Dev (Free) | Team | Enterprise |
|---------|------------|------|------------|
| Core MCP Tools | ✅ | ✅ | ✅ |
| Code Optimizer (8 tools) | ✅ | ✅ | ✅ |
| CLI `ccg code-optimize` | ✅ | ✅ | ✅ |
| Guard Rules (Security) | ✅ | ✅ | ✅ |
| GitHub Actions Template | ✅ | ✅ | ✅ |
| Optimization Reports | Basic | Full | Full + Custom |
| Report History Dashboard | - | ✅ | ✅ |
| Multi-repo Management | - | ✅ | ✅ |
| Custom Workflows | - | - | ✅ |
| Self-hosted Option | - | - | ✅ |
| Priority Support | Community | Email | Dedicated |

---

## USE CASES

### For Tech Leads
> "I need to clean up 2 years of accumulated tech debt before we can scale the team."

**CCG gives you:**
- Prioritized hotspot list (focus on what matters)
- Safe refactor plans (no surprises in production)
- Reports for stakeholder buy-in

### For Agencies / Dev Shops
> "We maintain 20+ client codebases. Each one has its own mess."

**CCG gives you:**
- Consistent analysis across all projects
- Quick health checks before taking on new clients
- Documentation for handoffs

### For Open Source Maintainers
> "Contributors submit PRs but the codebase is getting harder to understand."

**CCG gives you:**
- Automatic hotspot comments on PRs
- Contribution-friendly refactor suggestions
- Living documentation of code health

---

## SAMPLE OUTPUT

### Hotspots Table
```
╔══════╦════════════════════════════════════╦═══════╦════════════════╗
║ Rank ║ File                               ║ Score ║ Suggested Goal ║
╠══════╬════════════════════════════════════╬═══════╬════════════════╣
║ #1   ║ src/services/payment.service.ts    ║ 🔴 78 ║ split-module   ║
║ #2   ║ src/utils/legacy-helpers.ts        ║ 🟡 65 ║ refactor       ║
║ #3   ║ src/api/routes/orders.controller.ts║ 🟡 52 ║ add-tests      ║
║ #4   ║ src/core/state-machine.ts          ║ 🟢 41 ║ document       ║
╚══════╩════════════════════════════════════╩═══════╩════════════════╝
```

### Report Preview
```markdown
# Guardian Optimization Report
**Session:** opt-2024-01-15-abc123
**Repository:** acme-commerce
**Strategy:** mixed

## Overview
| Metric | Value |
|--------|-------|
| Files Scanned | 847 |
| Lines of Code | 124,500 |
| Hotspots Found | 15 |

## Metrics Comparison
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Avg Complexity | 8.4 | 6.5 | -23% ⬇️ |
| Max Nesting | 7 | 4 | -43% ⬇️ |
| TODOs | 34 | 12 | -65% ⬇️ |

## Recommended Next Steps
1. Split `payment.service.ts` into domain-specific modules
2. Add unit tests for `orders.controller.ts`
3. Document the state machine transitions
```

---

## FAQ

### Is this just another linter?
No. Linters find syntax issues. CCG finds architectural and maintainability issues — the stuff that makes codebases hard to work with over time. It also suggests *how* to fix them.

### Does it actually change my code?
Only if you ask Claude to apply the refactor plan. The analysis is read-only. You control what gets changed.

### What languages are supported?
CCG works with any language Claude understands: TypeScript, JavaScript, Python, Go, Rust, Java, C#, and more. Metrics are calculated using language-agnostic heuristics.

### Can I use it in CI/CD?
Yes. Use `ccg code-optimize --ci --threshold 70` to fail builds if hotspots exceed your threshold. See our GitHub Actions template.

### Is my code sent to the cloud?
CCG runs locally. Your code stays on your machine. Only the MCP tool calls go to Claude's API (same as using Claude Code normally).

---

## CTA SECTION

### Headline
**Start cleaning up your codebase today.**

### Steps
1. `npm install -g @anthropic-community/claude-code-guardian`
2. `ccg init`
3. Open in Claude Code
4. Say: *"Analyze this repo and find hotspots"*

### Buttons
- **Primary:** `Get Started Free`
- **Secondary:** `Read the Docs`
- **Tertiary:** `View on GitHub`

---

## FOOTER

**Claude Code Guardian** — Enterprise-grade guardrails for AI-assisted development.

- [Documentation](./docs)
- [GitHub](https://github.com/anthropic-community/claude-code-guardian)
- [npm](https://npmjs.com/package/@anthropic-community/claude-code-guardian)

*Built with Claude. Protected by Guardian.*

---

## META / SEO

**Title:** Claude Code Guardian — AI Refactoring for Large Codebases

**Description:** Turn Claude Code into a refactor engine. Scan repos, find hotspots, generate optimization reports. One command. Enterprise-ready.

**Keywords:** claude code, mcp, code optimizer, refactoring, technical debt, code quality, ai coding assistant

**OG Image:** Terminal with hotspots table + report preview
