# CCG GitHub Action

Run Code Guardian Studio analysis on your pull requests with **tamper-evident Proof Packs** and **TDI budget enforcement**.

## Features

- **Proof Pack Generation** - Tamper-evident validation evidence with SHA-256 hash
- **TDI Budget Gates** - Fail CI if Technical Debt Index exceeds budget
- **PR Comments** - Automatic analysis summary posted to PRs
- **Artifact Storage** - Proof Packs stored as GitHub Artifacts (90 days)

## Quick Start

Add this workflow to your repository:

```yaml
# .github/workflows/ccg-analysis.yml
name: CCG Code Analysis

on:
  pull_request:
    branches: [main, master]

permissions:
  pull-requests: write
  contents: read

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/code-guardian@v1
        with:
          threshold: 70
          fail-on-budget-exceeded: true
          generate-proof-pack: true
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `threshold` | Hotspot score threshold for failure (0-100) | `70` |
| `fail-on-budget-exceeded` | Fail CI if TDI exceeds budget in `.ccg/budgets.yaml` | `true` |
| `generate-proof-pack` | Generate tamper-evident Proof Pack | `true` |
| `post-comment` | Post analysis results as PR comment | `true` |
| `working-directory` | Working directory for analysis | `.` |
| `config-path` | Path to .ccg config directory | `.ccg` |

## Outputs

| Output | Description |
|--------|-------------|
| `proof-pack-id` | ID of the generated Proof Pack |
| `proof-pack-hash` | SHA-256 hash of the Proof Pack |
| `tdi-score` | Technical Debt Index score |
| `tdi-budget-exceeded` | Whether TDI exceeded budget (true/false) |
| `hotspot-count` | Number of hotspots detected |
| `critical-count` | Number of critical hotspots (score >= 80) |
| `quality-gate-passed` | Whether the quality gate passed (true/false) |

## TDI Budget Configuration

Create `.ccg/budgets.yaml` to set TDI budgets per folder:

```yaml
tdi:
  default: 50
  budgets:
    "src/api/": 40
    "src/legacy/": 70
    "src/utils/": 30
```

The action will fail if any folder exceeds its budget.

## Example Workflows

### Basic with Proof Pack

```yaml
- uses: anthropics/code-guardian@v1
  id: ccg

- name: Show Proof Pack
  run: |
    echo "Proof Pack ID: ${{ steps.ccg.outputs.proof-pack-id }}"
    echo "Hash: ${{ steps.ccg.outputs.proof-pack-hash }}"
```

### Strict TDI Enforcement

```yaml
- uses: anthropics/code-guardian@v1
  with:
    threshold: 50
    fail-on-budget-exceeded: true
```

### Analysis Only (No Gate)

```yaml
- uses: anthropics/code-guardian@v1
  with:
    fail-on-budget-exceeded: false
    generate-proof-pack: false
```

### Custom Working Directory

```yaml
- uses: anthropics/code-guardian@v1
  with:
    working-directory: ./packages/core
    config-path: ./packages/core/.ccg
```

## PR Comment Format

When `post-comment: true`, CCG posts a formatted comment:

```markdown
## 🛡️ Code Guardian Analysis

> ✅ **Quality Gate Passed** | TDI: **32.5**

### Metrics

| Metric | Value | Status |
|--------|-------|--------|
| TDI Score | 32.5 | ✅ Within budget |
| Hotspots | 3 | ✅ |
| Critical | 0 | ✅ |
| Threshold | 70 | - |

### 📦 Proof Pack

| Field | Value |
|-------|-------|
| ID | `pp_20251220001234_12345` |
| Hash | `a1b2c3d4e5f6...` |
| Trust Level | CI_SIGNED |
| Verify | `ccg verify pp_20251220001234_12345.json` |
```

## Proof Pack Verification

Verify a Proof Pack locally:

```bash
# Download artifact from GitHub Actions
gh run download <run-id> -n ccg-proof-pack

# Verify integrity
ccg verify .ccg/proofpacks/pp_*.json
```

Output:
```
✅ PASS: Hash verified
   ID: pp_20251220001234_12345
   Trust Level: CI_SIGNED
   Created: 2025-12-20T00:12:34.000Z
```

## Using Outputs

Access action outputs in subsequent steps:

```yaml
- uses: anthropics/code-guardian@v1
  id: ccg

- name: Check Results
  run: |
    echo "TDI Score: ${{ steps.ccg.outputs.tdi-score }}"
    echo "Quality Gate: ${{ steps.ccg.outputs.quality-gate-passed }}"
    echo "Proof Pack: ${{ steps.ccg.outputs.proof-pack-id }}"

- name: Fail if Critical Hotspots
  if: steps.ccg.outputs.critical-count > 0
  run: |
    echo "❌ Found ${{ steps.ccg.outputs.critical-count }} critical hotspots"
    exit 1
```

## Artifact Retention

Proof Packs are uploaded as GitHub Artifacts with 90-day retention:

```yaml
- uses: anthropics/code-guardian@v1

# Proof Pack available at:
# Actions > Run > Artifacts > ccg-proof-pack
```

To download programmatically:

```bash
gh run download <run-id> -n ccg-proof-pack -D ./proofpacks
```

## Troubleshooting

### Action Timeout

Large repositories may exceed the default timeout:

```yaml
- uses: anthropics/code-guardian@v1
  timeout-minutes: 10
```

### Permission Denied for PR Comments

Ensure the workflow has write permissions:

```yaml
permissions:
  pull-requests: write
  contents: read
```

### TDI Budget Not Found

Create `.ccg/budgets.yaml` or the action uses default budget of 50:

```bash
ccg init --yes
```

### Proof Pack Verification Failed

If `ccg verify` fails, the Proof Pack may have been tampered with:

```bash
ccg verify proofpack.json --json
# Output shows expected vs actual hash
```

## Related

- [VS Code Extension](VS_CODE_EXTENSION.md) - View reports in your editor
- [Quickstart Guide](QUICKSTART.md) - Get started with CCG
- [User Guide](USER_GUIDE.md) - Complete documentation
- [Tools Reference](TOOLS_REFERENCE.md) - MCP tools for Proof Packs

---

*Part of [Code Guardian Studio](https://codeguardian.studio)*
