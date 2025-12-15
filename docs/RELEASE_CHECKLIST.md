# Release Checklist

Pre-release checklist for Code Guardian Studio public releases.

## Before Release

### 1. Version Bump
```bash
# Update version in package.json
npm version patch|minor|major --no-git-tag-version
```

### 2. Build & Verify
```bash
# Install dependencies and build
npm ci
npm run build

# Verify CLI works
node dist/index.js --help
```

### 3. Site Build
```bash
cd site
npm ci
npm run build
```

### 4. Code Quality
```bash
# Run guard validation
# MCP: guard_validate with ruleset: frontend
# MCP: guard_validate with ruleset: security (if applicable)

# Type check
npm run typecheck
```

### 5. Documentation Sync
```bash
# Check doc links are valid
node scripts/check-doc-links.mjs

# Regenerate tools reference (ensure no diff)
node scripts/generate-tools-docs.mjs
git diff --exit-code docs/TOOLS_REFERENCE.md
```

### 6. Create Release Tag
```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push tag
git push origin vX.Y.Z
```

### 7. Verify Marketing Links
- Check site links point to correct tag (`blob/vX.Y.Z/docs/*`)
- Update if creating new major/minor tag
- Files to check:
  - `site/app/page.tsx`
  - `site/app/components/Footer.tsx`
  - `site/app/case-study/page.tsx`

## Post-Release

- [ ] Verify tag appears on GitHub releases
- [ ] Test `npm install -g codeguardian-studio` installs correct version
- [ ] Verify documentation links resolve correctly

---

*Last updated: 2025-12-15*
