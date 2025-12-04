# Claude Code Guardian — Pricing

> Choose your Guardian. All plans run locally — your code never leaves your machine.

---

## Choose Your Plan

Whether you're cleaning up a side project or managing multiple client repos, there's a Claude Code Guardian plan for you.

---

## Plans & Features

| Feature | Dev (Free) | Team | Enterprise |
|---------|------------|------|------------|
| **Core MCP Tools** | | | |
| Guard Module (Security Rules) | ✅ | ✅ | ✅ |
| Memory Module (Persistent Context) | ✅ | ✅ | ✅ |
| Workflow & Task Tracking | ✅ | ✅ | ✅ |
| Process & Port Management | ✅ | ✅ | ✅ |
| Latent Chain Mode | ✅ | ✅ | ✅ |
| Agents Module | ✅ | ✅ | ✅ |
| | | | |
| **Code Optimizer** | | | |
| All 8 Optimizer Tools | ✅ | ✅ | ✅ |
| CLI `ccg code-optimize` | ✅ | ✅ | ✅ |
| Optimization Reports (.md) | Basic | Full | Full + Custom |
| GitHub Actions Template | ✅ | ✅ | ✅ |
| | | | |
| **Team Features** | | | |
| Report History Dashboard | - | ✅ | ✅ |
| Multi-repo Management | - | Up to 20 repos | Unlimited |
| PR Hotspot Comments | - | ✅ | ✅ |
| Team Workflows | - | ✅ | ✅ |
| | | | |
| **Enterprise Features** | | | |
| Custom Workflows & Policies | - | - | ✅ |
| Self-hosted / Air-gapped | - | Add-on | ✅ |
| SSO / SAML | - | - | ✅ |
| Custom Report Templates | - | - | ✅ |
| Audit Logs | - | - | ✅ |
| | | | |
| **Support** | | | |
| Community (GitHub Issues) | ✅ | ✅ | ✅ |
| Email Support | - | ✅ | ✅ |
| Dedicated Channel + SLA | - | - | ✅ |
| Onboarding & Success Check-ins | - | - | ✅ |
| | | | |
| **Pricing** | **Free** | **$XX/mo** | **Contact Us** |

---

## Plan Details

### Dev — For Solo Devs & Side Projects

**Free forever.**

Perfect if you're:
- Experimenting with Claude Code on personal projects
- Cleaning up side projects or small repos (< 50k LOC)
- Comfortable reading raw markdown reports

**Includes:**
- All core MCP modules (Guard, Memory, Agents, Latent Chain)
- Full Code Optimizer engine (8 tools)
- CLI: `ccg code-optimize`, `--report`, `--ci`, `--json`
- GitHub Actions template for basic CI checks
- Community support via GitHub Issues

**Get Started:**
```bash
npm install -g @anthropic-community/claude-code-guardian
ccg init
```

*No credit card required.*

---

### Team — For Product Teams & Agencies

**From $XX/month per seat.**

For teams who:
- Maintain 3–20 active codebases
- Need visibility into technical debt across repos
- Want reports that non-developers can understand

**Everything in Dev, plus:**
- Report history dashboard (search, filter by repo/date/status)
- Multi-repo configuration & tagging (up to 20 repos)
- Auto PR hotspot comments in GitHub/GitLab
- Team-focused workflows (code review, refactor sprints)
- Email support & onboarding guidance

**Best for:**
- Tech leads managing 3–10 developers
- Agencies maintaining client codebases
- Startups with growing technical debt

[Start Team Trial →]

---

### Enterprise — For Large Orgs & Critical Systems

**Custom pricing. Talk to us.**

For organizations that need:
- Strict security & compliance requirements
- Deep integration into existing CI/CD workflows
- Custom guardrails and refactor policies

**Everything in Team, plus:**
- Custom workflows & policies (per team / per repo group)
- Self-hosted / air-gapped deployment options
- SSO/SAML integration
- Custom report templates aligned with engineering standards
- Audit logs for compliance
- Dedicated support channel with SLAs
- Quarterly success check-ins

**Best for:**
- Teams with 20+ developers
- Multiple mission-critical services
- Regulated industries (fintech, healthcare, etc.)

[Contact Sales →]

---

## Basic vs Full Reports

| Aspect | Basic (Dev) | Full (Team/Enterprise) |
|--------|-------------|------------------------|
| Format | Local markdown files | Indexed & searchable |
| Storage | `docs/reports/` folder | CCG Dashboard |
| Search | Manual file browsing | By repo, date, tags, score |
| Sharing | Copy/paste file | Shareable links |
| History | Git history only | Full session history |
| Comparison | Manual diff | Built-in before/after |

---

## Which Plan Is Right for You?

### Choose Dev if:
- You're a solo dev or small team (1-2 people)
- You mostly analyze 1-2 repos at a time
- You're comfortable with terminal + markdown files
- You want to try CCG before committing

### Choose Team if:
- You lead a team of 3-10 developers
- You manage multiple client or product codebases
- You want to show code health reports to PMs/stakeholders
- You care about PR automation and dashboards

### Choose Enterprise if:
- You have 20+ developers across multiple squads
- You need self-hosting, SSO, or custom workflows
- You have strict security/compliance requirements
- You want dedicated support and SLAs

---

## Frequently Asked Questions

### Is my code sent to the cloud?
No. CCG runs entirely locally. Your source code stays on your machine. Only MCP tool calls go to Claude's API — the same as using Claude Code normally.

### Can I try Team features before paying?
Yes. We offer a 14-day Team trial with full features. No credit card required to start.

### What counts as a "repo" for multi-repo management?
Any directory with a `.ccg/` folder counts as one repo. Monorepos count as one repo.

### Can I upgrade or downgrade anytime?
Yes. Upgrade instantly, downgrade at the end of your billing cycle. Your reports and history are preserved.

### Do you offer discounts?
- **Open Source:** Free Team tier for qualifying OSS projects
- **Startups:** 50% off Team tier for early-stage startups (< $1M raised)
- **Education:** Free access for students and educators
- **Annual:** 2 months free on annual billing

### What payment methods do you accept?
Credit card (Visa, Mastercard, Amex) and invoicing for Enterprise contracts.

---

## Still Have Questions?

- **General:** hello@ccg.dev
- **Sales:** sales@ccg.dev
- **Partnerships:** partners@ccg.dev
- **Support:** GitHub Issues or support@ccg.dev

---

## Ready to Get Started?

### Dev (Free)
```bash
npm install -g @anthropic-community/claude-code-guardian
ccg init
ccg code-optimize --report
```

### Team
[Start 14-Day Trial →]

### Enterprise
[Contact Sales →]

---

*All plans include access to future updates and new modules.*

*Pricing effective [DATE]. Subject to change with 30-day notice for existing customers.*
