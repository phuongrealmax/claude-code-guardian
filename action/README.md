# Claude Code Guardian GitHub Action

AI safety infrastructure for code validation with tamper-evident Proof Packs.

## Features

- **Code Quality Analysis**: Detects hotspots, complexity issues, and technical debt
- **TDI Budget Enforcement**: Fails CI when Technical Debt Index exceeds configured budget
- **Proof Pack Generation**: Creates tamper-evident validation evidence with SHA-256 hash
- **PR Comments**: Posts detailed analysis results as pull request comments
- **Chain of Custody**: Records actor, environment, and timestamp for audit trail

## Usage

### Basic Usage

```yaml
name: Code Guardian

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/code-guardian@v1
        with:
          threshold: 70
```

### With TDI Budget Enforcement

```yaml
- uses: anthropics/code-guardian@v1
  with:
    threshold: 70
    fail-on-budget-exceeded: true
    generate-proof-pack: true
```

### Using Outputs

```yaml
- uses: anthropics/code-guardian@v1
  id: ccg

- name: Check Results
  run: |
    echo "TDI Score: ${{ steps.ccg.outputs.tdi-score }}"
    echo "Proof Pack: ${{ steps.ccg.outputs.proof-pack-id }}"
    echo "Hash: ${{ steps.ccg.outputs.proof-pack-hash }}"
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `threshold` | Hotspot score threshold for failure (0-100) | `70` |
| `fail-on-budget-exceeded` | Fail CI if TDI exceeds budget | `true` |
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

Create `.ccg/budgets.yaml` in your repository:

```yaml
tdi:
  default: 50
  budgets:
    "src/api/": 40
    "src/legacy/": 70
    "tests/": 80
```

## Proof Pack Schema

Generated Proof Packs follow the v1.1 schema:

```json
{
  "version": "1.1",
  "id": "pp_20231219120000_12345",
  "createdAt": "2023-12-19T12:00:00.000Z",
  "target": {
    "filename": ".",
    "repository": "owner/repo",
    "ref": "refs/pull/123/merge",
    "sha": "abc123..."
  },
  "hashAlgorithm": "SHA-256",
  "trustLevel": "CI_SIGNED",
  "chainOfCustody": {
    "actor": { "type": "ci", "id": "github-actions" },
    "environment": { "os": "Linux", "ccgVersion": "4.0.1" },
    "timestamp": "2023-12-19T12:00:00.000Z"
  },
  "validation": { "valid": true, "hotspotCount": 5 },
  "metricsDelta": {
    "tdi": { "before": 0, "after": 35, "budget": 50, "budgetExceeded": false }
  },
  "hash": "sha256-of-canonical-json"
}
```

## Verifying Proof Packs

```bash
# Download artifact and verify
ccg verify proof-pack.json
```

## License

MIT - See [LICENSE](../LICENSE)
