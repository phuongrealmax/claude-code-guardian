# Code Guardian Studio - VS Code Extension

A VS Code extension that integrates Code Guardian directly into your editor, providing quick access to code optimization and report viewing.

## Features

- **Initialize Projects**: Set up Code Guardian in any workspace with a single command
- **Run Code Optimization**: Analyze your codebase and generate detailed reports
- **View Reports**: Automatically open optimization reports in VS Code
- **Status Bar Integration**: See CCG status at a glance
- **Multi-repo Support**: Configure default repository for multi-repo setups

## Installation

### From VSIX (Local)

1. Build the extension:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   npm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Run "Extensions: Install from VSIX..."
   - Select the generated `codeguardian-studio-1.0.0.vsix` file

### From VS Code Marketplace

Search for "Code Guardian Studio" in the VS Code Extensions panel, or install via command line:

```bash
code --install-extension CodeGuardianStudio.codeguardian-studio
```

**Publisher:** [CodeGuardianStudio](https://marketplace.visualstudio.com/publishers/CodeGuardianStudio)

## Prerequisites

Before using this extension, ensure you have the CCG CLI installed:

```bash
npm install -g codeguardian-studio
```

Or if using a local development version:
```bash
cd /path/to/code-guardian
npm run build
npm link
```

## Commands

Access all commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `Code Guardian: Quickstart` | Interactive menu to initialize, analyze, or view reports |
| `Code Guardian: Run Code Optimization` | Run full optimization with report generation |
| `Code Guardian: Open Latest Report` | Open the most recent optimization report |
| `Code Guardian: Initialize Project` | Initialize CCG in the current workspace |
| `Code Guardian: Show Status` | Show CCG status and available actions |

### Quickstart Command

The quickstart command provides an interactive menu with three options:

1. **Quick Analysis** - Fast scan with basic hotspot detection
2. **Full Optimization** - Complete analysis with detailed markdown report
3. **Open Latest Report** - View the most recent optimization report

### Code Optimization

Running code optimization will:
1. Scan your repository for code metrics
2. Identify hotspots (complex, problematic files)
3. Generate a detailed markdown report
4. Automatically open the report (if enabled in settings)

Output is shown in the "Code Guardian" output channel.

## Settings

Configure the extension via VS Code settings (`Ctrl+,` / `Cmd+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `codeguardian.cliPath` | `ccg` | Path to the CCG CLI executable |
| `codeguardian.defaultRepo` | `""` | Default repository for multi-repo setups |
| `codeguardian.autoOpenReport` | `true` | Auto-open reports after optimization |
| `codeguardian.showStatusBar` | `true` | Show CCG status in the status bar |

### CLI Path Configuration

If CCG is not in your PATH, specify the full path:

```json
{
  "codeguardian.cliPath": "/usr/local/bin/ccg"
}
```

Or for Windows:
```json
{
  "codeguardian.cliPath": "C:\\Users\\YourName\\AppData\\Roaming\\npm\\ccg.cmd"
}
```

### Multi-repo Configuration

If you have multiple repositories configured in `.ccg/repos.yaml`, you can set a default:

```json
{
  "codeguardian.defaultRepo": "backend"
}
```

The `--repo` flag will be automatically added to all CCG commands.

## Status Bar

When `codeguardian.showStatusBar` is enabled, you'll see a status indicator in the VS Code status bar:

- `$(shield) CCG: Ready` - CCG is initialized and ready
- `$(info) CCG: Not initialized` - Run "Initialize Project" to get started
- `$(sync~spin) CCG: [action]...` - An operation is in progress
- `$(warning) CCG: No workspace` - Open a workspace folder first

Click the status bar item to show the status menu with quick actions.

## Output Channel

All CCG output is logged to the "Code Guardian" output channel. Access it via:

- View > Output > Select "Code Guardian" from dropdown
- Click "Show Output" when prompted after errors

## Workflow Examples

### First-time Setup

1. Open your project folder in VS Code
2. Run `Code Guardian: Initialize Project` from the Command Palette
3. Run `Code Guardian: Run Code Optimization` to generate your first report
4. Review the hotspots and recommendations in the generated report

### Daily Usage

1. After making significant changes, run `Code Guardian: Quickstart`
2. Select "Quick Analysis" for a fast check or "Full Optimization" for detailed analysis
3. Review the report to identify areas needing attention

### CI/CD Integration

Use the CLI directly in your CI pipeline:

```yaml
- name: Run Code Guardian
  run: |
    npm install -g codeguardian-studio
    ccg init
    ccg code-optimize --report
```

Or use the official [GitHub Action](../ccg-action/):
```yaml
- uses: codeguardian/ccg-action@v1
  with:
    threshold: 70
    comment-on-pr: true
```

Then use the VS Code extension to view reports locally.

## Troubleshooting

### "CCG CLI not found"

The extension couldn't find the `ccg` command. Solutions:

1. Ensure CCG is installed: `npm install -g codeguardian-studio`
2. Update the `codeguardian.cliPath` setting to the full path
3. Restart VS Code after installing CCG globally

### "No workspace folder open"

The extension requires an open workspace folder. Open a folder via:
- File > Open Folder
- Or use `code /path/to/your/project`

### Command Fails with Exit Code

Check the "Code Guardian" output channel for detailed error messages. Common issues:

- Missing dependencies
- Invalid configuration
- File permission issues

### Reports Not Opening

1. Ensure `codeguardian.autoOpenReport` is `true`
2. Check that `docs/reports/` directory exists after optimization (this directory is gitignored by default)
3. Try running `Code Guardian: Open Latest Report` manually

## Development

### Building the Extension

```bash
cd vscode-extension
npm install
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

This creates a `.vsix` file that can be installed locally or published.

### Publishing

```bash
npm run publish
```

Requires a Personal Access Token from the VS Code Marketplace.

## Contributing

Contributions are welcome! Please see the main project's [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
