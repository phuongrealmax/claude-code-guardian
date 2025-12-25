# Landing Page Copy Source

> Source copy for codeguardian.studio landing page
> Last Updated: December 2024 (v4.0.0)

## Hero Section

**Badge**: v4.0.0 — MIT Open-Core

**Headline**: Turn Claude Code into a refactor engine for your biggest repos.

**Subheadline**: Free, local-first. Advanced tech-debt reports when your team is ready.

**Sub-sub**: Dev tier runs fully offline. No license required.

**Primary CTA**: Install via npm → #get-started
**Secondary CTA**: View GitHub Repo → https://github.com/phuongrealmax/code-guardian

**Trust Badges**:
- Built on Claude
- MIT Open-Core
- 100% Offline (Dev)

---

## Stats Section

**Intro**: Real results from dogfooding CCG on itself

| Stat | Value |
|------|-------|
| Tech Debt Index | 75→68 |
| TDI Improvement | -9.3% |
| Lines Analyzed | 62k |
| Quickstart Time | <1s |

---

## "Built for Real Developer Workflows" Section

**Headline**: Built for Real Developer Workflows
**Subheadline**: No JSON wrangling. No complex setup. Just results.

### Card 1: CLI-First, No JSON
You never touch raw MCP JSON. Just run `ccg quickstart` and use natural language with Claude. The tools handle the rest.

### Card 2: IDE-Native
VS Code extension shows Tech Debt Index in your status bar. Claude Code MCP integration means you stay in your editor.

### Card 3: Fast Enough for Daily Use
Quickstart analyzes ~100k LOC in under a second. Heavy Latent Chain reasoning is there when you need it, not blocking your flow.

---

## Features Section ("What It Does")

**Headline**: What It Does
**Subheadline**: Four capabilities organized by what you need and when.

### A) Scan & Measure (Dev — Free)
**Tech Debt Index** (0-100, grade A-F) gives you one number for codebase health. Hotspot detection finds large files and high complexity.

### B) Plan & Refactor with Claude (Dev — Free)
**Latent Chain** mode walks through Analysis, Plan, Impl, Review. Guard module blocks dangerous patterns before they ship.

### C) Track Progress Over Time (Team)
Before/after metrics and **TDI trend charts**. Session history shows how your codebase improves sprint over sprint.

### D) Integrate with Your Workflow (Team / Enterprise)
**GitHub Action** PR comments + quality gates. VS Code extension. Multi-repo config for monorepos. Claude Code MCP integration.

---

## How It Works Section

**Headline**: How It Works
**Subheadline**: From install to insights in 4 steps.

### Step 1: Install
```bash
npm install -g codeguardian-studio
```
One global install. Works on any Node.js project.

### Step 2: Run Quickstart
```bash
ccg quickstart
```
Scans repo, finds hotspots, writes markdown report to `docs/reports/`. Works offline.

### Step 3: Review & Refactor
Open the report in your editor. Start with worst-grade files. Use Claude Code + CCG MCP tools to refactor safely with Latent Chain.

### Step 4: Track Progress (Team)
```bash
ccg dogfood-report --summary
```
Track TDI and hotspots over time. See trends across sessions.

---

## Pricing Section

**Headline**: Pricing
**Subheadline**: Start free. Scale when ready.

### Dev (Free)
For solo devs & side projects
- Core CLI & hotspot detection
- Tech Debt Index per run
- Basic markdown reports
- GitHub Actions template
- Fully local, no license

### Team ($19/mo)
For product teams & agencies
- Everything in Dev
- Advanced reports (before/after)
- TDI trends & session history
- Multi-repo config
- PR hotspot comments
- VS Code extension
- Email support

### Enterprise (Custom)
For large orgs & compliance
- Everything in Team
- Unlimited repos
- SSO / SAML
- Audit logs
- Dedicated cloud backend
- SLA + dedicated support

---

## FAQ Section

### Why not just use SonarQube + Claude?
You could! But Code Guardian Studio gives you:
- **Tech Debt Index** — one number for codebase health (0-100, grade A-F)
- **Trend tracking** — see how TDI changes sprint over sprint
- **Multi-session reports** — before/after comparisons out of the box
- **Claude-native workflow** — Latent Chain mode, MCP integration, no glue code

SonarQube is great for static analysis. CCG adds the "what changed" and "what to do next" layers that turn analysis into action.

### Does the free tier have limits?
No artificial limits. Dev tier includes full CLI, hotspot detection, Tech Debt Index, and basic reports. It runs 100% offline with no license key required.

Team tier adds trend tracking, advanced reports, PR comments, and VS Code integration for teams who want visibility into progress over time.

### What languages are supported?
JavaScript/TypeScript have the best support. Python, Java, Go, Rust, and C/C++ work with basic metrics. Any language with recognizable syntax gets file-level analysis.

---

## Get Started Section

**Headline**: Ready to clean up your codebase?

```bash
npm install -g codeguardian-studio
ccg quickstart
```

That's it. Report appears in `docs/reports/`.

**Primary CTA**: View on GitHub
**Secondary CTA**: See Case Study
