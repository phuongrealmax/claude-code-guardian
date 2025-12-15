# Changelog

All notable changes to Claude Code Guardian will be documented in this file.

## [4.0.0] - 2025-12-15

### Added
- **Latent Chain Mode**: Structured reasoning with analysis/plan/impl/review phases
- **Code Optimizer Module**: Repository scanning, metrics, hotspot detection
- **Auto-Agent Module**: Task decomposition, tool routing, fix loops
- **Session Persistence**: Auto-save/restore across conversations
- **Checkpoint Diff**: Compare changes between checkpoints
- **Thinking Module**: Structured reasoning models and workflows
- **RAG Module**: Semantic code search with BM25 + embeddings

### Improved
- Guard validation with rulesets (frontend, backend, security, testing)
- Resource management with token budget governor
- Workflow task management with priorities and notes
- Browser testing with Playwright integration

### Security
- Enhanced code validation rules
- License gateway abstraction for open-core model

## [3.0.0] - 2025-11-01

### Added
- Memory module with persistent storage
- Document registry and search
- Process management with port checking
- Multi-agent coordination

## [2.0.0] - 2025-09-15

### Added
- Initial MCP server implementation
- Guard module for code validation
- Workflow task tracking
- Testing integration

---
For detailed documentation, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
