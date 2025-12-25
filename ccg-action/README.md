# CCG GitHub Action

Run **Claude Code Guardian** code analysis in your GitHub Actions workflows.

## Features

- **Hotspot Detection**: Identify complex, high-risk code areas
- **Complexity Analysis**: Measure and track code complexity metrics
- **Guard Validation**: Automatic code quality checks on PR changes
- **PR Comments**: Post analysis results directly to pull requests
- **Flexible Thresholds**: Customize pass/fail criteria
- **Multiple Strategies**: Size, complexity, or mixed analysis

## Quick Start

```yaml
name: CCG Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codeguardian/ccg-action@v1
        with:
          threshold: 70
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `threshold` | Fail if any hotspot score exceeds this value (0-100) | No | `70` |
| `include` | Glob patterns for files to include (comma-separated) | No | `**/*.ts,**/*.tsx,**/*.js,**/*.jsx` |
| `exclude` | Glob patterns for files to exclude (comma-separated) | No | `node_modules/**,dist/**,build/**,.git/**` |
| `strategy` | Analysis strategy: `size`, `complexity`, or `mixed` | No | `mixed` |
| `fail-on-issues` | Fail the action if any guard issues are found | No | `true` |
| `comment-on-pr` | Post analysis results as PR comment | No | `true` |
| `max-hotspots` | Maximum number of hotspots to report | No | `20` |
| `guard-rules` | Guard rules to enable (comma-separated, or `all`) | No | `all` |

## Outputs

| Output | Description |
|--------|-------------|
| `hotspots-count` | Number of hotspots found |
| `avg-complexity` | Average complexity score |
| `max-complexity` | Maximum complexity score found |
| `total-issues` | Total number of guard issues found |
| `files-analyzed` | Number of files analyzed |
| `report-path` | Path to the generated report file |
| `passed` | Whether the analysis passed all thresholds (`true`/`false`) |

## Example Workflows

### Basic Usage

```yaml
- uses: codeguardian/ccg-action@v1
  with:
    threshold: 70
```

### Strict Mode

```yaml
- uses: codeguardian/ccg-action@v1
  with:
    threshold: 50
    strategy: complexity
    fail-on-issues: true
```

### Custom File Patterns

```yaml
- uses: codeguardian/ccg-action@v1
  with:
    include: "src/**/*.ts,lib/**/*.js"
    exclude: "**/*.test.ts,**/*.spec.js"
```

### Using Outputs

```yaml
- uses: codeguardian/ccg-action@v1
  id: ccg

- name: Check Results
  run: |
    echo "Hotspots: ${{ steps.ccg.outputs.hotspots-count }}"
    echo "Complexity: ${{ steps.ccg.outputs.avg-complexity }}"
    if [ "${{ steps.ccg.outputs.passed }}" = "false" ]; then
      echo "Analysis failed!"
      exit 1
    fi
```

### Scheduled Analysis

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  weekly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codeguardian/ccg-action@v1
        with:
          fail-on-issues: false
          max-hotspots: 50
```

## Analysis Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `size` | Prioritize large files | Finding bloated modules |
| `complexity` | Focus on nesting, branching | Finding hard-to-maintain code |
| `mixed` | Balanced scoring (recommended) | General analysis |

## PR Comment Example

When enabled, the action posts a comment like this:

> **CCG Code Analysis Report**
>
> | Metric | Value | Status |
> |--------|-------|--------|
> | Files Analyzed | 127 | - |
> | Hotspots Found | 8 | OK |
> | Avg Complexity | 24 | OK |
> | Max Complexity | 65 | Warning |
> | Guard Issues | 3 | Warning |
>
> **Status**: PASSED

## Requirements

- Repository checkout with `fetch-depth: 0` (for diff analysis)
- `GITHUB_TOKEN` for PR comments

## Related

- [Claude Code Guardian](https://github.com/codeguardian/code-guardian) - Main repository
- [Documentation](https://codeguardian.studio/docs) - Full documentation
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=codeguardian.ccg-vscode) - IDE integration

## License

MIT License - see [LICENSE](../LICENSE)
