# Public Release Documentation

## Branch: `public/open-core-release`

This branch contains the public open-core release of Claude Code Guardian.

---

## What's Included (Open-Core)

| Component | Status | Description |
|-----------|--------|-------------|
| `src/` | Included | Full MCP server source |
| `docs/` | Included | User guides (QUICKSTART, USER_GUIDE, LATENT_CHAIN) |
| `packages/cloud-client/` | Included | License gateway abstraction (stub) |
| `site/` | Included | Marketing site |
| `plugins/` | Included | Plugin system |
| `.github/workflows/` | Included | Minimal CI (PR analysis) |

## What's Excluded

| Component | Reason |
|-----------|--------|
| `tests/` | Dev-only, not needed for users |
| `internal/` | Private dev materials (gitignored) |
| `.ccg/` | Session data (gitignored) |
| `dist/` | Build output (gitignored, built on demand via `npm run build`) |
| `coverage/`, `playwright-report/` | Test artifacts (gitignored) |

## What's Private (Never Tracked)

- `internal/` - Internal documentation and dev materials
- Paid backend implementation (on separate cloud infrastructure)
- Actual license verification server code

---

## Smoke Evidence

**Date**: 2025-12-15
**Session**: 795d5904-a60e-456d-9c69-56edf96dd04b

### Build Status

```
npm run build → SUCCESS (tsc completed without errors)
```

### Help Command

```
node dist/index.js --help → SUCCESS

Claude Code Guardian MCP Server

Usage: ccg-server [options]

Options:
  --resume, -r [file]    Resume from previous session
  --help, -h             Show this help message
```

### Guard Validation (Security Ruleset)

```
guard_validate ruleset=security → PASSED
- Issues: 0
- Blocked: false
- Failing rules: none
```

---

## Security Verification

1. **internal/ folder**: NOT tracked, properly ignored via .gitignore:48
2. **Paid backend code**: NOT exposed - only gateway abstraction included
3. **Secrets/API keys**: NOT hardcoded - all use environment variables
4. **License gateway**: STUB implementation only - actual verification on cloud API

---

## License Model

This release follows the **open-core model**:

- **Dev tier (free)**: Full MCP server with core modules
- **Team/Enterprise tiers**: Require license key verified via cloud API
- **Gateway abstraction**: `@ccg/cloud-client` provides offline-first caching

The actual billing and license management happens on `api.codeguardian.studio` (not included in this repo).

---

## Paid Integration Stubs

The following files contain **client-side integration stubs only** (no billing backend):

| File | Purpose | Notes |
|------|---------|-------|
| `src/modules/license/stripe.service.ts` | Stripe client stub | Reads from env vars only |
| `src/modules/license/paddle.service.ts` | Paddle client stub | Reads from env vars only |
| `packages/cloud-client/` | License gateway | STUB impl - parses key format locally |

**No billing backend code is included.** All payment processing happens on external infrastructure.

---

## Build Instructions

```bash
# Install dependencies
npm ci

# Type check (non-emitting)
npm run typecheck

# Build to dist/
npm run build

# Verify installation
node dist/index.js --help
```

Build generates `dist/` which is gitignored and built on demand.
