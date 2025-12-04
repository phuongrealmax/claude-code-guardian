export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Turn Claude Code into a refactor engine for your biggest repos.</h1>
          <p>
            Claude Code Guardian adds a Code Optimizer layer on top of Claude —
            scanning your repo, finding hotspots, refactoring safely and generating
            human-readable reports in one command.
          </p>
          <div className="cta-buttons">
            <a href="#get-started" className="btn btn-primary">Get Started Free</a>
            <a href="/case-study" className="btn btn-secondary">View Case Study</a>
          </div>
        </div>
      </section>

      {/* Stats from dogfooding */}
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
              <div className="stat-value">&lt;1min</div>
              <div className="stat-label">Analysis Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="container">
          <h2>What It Does</h2>
          <p className="subtitle">8 specialized tools that transform Claude Code into an intelligent refactoring assistant.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Scan & Analyze</h3>
              <p>
                Map your entire codebase in seconds. Calculate complexity, nesting,
                branch scores. Find the files that need the most attention.
              </p>
            </div>
            <div className="feature-card">
              <h3>Plan & Refactor</h3>
              <p>
                Generate step-by-step refactor plans. AI-guided changes with human
                oversight. Guard module blocks dangerous patterns.
              </p>
            </div>
            <div className="feature-card">
              <h3>Report & Track</h3>
              <p>
                Markdown reports with before/after metrics. Log sessions for team
                visibility. Auto-comment hotspots on every PR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Hotspots */}
      <section>
        <div className="container">
          <h2>Real Results</h2>
          <p className="subtitle">From our own codebase analysis (yes, we dogfood).</p>

          <table className="hotspots-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>File</th>
                <th>Score</th>
                <th>Issue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#1</td>
                <td><code>latent.service.ts</code></td>
                <td className="score-high">90</td>
                <td>866 lines, complexity 78</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>#2</td>
                <td><code>agents.service.ts</code></td>
                <td className="score-high">90</td>
                <td>845 lines, nesting 7</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>#3</td>
                <td><code>commands.service.ts</code></td>
                <td className="score-high">89</td>
                <td>781 lines, complexity 78</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>#4</td>
                <td><code>ccg.ts</code></td>
                <td className="score-high">87</td>
                <td>709 lines, nesting 6</td>
                <td>split-module</td>
              </tr>
              <tr>
                <td>#5</td>
                <td><code>http-server.ts</code></td>
                <td className="score-high">83</td>
                <td>624 lines, complexity 69</td>
                <td>split-module</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <div className="container">
          <h2>How It Works</h2>
          <p className="subtitle">From install to insights in 4 steps.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>1. Install</h3>
              <div className="code-block">
                npm install -g @anthropic-community/claude-code-guardian<br/>
                ccg init
              </div>
            </div>
            <div className="feature-card">
              <h3>2. Analyze</h3>
              <div className="code-block">
                ccg code-optimize --report
              </div>
            </div>
            <div className="feature-card">
              <h3>3. Review</h3>
              <p>Open the generated report. See hotspots, metrics, and recommendations.</p>
            </div>
            <div className="feature-card">
              <h3>4. Refactor</h3>
              <p>Use Claude Code to apply safe, incremental improvements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="container">
          <h2>Pricing</h2>
          <p className="subtitle">Start free. Scale when ready.</p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Dev</h3>
              <div className="price">Free</div>
              <p>For solo devs & side projects</p>
              <ul>
                <li>All core MCP tools</li>
                <li>Code Optimizer (8 tools)</li>
                <li>CLI & basic reports</li>
                <li>GitHub Actions template</li>
                <li>Community support</li>
              </ul>
              <a href="#get-started" className="btn btn-secondary">Get Started</a>
            </div>

            <div className="pricing-card featured">
              <h3>Team</h3>
              <div className="price">$39<span style={{fontSize: '1rem', color: '#888'}}>/mo</span></div>
              <p>For product teams & agencies</p>
              <ul>
                <li>Everything in Dev</li>
                <li>Report dashboard</li>
                <li>Multi-repo (up to 20)</li>
                <li>PR hotspot comments</li>
                <li>Email support</li>
              </ul>
              <a href="#contact" className="btn btn-primary">Start Trial</a>
            </div>

            <div className="pricing-card">
              <h3>Enterprise</h3>
              <div className="price">Custom</div>
              <p>For large orgs & compliance</p>
              <ul>
                <li>Everything in Team</li>
                <li>Unlimited repos</li>
                <li>Self-hosted option</li>
                <li>SSO / SAML</li>
                <li>Dedicated support + SLA</li>
              </ul>
              <a href="#contact" className="btn btn-secondary">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started */}
      <section id="get-started">
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Ready to clean up your codebase?</h2>
          <div className="code-block" style={{display: 'inline-block', textAlign: 'left'}}>
            npm install -g @anthropic-community/claude-code-guardian<br/>
            ccg init<br/>
            ccg code-optimize --report
          </div>
          <div style={{marginTop: '32px'}}>
            <a href="https://github.com/anthropic-community/claude-code-guardian" className="btn btn-primary">
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
            <a href="https://github.com/anthropic-community/claude-code-guardian">GitHub</a>
            {' • '}
            <a href="https://npmjs.com/package/@anthropic-community/claude-code-guardian">npm</a>
            {' • '}
            <a href="/case-study">Case Study</a>
            {' • '}
            <a href="/partners">Partners</a>
          </p>
          <p style={{marginTop: '24px', fontSize: '0.875rem'}}>
            Built with Claude. Protected by Guardian.
          </p>
        </div>
      </footer>
    </main>
  )
}
