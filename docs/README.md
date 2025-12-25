# Code Guardian Studio Documentation

Welcome to the official documentation for Code Guardian Studio (CCG) - an AI-powered code refactor engine built on Claude Code and MCP.

## Documentation

### Getting Started

| Guide | Description |
|-------|-------------|
| [Quickstart](./QUICKSTART.md) | 3-minute setup and first analysis |
| [User Guide](./USER_GUIDE.md) | Complete reference for CLI and features |
| [Claude Code Setup](./CLAUDE_CODE_SETUP.md) | MCP integration with Claude Code |

### Core Features

| Guide | Description |
|-------|-------------|
| [Session Resume](./SESSION_RESUME.md) | Resume work after disconnect/refresh |
| [Completion Gates](./COMPLETION_GATES.md) | Task completion requirements and evidence |
| [Auto-Checkpoints](./AUTO_CHECKPOINTS_AND_DIFF.md) | Automatic checkpoints and diff comparison |

### Advanced Features

| Guide | Description |
|-------|-------------|
| [Latent Chain Guide](./LATENT_CHAIN_GUIDE.md) | Multi-phase reasoning with delta updates |
| [TaskGraph Workflows](./TASKGRAPH_WORKFLOWS.md) | DAG-based task orchestration |
| [Guard Rulesets](./GUARD_RULESETS.md) | Predefined validation rule collections |
| [Testing Observability](./TESTING_OBSERVABILITY.md) | Prioritized failure output and health scores |

### Integrations

| Guide | Description |
|-------|-------------|
| [VS Code Extension](./VS_CODE_EXTENSION.md) | VS Code integration guide |
| [GitHub Action](./GITHUB_ACTION.md) | CI/CD integration for PR analysis |

### Reference

| Guide | Description |
|-------|-------------|
| [Flow and Use Cases](./FLOW_AND_USE_CASES.md) | Architecture overview and use cases |
| [Tools Reference](./TOOLS_REFERENCE.md) | Complete MCP tools reference |

## Quick Start

\`\`\`bash
# Install globally
npm install -g codeguardian-studio

# Initialize in your project
ccg init

# Analyze your codebase
ccg code-optimize --report
\`\`\`

## Links

- **Website**: [codeguardian.studio](https://codeguardian.studio)
- **GitHub**: [code-guardian](https://github.com/phuongrealmax/code-guardian)
- **npm**: [codeguardian-studio](https://www.npmjs.com/package/codeguardian-studio)
- **MCP Directory**: [mcp.so](https://mcp.so/server/code-guardian)

## Support

- **Issues**: [GitHub Issues](https://github.com/phuongrealmax/code-guardian/issues)
- **Email**: hello@codeguardian.studio
- **Twitter**: [@codeguardianstudio](https://twitter.com/codeguardianstudio)

## License

MIT License - See [LICENSE](../LICENSE) for details.

---

Built with care by developers, for developers.
