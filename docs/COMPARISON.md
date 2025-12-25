# CCG vs Competitors

How Code Guardian Studio stacks up against other AI guardrail solutions.

## Quick Comparison

| Feature | CCG | Guardrails AI | NeMo Guardrails | Semgrep MCP | Codacy |
|---------|-----|---------------|-----------------|-------------|--------|
| **MCP Tools** | 113+ | - | - | ~10 | - |
| **Code Analysis** | Yes | - | - | Security only | Yes |
| **Workflow Tracking** | Yes | - | - | - | - |
| **Session Persistence** | Yes | - | - | - | - |
| **Memory System** | Yes | - | - | - | - |
| **Progress Dashboard** | Yes | Grafana | - | - | - |
| **Language** | TypeScript | Python | Python | TypeScript | Multi |
| **Setup Complexity** | Low | Medium | High | Low | Low |
| **License** | MIT | Apache 2.0 | Apache 2.0 | Proprietary | Commercial |

---

## Detailed Comparisons

### CCG vs Guardrails AI

[Guardrails AI](https://guardrailsai.com/) is a popular Python library for LLM output validation with 6k+ GitHub stars.

| Aspect | CCG | Guardrails AI |
|--------|-----|---------------|
| **Focus** | Complete AI development workflow | LLM output validation |
| **MCP Integration** | Native (113+ tools) | None |
| **Code Metrics** | Full analysis, hotspots, complexity | None |
| **Workflow Management** | Task tracking, progress, blockers | None |
| **Session Management** | Persistent sessions with resume | None |
| **Memory** | Long-term memory across sessions | None |
| **Benchmark Index** | Planned | Available |
| **Community** | Growing | Large (100+ contributors) |
| **Language** | TypeScript/Node.js | Python |

**When to choose CCG:**
- You're using Claude Code or MCP-compatible tools
- You need code analysis beyond LLM validation
- You want integrated workflow management
- You prefer TypeScript/JavaScript ecosystem

**When to choose Guardrails AI:**
- You're in a Python-only environment
- You only need LLM output validation
- You want a large community with many validators
- You need the benchmark index for compliance

---

### CCG vs NVIDIA NeMo Guardrails

[NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) is NVIDIA's enterprise-grade solution with dialog modeling.

| Aspect | CCG | NeMo Guardrails |
|--------|-----|-----------------|
| **Focus** | Developer productivity | Enterprise dialog control |
| **Dialog Modeling** | None | Colang language |
| **MCP Integration** | Native | None |
| **Code Analysis** | Yes | None |
| **GPU Acceleration** | None | Yes (NVIDIA) |
| **Multimodal** | None | Text + Images |
| **Setup** | `npm install -g` | Complex Docker/Conda |
| **Best For** | Developers | Enterprise deployments |

**When to choose CCG:**
- You want quick setup without complex dependencies
- You need code analysis and workflow tracking
- You're using MCP-compatible tools

**When to choose NeMo:**
- You need enterprise-grade dialog control
- You have GPU infrastructure
- You need multimodal (image) support
- You want programmable conversation flows

---

### CCG vs Semgrep MCP

[Semgrep MCP](https://semgrep.dev/docs/mcp) brings Semgrep's 5000+ security rules to Claude Code.

| Aspect | CCG | Semgrep MCP |
|--------|-----|-------------|
| **Focus** | Complete development workflow | Security scanning |
| **MCP Tools** | 113+ | ~10 |
| **Security Rules** | ~30 (extensible) | 5000+ |
| **Code Metrics** | Yes (complexity, hotspots) | None |
| **Workflow Management** | Yes | None |
| **Session Persistence** | Yes | None |
| **Memory** | Yes | None |
| **Progress Dashboard** | Yes (real-time) | None |

**When to choose CCG:**
- You need comprehensive code analysis beyond security
- You want workflow and task management
- You need session persistence and memory

**When to choose Semgrep:**
- Security scanning is your primary need
- You want access to 5000+ security rules
- You only need security-focused analysis

**Best approach:** Use both! CCG and Semgrep complement each other well.

---

### CCG vs Codacy Guardrails

[Codacy Guardrails](https://www.codacy.com/guardrails) provides IDE-integrated code quality checks.

| Aspect | CCG | Codacy |
|--------|-----|--------|
| **Focus** | MCP-native development | IDE integration |
| **MCP Integration** | Native | None |
| **VSCode Extension** | Planned | Yes |
| **Auto-fix** | Some rules | Yes |
| **Pricing** | Free (MIT) | Free + Commercial tiers |
| **Best For** | MCP workflows | IDE-first development |

**When to choose CCG:**
- You're working with Claude Code or MCP tools
- You need workflow management and memory
- You want open-source flexibility

**When to choose Codacy:**
- You want seamless IDE integration now
- You prefer auto-fix suggestions
- You're not using MCP-compatible tools

---

## Feature Deep Dive

### What Makes CCG Unique

#### 1. Most Comprehensive MCP Tool Suite

CCG provides **113+ MCP tools** across 12 modules:

| Module | Tools | Purpose |
|--------|-------|---------|
| Session | 10 | Session management, resume, export |
| Memory | 5 | Persistent knowledge storage |
| Guard | 6 | Code validation rules |
| Workflow | 12 | Task tracking, progress |
| Testing | 10 | Test runner, browser testing |
| Latent Chain | 15 | Structured reasoning |
| Code Optimizer | 8 | Metrics, hotspots, refactoring |
| AutoAgent | 8 | Task decomposition, error fixing |
| Documents | 9 | Doc management, search |
| Process | 8 | Process/port management |
| Resource | 10 | Token budgeting, checkpoints |
| Progress | 4 | Real-time dashboard |

No other solution offers this breadth of functionality.

#### 2. Session Persistence & Resume

CCG maintains state across sessions:
- Automatic session saving
- Resume after disconnects/crashes
- Task context preservation
- Timeline replay for debugging

#### 3. Memory System

Long-term memory that persists:
- Store decisions, facts, code patterns
- Recall relevant information
- Learn from past errors
- Build project-specific knowledge

#### 4. Real-time Progress Dashboard

Visual workflow tracking:
- Mermaid diagram generation
- Blocker identification
- Live status updates
- WebSocket real-time sync

#### 5. Latent Chain Reasoning

Structured multi-phase reasoning:
- Analysis -> Plan -> Implementation -> Review
- Context delta tracking (KV-cache style)
- Automatic phase transitions
- Audit trail for complex tasks

---

## Migration Guides

### From Guardrails AI

If you're currently using Guardrails AI validators:

1. Install CCG: `npm install -g codeguardian-studio`
2. Use `guard_validate` for similar validation
3. Gain additional benefits: memory, workflow, code metrics

### From Semgrep

CCG complements Semgrep rather than replacing it:

1. Keep Semgrep for deep security scanning
2. Add CCG for workflow, memory, and code metrics
3. Use both MCP servers together

---

## Summary

| If you need... | Choose... |
|----------------|-----------|
| Complete MCP workflow | **CCG** |
| Python LLM validation | Guardrails AI |
| Enterprise dialog control | NeMo Guardrails |
| Deep security scanning | Semgrep MCP |
| IDE-native integration | Codacy |
| Best of all worlds | **CCG + Semgrep** |

---

## Get Started

```bash
# Install
npm install -g codeguardian-studio

# First analysis
ccg quickstart

# Configure with Claude Code
ccg doctor
```

See [Quickstart Guide](QUICKSTART.md) for detailed setup instructions.

---

## Questions?

- [GitHub Issues](https://github.com/phuongrealmax/code-guardian/issues)
- [Documentation](https://codeguardian.studio/docs)
- [User Guide](USER_GUIDE.md)
