# Case Study: Claude Code Guardian Analyzes Itself

> **Dogfooding Report** — Using CCG Code Optimizer to analyze the CCG codebase.

---

## Project Overview

| Metric | Value |
|--------|-------|
| **Project** | Claude Code Guardian v3.1 |
| **Type** | MCP Server + CLI Tool |
| **Language** | TypeScript |
| **Total Files** | 212 |
| **Lines of Code** | ~67,637 |
| **Source Files Analyzed** | 142 |

---

## The Challenge

CCG grew rapidly from a simple guard module to a full-featured MCP server with 8+ modules:
- Memory, Guard, Workflow, Process, Testing, Documents
- Latent Chain Mode, Agents, Auto-Agent
- Code Optimizer (newest)
- HTTP API, CLI tools

**Question:** *Where is the technical debt hiding?*

---

## Analysis Results

### Command Used
```bash
ccg code-optimize --strategy mixed --max-hotspots 20
```

### Summary
| Metric | Value |
|--------|-------|
| Files Analyzed | 142 source files |
| Average Complexity | 35.42 |
| Hotspots Found | 20 |
| Top Issue | Very high complexity |

---

## Top 10 Hotspots

| Rank | File | Score | Issue | Suggested Action |
|------|------|-------|-------|------------------|
| #1 | `src/modules/latent/latent.service.ts` | 90 | 866 lines, complexity 78, nesting 6 | **split-module** |
| #2 | `src/modules/agents/agents.service.ts` | 90 | 845 lines, complexity 81, nesting 7 | **split-module** |
| #3 | `src/modules/commands/commands.service.ts` | 89 | 781 lines, complexity 78, nesting 6 | **split-module** |
| #4 | `src/bin/ccg.ts` | 87 | 709 lines, complexity 78, nesting 6 | **split-module** |
| #5 | `src/api/http-server.ts` | 83 | 624 lines, complexity 69, nesting 6 | **split-module** |
| #6 | `src/server.ts` | 83 | 648 lines, complexity 67, nesting 6 | **split-module** |
| #7 | `src/modules/auto-agent/task-graph.ts` | 81 | 684 lines, complexity 67, nesting 5 | **split-module** |
| #8 | `src/modules/workflow/workflow.service.ts` | 80 | 518 lines, complexity 72, nesting 6 | **simplify** |
| #9 | `src/hooks/pre-tool-call.hook.ts` | 79 | 495 lines, complexity 79, nesting 8 | **simplify** |
| #10 | `src/modules/rag/rag.service.ts` | 79 | 530 lines, complexity 64, nesting 6 | **simplify** |

---

## Key Insights

### 1. Service Files Are Too Large
**Pattern:** Most hotspots are `*.service.ts` files that have grown beyond 500 lines.

**Root Cause:** Each module started small but accumulated features without refactoring.

**Recommendation:** Extract domain logic into smaller, focused files:
```
latent.service.ts (866 lines)
  → latent-context.service.ts
  → latent-phase.service.ts
  → latent-patch.service.ts
```

### 2. Deep Nesting in Hooks
**Pattern:** `pre-tool-call.hook.ts` has nesting level 8.

**Root Cause:** Multiple nested conditionals for different tool types.

**Recommendation:** Use strategy pattern or lookup tables:
```typescript
// Before (nested)
if (tool === 'write') {
  if (context.strict) {
    if (file.endsWith('.ts')) {
      // ...
    }
  }
}

// After (flat)
const handler = toolHandlers[tool];
return handler?.(context, file) ?? defaultHandler(context, file);
```

### 3. CLI Growing Monolithic
**Pattern:** `src/bin/ccg.ts` is 709 lines with all commands in one file.

**Root Cause:** Commands added incrementally without extraction.

**Recommendation:** Split into command files:
```
src/bin/
  ccg.ts (main entry, ~100 lines)
  commands/
    init.command.ts
    status.command.ts
    doctor.command.ts
    code-optimize.command.ts
```

---

## Refactor Plan (Generated)

### Phase 1: Quick Wins (1-2 days)
- [ ] Extract CLI commands to separate files
- [ ] Flatten nested conditionals in hooks
- [ ] Add missing JSDoc to public methods

### Phase 2: Service Splitting (3-5 days)
- [ ] Split `latent.service.ts` into 3 focused services
- [ ] Split `agents.service.ts` into agent-registry + agent-coordinator
- [ ] Extract route handlers from `http-server.ts`

### Phase 3: Architecture Cleanup (1 week)
- [ ] Create shared base class for services
- [ ] Standardize error handling patterns
- [ ] Add integration tests for split modules

---

## Before/After Projection

| Metric | Before | After (Projected) | Change |
|--------|--------|-------------------|--------|
| Largest File | 866 lines | ~300 lines | -65% |
| Avg Complexity | 35.42 | ~20 | -43% |
| Files with Score > 80 | 7 | 0 | -100% |
| Max Nesting Depth | 14 | 5 | -64% |

---

## How to Reproduce

```bash
# Install CCG
npm install -g @anthropic-community/claude-code-guardian

# Clone and analyze
git clone https://github.com/anthropic-community/claude-code-guardian
cd claude-code-guardian
ccg init

# Run analysis
ccg code-optimize --report --strategy mixed

# Or use Claude Code
claude
> "Analyze this repo and show me the top 10 hotspots"
```

---

## Conclusion

CCG successfully identified its own technical debt:
- **7 files** with score > 80 (critical hotspots)
- **Primary issue:** Service files grew too large
- **Solution:** Split into focused, single-responsibility modules

This demonstrates CCG's ability to:
1. Analyze large TypeScript codebases (~68k LOC)
2. Identify actionable refactoring targets
3. Generate clear, prioritized recommendations

---

## About Claude Code Guardian

**Claude Code Guardian** is an MCP server that adds enterprise-grade guardrails to Claude Code:

- **Guard Module** — Block dangerous code patterns
- **Memory Module** — Persistent context across sessions
- **Code Optimizer** — Find and fix technical debt
- **Latent Chain Mode** — Structured AI reasoning
- **And more...**

[Get Started](https://github.com/anthropic-community/claude-code-guardian) | [Documentation](../docs) | [npm](https://npmjs.com/package/@anthropic-community/claude-code-guardian)

---

*Report generated by CCG Code Optimizer v3.1*
*Session: dogfood-ccg-v3.1*
*Date: 2025-12-04*
