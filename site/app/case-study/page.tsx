export default function CaseStudy() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Case Study: Dogfooding CCG</h1>
          <p>
            How Claude Code Guardian analyzed itself — 68,000 lines of code,
            212 files, 20 hotspots identified in under 1 minute.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="stat-value">68k</div>
              <div className="stat-label">Lines Analyzed</div>
            </div>
            <div className="stat">
              <div className="stat-value">212</div>
              <div className="stat-label">Files Scanned</div>
            </div>
            <div className="stat">
              <div className="stat-value">20</div>
              <div className="stat-label">Hotspots Found</div>
            </div>
            <div className="stat">
              <div className="stat-value">35.4</div>
              <div className="stat-label">Avg Complexity</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section>
        <div className="container">
          <h2>The Challenge</h2>
          <p className="subtitle">
            CCG grew from a simple MCP server to a full enterprise toolkit with 70+ tools.
            We needed to find and fix the most problematic files before shipping v3.1.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Rapid Growth</h3>
              <p>
                8 major modules added in 2 weeks: Memory, Guard, Workflow, Testing,
                Documents, Agents, Latent Chain, and Code Optimizer.
              </p>
            </div>
            <div className="feature-card">
              <h3>Technical Debt</h3>
              <p>
                Some service files exceeded 800 lines with deep nesting and high
                cyclomatic complexity. Manual review would take days.
              </p>
            </div>
            <div className="feature-card">
              <h3>Time Pressure</h3>
              <p>
                We needed actionable insights fast — which files to split,
                which patterns to refactor, and in what order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Hotspots */}
      <section>
        <div className="container">
          <h2>Top 10 Hotspots Identified</h2>
          <p className="subtitle">
            CCG's Code Optimizer ranked every file by complexity, nesting depth, and size.
          </p>

          <table className="hotspots-table">
            <thead>
              <tr>
                <th>#</th>
                <th>File</th>
                <th>Lines</th>
                <th>Score</th>
                <th>Issue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><code>latent.service.ts</code></td>
                <td>866</td>
                <td className="score-high">90</td>
                <td>High complexity (78)</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>2</td>
                <td><code>agents.service.ts</code></td>
                <td>845</td>
                <td className="score-high">90</td>
                <td>Deep nesting (7)</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>3</td>
                <td><code>commands.service.ts</code></td>
                <td>781</td>
                <td className="score-high">89</td>
                <td>Complexity 78</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>4</td>
                <td><code>ccg.ts</code></td>
                <td>709</td>
                <td className="score-high">87</td>
                <td>Nesting 6</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>5</td>
                <td><code>http-server.ts</code></td>
                <td>624</td>
                <td className="score-high">83</td>
                <td>Complexity 69</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>6</td>
                <td><code>auto-agent.service.ts</code></td>
                <td>598</td>
                <td className="score-high">81</td>
                <td>Complexity 65</td>
                <td>refactor</td>
              </tr>
              <tr>
                <td>7</td>
                <td><code>thinking.service.ts</code></td>
                <td>567</td>
                <td className="score-medium">78</td>
                <td>High branching</td>
                <td>simplify</td>
              </tr>
              <tr>
                <td>8</td>
                <td><code>code-optimizer.service.ts</code></td>
                <td>534</td>
                <td className="score-medium">76</td>
                <td>Nesting 5</td>
                <td>refactor</td>
              </tr>
              <tr>
                <td>9</td>
                <td><code>memory.service.ts</code></td>
                <td>489</td>
                <td className="score-medium">72</td>
                <td>Complexity 58</td>
                <td>add-tests</td>
              </tr>
              <tr>
                <td>10</td>
                <td><code>workflow.service.ts</code></td>
                <td>456</td>
                <td className="score-medium">70</td>
                <td>Complexity 54</td>
                <td>add-tests</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* The Solution */}
      <section>
        <div className="container">
          <h2>The Solution</h2>
          <p className="subtitle">Three commands. One minute. Complete visibility.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>1. Quick Analysis</h3>
              <div className="code-block">
                ccg code-optimize --quick
              </div>
              <p>
                Scanned 212 files, calculated metrics for each, and ranked them
                by composite score in 47 seconds.
              </p>
            </div>
            <div className="feature-card">
              <h3>2. Generate Report</h3>
              <div className="code-block">
                ccg code-optimize --report
              </div>
              <p>
                Created a Markdown report with hotspots table, before/after metrics,
                and recommended refactor steps.
              </p>
            </div>
            <div className="feature-card">
              <h3>3. Refactor Plan</h3>
              <div className="code-block">
                ccg code-optimize --plan
              </div>
              <p>
                Generated a step-by-step refactor plan compatible with Latent Chain
                for safe, incremental changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section>
        <div className="container">
          <h2>Results</h2>
          <p className="subtitle">What we learned from analyzing ourselves.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>5 Files Need Splitting</h3>
              <p>
                Files over 700 lines with complexity &gt;70 were flagged for
                module extraction. Each will become 2-3 focused services.
              </p>
            </div>
            <div className="feature-card">
              <h3>3 Files Need Tests</h3>
              <p>
                Medium-complexity files without test coverage were prioritized
                for unit test generation before any refactoring.
              </p>
            </div>
            <div className="feature-card">
              <h3>Avg Complexity: 35.4</h3>
              <p>
                Healthy baseline for a growing codebase. Target is &lt;30 after
                completing the refactor plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Try it on your codebase</h2>
          <p className="subtitle">
            Get the same analysis in under a minute. Free for solo devs.
          </p>
          <div className="code-block" style={{display: 'inline-block', textAlign: 'left'}}>
            npm install -g @anthropic-community/claude-code-guardian<br/>
            ccg init<br/>
            ccg code-optimize --report
          </div>
          <div style={{marginTop: '32px'}}>
            <a href="/" className="btn btn-primary">Back to Home</a>
            {' '}
            <a href="https://github.com/anthropic-community/claude-code-guardian" className="btn btn-secondary">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <p>
            <strong>Claude Code Guardian</strong> — Enterprise-grade guardrails for AI-assisted development.
          </p>
          <p style={{marginTop: '16px'}}>
            <a href="/">Home</a>
            {' • '}
            <a href="/partners">Partners</a>
            {' • '}
            <a href="https://github.com/anthropic-community/claude-code-guardian">GitHub</a>
          </p>
        </div>
      </footer>
    </main>
  )
}
