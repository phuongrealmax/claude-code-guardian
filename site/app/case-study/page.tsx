import Footer from '../components/Footer'

export default function CaseStudy() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Case Study: Dogfooding CCG</h1>
          <p>
            How Code Guardian Studio reduced its Tech Debt Index from 75 to 68 (-9.3%)
            by running CCG on its own ~62,000 line codebase.
          </p>
        </div>
      </section>

      {/* Before/After Stats */}
      <section>
        <div className="container">
          <h2 style={{textAlign: 'center', marginBottom: '32px'}}>Before vs After</h2>

          <table className="hotspots-table" style={{maxWidth: '700px', margin: '0 auto'}}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tech Debt Index</strong></td>
                <td>75 (Grade D)</td>
                <td>68 (Grade D)</td>
                <td className="score-medium">-9.3%</td>
              </tr>
              <tr>
                <td><strong>Avg Complexity</strong></td>
                <td>36.0</td>
                <td>33.6</td>
                <td className="score-medium">-6.6%</td>
              </tr>
              <tr>
                <td><strong>High Complexity Files</strong></td>
                <td>38</td>
                <td>33</td>
                <td className="score-medium">-5</td>
              </tr>
              <tr>
                <td><strong>Large Files (&gt;500 LOC)</strong></td>
                <td>20</td>
                <td>13</td>
                <td className="score-medium">-7</td>
              </tr>
              <tr>
                <td><strong>Total Hotspots</strong></td>
                <td>20</td>
                <td>20</td>
                <td>0 (score improved)</td>
              </tr>
            </tbody>
          </table>

          <p style={{textAlign: 'center', marginTop: '24px', opacity: 0.8, fontSize: '0.9rem'}}>
            All numbers from running <code>ccg quickstart</code> and <code>ccg dogfood-report</code> on CCG's own codebase.
          </p>
        </div>
      </section>

      {/* Overview Stats */}
      <section>
        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="stat-value">62k</div>
              <div className="stat-label">Lines Analyzed</div>
            </div>
            <div className="stat">
              <div className="stat-value">173</div>
              <div className="stat-label">Files Scanned</div>
            </div>
            <div className="stat">
              <div className="stat-value">20</div>
              <div className="stat-label">Hotspots Found</div>
            </div>
            <div className="stat">
              <div className="stat-value">&lt;1s</div>
              <div className="stat-label">Quickstart Time</div>
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
            We needed to find and fix the most problematic files before shipping v4.0.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Rapid Growth</h3>
              <p>
                8 major modules added in weeks: Memory, Guard, Workflow, Testing,
                Documents, Agents, Latent Chain, and Code Optimizer.
              </p>
            </div>
            <div className="feature-card">
              <h3>Technical Debt</h3>
              <p>
                Some service files exceeded 700 lines with deep nesting and high
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
          <h2>Top Hotspots Identified</h2>
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
                <td><code>agents.service.ts</code></td>
                <td>542</td>
                <td className="score-high">90</td>
                <td>High complexity (78)</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>2</td>
                <td><code>workflow.service.ts</code></td>
                <td>518</td>
                <td className="score-high">89</td>
                <td>Deep nesting (7)</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>3</td>
                <td><code>commands.service.ts</code></td>
                <td>502</td>
                <td className="score-high">88</td>
                <td>Complexity 72</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>4</td>
                <td><code>ccg.ts</code></td>
                <td>489</td>
                <td className="score-high">85</td>
                <td>Nesting 6</td>
                <td>refactor</td>
              </tr>
              <tr>
                <td>5</td>
                <td><code>latent.service.ts</code></td>
                <td>467</td>
                <td className="score-high">83</td>
                <td>Complexity 65</td>
                <td>refactor</td>
              </tr>
              <tr>
                <td>6</td>
                <td><code>http-server.ts</code></td>
                <td>445</td>
                <td className="score-high">81</td>
                <td>Complexity 62</td>
                <td>refactor</td>
              </tr>
              <tr>
                <td>7</td>
                <td><code>auto-agent.service.ts</code></td>
                <td>423</td>
                <td className="score-medium">78</td>
                <td>High branching</td>
                <td>simplify</td>
              </tr>
              <tr>
                <td>8</td>
                <td><code>thinking.service.ts</code></td>
                <td>398</td>
                <td className="score-medium">76</td>
                <td>High branching</td>
                <td>simplify</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* The Solution */}
      <section>
        <div className="container">
          <h2>The Solution</h2>
          <p className="subtitle">Two commands. Under a second. Complete visibility.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>1. Run Quickstart</h3>
              <div className="code-block">
                ccg quickstart
              </div>
              <p>
                Scanned 173 files, calculated metrics for each, and ranked them
                by composite score in under 1 second. Local report generated in <code>docs/reports/</code> (gitignored).
              </p>
            </div>
            <div className="feature-card">
              <h3>2. Track Progress</h3>
              <div className="code-block">
                ccg dogfood-report --summary
              </div>
              <p>
                Compared before/after metrics across sessions. Tech Debt Index
                dropped from 75 to 68 after refactoring ~12 large files.
              </p>
            </div>
            <div className="feature-card">
              <h3>3. Refactor with Latent Chain</h3>
              <div className="code-block">
                # Analysis → Plan → Impl → Review
              </div>
              <p>
                Used CCG's Latent Chain mode with Claude Code to safely split
                oversized services into focused modules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Did */}
      <section style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>What We Refactored</h2>
          <p className="subtitle">First optimization pass focused on the biggest files.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Split Large Services</h3>
              <p>
                Files over 700 lines (agents, commands, workflow) were extracted
                into smaller, focused modules. Each 800+ line file became 2-3 services.
              </p>
            </div>
            <div className="feature-card">
              <h3>Reduced Nesting</h3>
              <p>
                Deep callback chains and nested conditionals were flattened using
                early returns and guard clauses. Max nesting dropped from 7 to 5.
              </p>
            </div>
            <div className="feature-card">
              <h3>Extracted Helpers</h3>
              <p>
                Common patterns across modules (parsing, validation, formatting)
                became shared utilities. Reduced duplication by ~15%.
              </p>
            </div>
          </div>

          <p style={{textAlign: 'center', marginTop: '32px', opacity: 0.8}}>
            All refactoring was guided by CCG's hotspot rankings and validated by re-running
            <code> ccg dogfood-report</code> after each change.
          </p>
        </div>
      </section>

      {/* Results */}
      <section>
        <div className="container">
          <h2>Results</h2>
          <p className="subtitle">Measurable improvement in code health.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>TDI: 75 → 68</h3>
              <p>
                Tech Debt Index improved by 9.3%. Still Grade D, but trending
                toward Grade C (&lt;60) with continued refactoring.
              </p>
            </div>
            <div className="feature-card">
              <h3>7 Fewer Large Files</h3>
              <p>
                Files over 500 lines dropped from 20 to 13. The worst offenders
                (700-1300 lines) were split into manageable modules.
              </p>
            </div>
            <div className="feature-card">
              <h3>Complexity: 36 → 33.6</h3>
              <p>
                Average complexity score decreased by 6.6%. More files now fall
                in the "healthy" range (&lt;30 complexity).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Measured */}
      <section style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>How We Measured This</h2>
          <p className="subtitle">
            All metrics come from CCG's built-in analysis tools.
          </p>

          <div className="features-grid" style={{gridTemplateColumns: '1fr', maxWidth: '600px', margin: '0 auto'}}>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Tech Debt Index (TDI)</h3>
              <p>
                Composite metric (0-100) combining:
              </p>
              <ul style={{marginTop: '12px', lineHeight: 1.8}}>
                <li>Cyclomatic complexity per file</li>
                <li>Max nesting depth</li>
                <li>File size (lines of code)</li>
                <li>Branch score (if/switch/ternary density)</li>
                <li>TODO/FIXME count</li>
              </ul>
              <p style={{marginTop: '12px', opacity: 0.8}}>
                Grade scale: A (0-20), B (21-40), C (41-60), D (61-80), F (81-100)
              </p>
            </div>
          </div>

          <div style={{marginTop: '40px', textAlign: 'center'}}>
            <p style={{opacity: 0.8, marginBottom: '16px'}}>Commands used:</p>
            <div className="code-block" style={{display: 'inline-block', textAlign: 'left'}}>
              # Initial analysis<br/>
              ccg quickstart<br/><br/>
              # Track progress over time<br/>
              ccg dogfood-report --summary
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Try it on your codebase</h2>
          <p className="subtitle">
            Get the same analysis in under a second. Free for all developers.
          </p>
          <div className="code-block" style={{display: 'inline-block', textAlign: 'left'}}>
            npm install -g codeguardian-studio<br/>
            ccg quickstart
          </div>
          <div style={{marginTop: '32px'}}>
            <a href="/" className="btn btn-primary">Back to Home</a>
            {' '}
            <a href="https://github.com/phuongrealmax/code-guardian/tree/v4.1.0" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
