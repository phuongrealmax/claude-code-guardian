# Claude Code Guardian — Affiliate Kit v1

> Everything you need to promote CCG and earn commissions.

---

## Program Overview

| Detail | Value |
|--------|-------|
| **Commission** | 30-40% recurring (12 months) |
| **Cookie Window** | 90 days |
| **Payout** | Monthly, $50 minimum |
| **Tracking** | Unique affiliate link |

### Partner Benefits
- Free Team license (3 seats) for active affiliates
- Early access to new features
- Co-marketing opportunities
- Featured on partners page

---

## Quick Links

- **Affiliate Dashboard:** [link]
- **Get Your Link:** [link]
- **Brand Assets:** [link]
- **Support:** partners@ccg.dev

---

## Content Hooks (3 Proven Angles)

Use these hooks to capture attention:

### Hook 1: The Lazy Refactor
> "I let Claude refactor a 50k LOC repo for me. Here's what it found."

**Why it works:** Curiosity + specific number + AI doing the work

### Hook 2: The Tech Debt Killer
> "This one MCP tool turned Claude Code into a technical-debt killer."

**Why it works:** Transformation + specific tool category + strong outcome

### Hook 3: The One Command
> "One command that finds the smelliest files in your repo."

**Why it works:** Simplicity + relatable pain (code smell) + immediate value

---

## Email Templates

### Email 1: Introduction (Cold/Warm)

**Subject:** Found something for your [monorepo/legacy codebase/tech debt]

---

Hey [Name],

Been using Claude Code lately? I found something that makes it 10x more useful for big codebases.

It's called **Claude Code Guardian** — an MCP that adds a Code Optimizer layer to Claude.

What it does:
- Scans your entire repo and finds "hotspots" (messy files)
- Generates a refactor plan with priorities
- Outputs a markdown report you can share with your team

I ran it on a 68k LOC TypeScript project. Found 20 hotspots in under a minute. The #1 file was 866 lines with nesting level 8. Classic.

If you're dealing with technical debt, give it a shot:

```bash
npm install -g @anthropic-community/claude-code-guardian
ccg init
ccg code-optimize --report
```

[Your affiliate link]

Let me know if you try it — curious what it finds in your codebase.

[Your name]

---

### Email 2: Case Study Follow-up

**Subject:** The 866-line file that CCG found (case study)

---

Hey [Name],

Remember that Code Optimizer I mentioned?

I wrote up a quick case study of using it on a real project (68k lines of TypeScript).

**Key findings:**
- 7 files with "critical" scores (> 80)
- Main issue: service files grew too large
- Top recommendation: split into focused modules

The full breakdown: [link to case study]

What surprised me: it even found issues in its *own* codebase (yes, I analyzed CCG with CCG).

If you want to try it on your repo:
[Your affiliate link]

Takes about 2 minutes to set up.

[Your name]

---

### Email 3: CI/CD Angle

**Subject:** Add this to your GitHub Actions (code quality check)

---

Hey [Name],

Quick one — if you use GitHub Actions, you can add automatic code quality checks with CCG.

Just add this job:

```yaml
code-optimize:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm install -g @anthropic-community/claude-code-guardian
    - run: ccg init --profile minimal
    - run: ccg code-optimize --ci --threshold 70
```

Now every PR gets checked for hotspots. If any file scores above 70, the build fails.

You can also auto-comment the hotspot table on PRs. Pretty slick for code reviews.

Full setup: [Your affiliate link]

[Your name]

---

## Social Media Posts

### Twitter/X Posts

**Post 1: Discovery**
```
Just found an MCP that turns Claude Code into a refactor engine.

One command:
$ ccg code-optimize --report

→ Scans your whole repo
→ Finds the messiest files
→ Generates a markdown report

Ran it on 68k LOC. Found 20 hotspots in 45 seconds.

[screenshot of hotspots table]

[link]
```

**Post 2: Specific Result**
```
Claude Code Guardian just found a file in my repo:
- 866 lines
- Nesting level 8
- Complexity score 78

Suggested action: "split-module"

Yeah, I knew it was bad. Didn't know it was THAT bad.

[link]
```

**Post 3: CI Integration**
```
TIL you can fail CI builds if code complexity gets too high.

$ ccg code-optimize --ci --threshold 70

Add to GitHub Actions.
Now no PR lands with a "critical" hotspot.

Tech debt prevention at the source.

[link]
```

---

### LinkedIn Posts

**Post 1: Professional Angle**
```
If you're a tech lead dealing with legacy code, this might help.

I've been testing Claude Code Guardian — an MCP that adds code analysis to Claude Code.

What it does:
→ Scans your codebase (any size)
→ Calculates complexity, nesting, branch scores
→ Ranks files by "refactor priority"
→ Generates reports for stakeholders

Ran it on a 68k LOC TypeScript project:
• 212 files scanned
• 20 hotspots identified
• Top file: 866 lines, complexity 78

The output is a markdown report you can share with your team to justify refactoring time.

If you're using Claude Code and your repo is > 10k LOC, worth checking out.

[link]

#TechnicalDebt #CodeQuality #AI #DeveloperTools
```

**Post 2: Agency/Consultant Angle**
```
For agencies maintaining multiple client codebases:

Claude Code Guardian's Code Optimizer might save you hours.

Before taking on a new client's codebase:
1. Run: ccg code-optimize --json
2. Get instant health check
3. Quote accurately based on actual complexity

For existing clients:
1. Generate monthly "Code Health Reports"
2. Show value beyond feature delivery
3. Justify maintenance budgets with data

The reports are markdown — drop into Notion, GitHub, or your client portal.

[link]
```

---

### YouTube/Video Scripts

**Script 1: Short (60 seconds)**

```
[Screen: Terminal]

"Let me show you the fastest way to find technical debt in any repo."

[Type command]
$ ccg code-optimize

[Output appears]
"In 45 seconds, it scanned 212 files and found 20 hotspots."

[Highlight top result]
"This file here — 866 lines, complexity 78, nesting level 8. That's... not great."

[Type command]
$ ccg code-optimize --report

[Show generated markdown]
"And now I have a report I can share with my team."

[Face cam]
"Link in description. It's called Claude Code Guardian."

[End screen]
```

**Script 2: Long (5-10 minutes)**

```
INTRO (30 sec)
"Your codebase is growing. Your technical debt is growing faster. Today I'll show you how to use Claude Code to automatically find and fix the messiest parts of your code."

WHAT IS CCG (1 min)
"Claude Code Guardian is an MCP — a plugin for Claude Code — that adds code analysis tools. The Code Optimizer module specifically is what we'll use today."

DEMO: INSTALLATION (1 min)
[Terminal]
$ npm install -g @anthropic-community/claude-code-guardian
$ ccg init
"That's it. CCG is now connected to Claude Code."

DEMO: ANALYSIS (2 min)
$ ccg code-optimize
[Walk through output]
- Files scanned
- Hotspots found
- Top reasons

DEMO: REPORT (2 min)
$ ccg code-optimize --report
[Open generated markdown]
- Overview section
- Hotspots table
- Metrics
- Recommendations

DEMO: CI INTEGRATION (2 min)
[Show GitHub Actions YAML]
"Now every PR gets checked automatically."

REAL CASE STUDY (2 min)
[Show CCG analyzing itself]
"I ran CCG on its own codebase. Here's what it found..."

CONCLUSION (30 sec)
"If you're dealing with a large codebase and want Claude to help you refactor safely, check out Claude Code Guardian. Link below."
```

---

## Graphics & Assets

### Screenshots to Capture

1. **Terminal Output** — `ccg code-optimize` with colorful hotspots
2. **Report Preview** — Markdown file with metrics table
3. **GitHub PR Comment** — Hotspots table on a PR
4. **Before/After** — Complexity scores before and after refactor

### Brand Colors
- Primary: `#6366F1` (Indigo)
- Secondary: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)

### Logo Usage
- Use official CCG logo
- Minimum size: 32px height
- Clear space: 8px all sides

---

## FAQ for Partners

### Q: How do I track my referrals?
A: Use your unique affiliate link. All clicks and conversions are tracked in your dashboard.

### Q: When do I get paid?
A: Monthly payouts via PayPal or Stripe, $50 minimum balance.

### Q: Can I create my own content?
A: Absolutely. Use these templates as starting points. Original content performs best.

### Q: What if someone uses my link but buys later?
A: 90-day cookie window. If they buy within 90 days, you get credit.

### Q: Can I promote on YouTube/TikTok/Twitter?
A: Yes, all platforms welcome. Just follow FTC disclosure guidelines.

---

## Disclosure Requirements

**FTC Compliance:** Always disclose affiliate relationships.

**Example disclosures:**
- "This post contains affiliate links."
- "I may earn a commission if you purchase through my link."
- "Sponsored by Claude Code Guardian" (if paid placement)

---

## Support

**Partner Support:** partners@ccg.dev
**Technical Questions:** GitHub Issues
**Feature Requests:** GitHub Discussions

---

## Ready to Start?

1. Sign up at [affiliate portal link]
2. Get your unique link
3. Use these templates
4. Earn 30-40% on every sale

Welcome to the CCG partner program!
