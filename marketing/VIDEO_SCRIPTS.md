# Claude Code Guardian — Video Demo Scripts

> Shot-by-shot scripts for demo videos. Use real dogfooding data.

---

## Video 1: Short Form (60 seconds)

**Platform:** YouTube Shorts, TikTok, Instagram Reels, X Video
**Goal:** Hook → Demo → CTA

---

### SHOT LIST

| Time | Shot | Visual | Audio/Voiceover |
|------|------|--------|-----------------|
| 0:00-0:03 | HOOK | Face cam or text overlay | "I let Claude refactor a 68,000-line codebase." |
| 0:03-0:05 | TRANSITION | Quick zoom to terminal | "One command." |
| 0:05-0:12 | TERMINAL | Type & run command | `ccg code-optimize --report` (typing sound) |
| 0:12-0:18 | OUTPUT | Scan results appearing | "212 files scanned. 20 hotspots found." |
| 0:18-0:28 | HOTSPOTS | Highlight top 3 files | "Top file: 866 lines, complexity 78, nesting level 6. Score: 90." |
| 0:28-0:38 | REPORT | Open generated .md file | "And now I have a report I can share with my team." |
| 0:38-0:45 | SCROLL | Scroll through report sections | "Metrics, hotspots, recommendations — all in markdown." |
| 0:45-0:55 | FACE CAM | Back to presenter | "If you use Claude Code and your repo is getting messy, try Claude Code Guardian." |
| 0:55-1:00 | END CARD | Logo + link | "Link in bio / description." |

---

### SCRIPT (Full Voiceover)

```
[0:00] I let Claude refactor a 68,000-line codebase.

[0:03] One command.

[0:05] (typing) ccg code-optimize --report

[0:12] 212 files scanned. 20 hotspots found in under a minute.

[0:18] This file here — 866 lines, complexity score 78, nesting level 6.
       The tool scored it 90 out of 100. That's... not good.

[0:28] But now I have a report.

[0:32] Metrics before and after. Top hotspots with reasons.
       Recommended next steps.

[0:38] All in markdown. Drop it in your PR, share with your team,
       or use it to justify that refactor sprint you've been asking for.

[0:45] If you're using Claude Code and your codebase is more than
       10k lines, you should try Claude Code Guardian.

[0:55] Link in bio.
```

---

### B-ROLL SUGGESTIONS

- Terminal with colorful output (chalk colors)
- VSCode with large file open (show line count)
- Generated report with tables
- GitHub PR with hotspot comment

---

## Video 2: Long Form (8-10 minutes)

**Platform:** YouTube, Landing Page Embed
**Goal:** Full demo + education + trust building

---

### OUTLINE

| Section | Duration | Content |
|---------|----------|---------|
| 1. INTRO | 0:00-1:00 | Hook + what we'll cover |
| 2. THE PROBLEM | 1:00-2:00 | Technical debt reality |
| 3. WHAT IS CCG | 2:00-3:00 | Overview of the tool |
| 4. INSTALLATION | 3:00-4:00 | npm install + ccg init |
| 5. DEMO: ANALYSIS | 4:00-6:00 | Run code-optimize, show output |
| 6. DEMO: REPORT | 6:00-7:30 | Walk through generated report |
| 7. CI INTEGRATION | 7:30-8:30 | GitHub Actions setup |
| 8. CONCLUSION | 8:30-9:30 | Recap + CTA |

---

### DETAILED SCRIPT

#### SECTION 1: INTRO (0:00-1:00)

**[FACE CAM]**

```
Hey, I'm [Name].

Today I'm going to show you how I used Claude Code Guardian
to analyze a 68,000-line TypeScript codebase — and found
20 files that desperately need refactoring.

The best part? It took less than a minute.

By the end of this video, you'll know:
- What Claude Code Guardian is
- How to install it
- How to run a code optimization analysis
- And how to set it up in your CI pipeline

Let's get into it.
```

---

#### SECTION 2: THE PROBLEM (1:00-2:00)

**[SCREEN: Show messy code / large file]**

```
If you've worked on any codebase for more than a year,
you know what technical debt looks like.

Files that started at 200 lines and somehow grew to 800.
Nesting so deep you need a map to navigate.
TODOs that have been there since 2019.

The problem is: you know it's bad, but you don't know
WHERE to start fixing it.

That's where Claude Code Guardian comes in.
```

---

#### SECTION 3: WHAT IS CCG (2:00-3:00)

**[SCREEN: Architecture diagram or logo]**

```
Claude Code Guardian is an MCP — a Model Context Protocol server —
that connects to Claude Code.

It adds a layer of tools that Claude can use to:
- Scan your codebase for complexity
- Find "hotspots" — files that need the most attention
- Generate refactor plans
- And produce reports you can actually share with your team

Today we're focusing on the Code Optimizer module,
which has 8 specialized tools for finding and fixing tech debt.
```

---

#### SECTION 4: INSTALLATION (3:00-4:00)

**[SCREEN: Terminal]**

```
Installation is simple.

First, install CCG globally:
```

**[TYPE]**
```bash
npm install -g @anthropic-community/claude-code-guardian
```

```
Then initialize it in your project:
```

**[TYPE]**
```bash
ccg init
```

```
This creates a .ccg folder with your configuration,
sets up hooks for Claude Code,
and registers the MCP server.

That's it. Now Claude Code has access to all the Guardian tools.
```

---

#### SECTION 5: DEMO - ANALYSIS (4:00-6:00)

**[SCREEN: Terminal in project directory]**

```
Alright, let's run the analysis.

I'm in the Claude Code Guardian repo itself.
This is a real TypeScript project with about 68,000 lines of code.

Let's see what the Code Optimizer finds.
```

**[TYPE]**
```bash
ccg code-optimize --report --strategy mixed --max-hotspots 10
```

**[WAIT FOR OUTPUT]**

```
Okay, look at this.

SCAN RESULTS:
- 212 files scanned
- About 68,000 lines of code

METRICS:
- 142 source files analyzed
- Average complexity: 35.4
- 12 TODOs, 5 FIXMEs

HOTSPOTS:
- 20 hotspots found
- Top reason: "Very high complexity"

And here are the top 5:

Number 1: latent.service.ts
- Score 90
- 866 lines
- Complexity 78
- Nesting level 6
- Suggested action: split-module

Number 2: agents.service.ts
- Score 90
- 845 lines
- Complexity 81
- Nesting level 7

You get the idea. These are the files I should focus on first.
```

---

#### SECTION 6: DEMO - REPORT (6:00-7:30)

**[SCREEN: Open generated markdown file]**

```
Now let's look at the report it generated.
```

**[OPEN FILE: docs/reports/optimization-*.md]**

```
This is a Guardian Optimization Report.

At the top, we have the overview:
- Session ID
- Repository name
- Strategy used
- Date

Then the metrics section:
- Total files, lines of code
- Average complexity
- TODO and FIXME counts

Here's the hotspots table.
Each file is ranked by score, with:
- The reasons it was flagged
- A suggested goal: refactor, split-module, add-tests, etc.

Scroll down and we have...
- Files changed (if we made any modifications)
- Test results
- And recommended next steps

This whole report is markdown.
You can drop it in a GitHub issue,
add it to your documentation,
or use it in a sprint planning meeting.

No more "we should clean up the code someday."
Now you have data.
```

---

#### SECTION 7: CI INTEGRATION (7:30-8:30)

**[SCREEN: GitHub Actions YAML]**

```
One more thing — you can add this to your CI pipeline.

Here's a GitHub Actions job:
```

**[SHOW YAML]**
```yaml
code-optimize:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm install -g @anthropic-community/claude-code-guardian
    - run: ccg init --profile minimal
    - run: ccg code-optimize --ci --threshold 70
```

```
The --ci flag makes it exit with an error code
if any hotspot scores above the threshold.

So if someone tries to merge code that makes
the tech debt worse, the build fails.

You can also have it comment the hotspots table
directly on the PR. Super useful for code reviews.
```

---

#### SECTION 8: CONCLUSION (8:30-9:30)

**[FACE CAM]**

```
That's Claude Code Guardian's Code Optimizer.

To recap:
- One command to scan your entire codebase
- Finds the files that need the most attention
- Generates reports you can share
- Integrates with CI to prevent new tech debt

If you're using Claude Code and your codebase
is more than 10,000 lines, give this a try.

Link in the description.

And if you found this useful, like and subscribe.
I'll be doing more videos on AI-assisted development.

Thanks for watching, and I'll see you in the next one.
```

**[END CARD: Logo, links, subscribe button]**

---

## Thumbnail Ideas

### Short Video
- Split screen: messy code (red) vs clean report (green)
- Text: "68k LOC → 1 command"
- Your face with surprised expression

### Long Video
- Terminal with hotspots table
- Text: "I Found 20 Problems in My Code (in 1 minute)"
- Red arrows pointing to high scores

---

## Production Notes

### Equipment Needed
- Screen recording: OBS, Loom, or ScreenFlow
- Mic: Any decent USB mic (Blue Yeti, Rode NT-USB)
- Webcam: Optional but recommended for face cam segments

### Editing Tips
- Use 1.2-1.5x speed for typing segments
- Add sound effects for terminal output
- Highlight hotspot scores with zoom/glow
- Use chapters for long video

### Captions
- Add auto-captions (most viewers watch muted)
- Highlight key numbers: 68k, 212, 20, 90

---

## Real Data Reference (from dogfooding)

Use these exact numbers for authenticity:

| Metric | Value |
|--------|-------|
| Total Files | 212 |
| Lines of Code | ~68,000 |
| Source Files Analyzed | 142 |
| Average Complexity | 35.42 |
| Hotspots Found | 20 |
| Top File | latent.service.ts |
| Top Score | 90 |
| Top File Lines | 866 |
| Top Nesting | 7 (agents.service.ts) |

Top 3 Hotspots:
1. `latent.service.ts` — 90 — 866 lines — split-module
2. `agents.service.ts` — 90 — 845 lines — split-module
3. `commands.service.ts` — 89 — 781 lines — split-module

---

*Scripts generated using CCG dogfooding data.*
*Session: video-scripts*
*Date: 2025-12-04*
