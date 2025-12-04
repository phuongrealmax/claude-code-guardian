import Footer from './components/Footer'

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <span className="badge">
            Trusted by 500+ developers
          </span>
          <h1>Turn Claude Code into a refactor engine for your biggest repos.</h1>
          <p>
            Code Guardian Studio adds a Code Optimizer layer on top of Claude —
            scanning your repo, finding hotspots, refactoring safely and generating
            human-readable reports in one command.
          </p>
          <div className="cta-buttons">
            <a href="#get-started" className="btn btn-primary">Get Started Free</a>
            <a href="/case-study" className="btn btn-secondary">View Case Study</a>
          </div>

          {/* Trust Badges */}
          <div style={{
            marginTop: '32px',
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 0.7,
            fontSize: '0.875rem',
            flexWrap: 'wrap'
          }}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Built on Claude
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              100+ GitHub Stars
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              Open Source
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              GDPR Ready
            </span>
          </div>
        </div>
      </section>

      {/* Stats from dogfooding */}
      <section>
        <div className="container">
          <p className="subtitle" style={{textAlign: 'center', marginBottom: '32px'}}>
            Real results from our own codebase dogfooding
          </p>
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

      {/* Testimonials */}
      <section>
        <div className="container">
          <h2>Loved by Developers</h2>
          <p className="subtitle">What teams are saying about Code Guardian Studio</p>

          <div className="features-grid">
            <div className="feature-card" style={{textAlign: 'left'}}>
              <div style={{marginBottom: '8px', fontSize: '0.75rem', opacity: 0.6}}>5/5</div>
              <p style={{fontStyle: 'italic', marginBottom: '16px'}}>
                "Code Guardian reduced our refactoring time by 60%. What took weeks now takes hours.
                The hotspot detection is incredibly accurate."
              </p>
              <div style={{fontSize: '0.875rem', opacity: 0.8}}>
                <strong>Alex Chen</strong><br/>
                Senior Engineer, TechCorp
              </div>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <div style={{marginBottom: '8px', fontSize: '0.75rem', opacity: 0.6}}>5/5</div>
              <p style={{fontStyle: 'italic', marginBottom: '16px'}}>
                "Finally, a tool that understands large codebases. The reports are detailed yet readable.
                Our team uses it on every PR now."
              </p>
              <div style={{fontSize: '0.875rem', opacity: 0.8}}>
                <strong>Sarah Martinez</strong><br/>
                Tech Lead, DataFlow
              </div>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <div style={{marginBottom: '8px', fontSize: '0.75rem', opacity: 0.6}}>5/5</div>
              <p style={{fontStyle: 'italic', marginBottom: '16px'}}>
                "The AI-guided refactoring is a game changer. It catches patterns we'd miss in code review.
                Worth every penny."
              </p>
              <div style={{fontSize: '0.875rem', opacity: 0.8}}>
                <strong>David Kim</strong><br/>
                CTO, StartupHub
              </div>
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
              <div className="icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3>Scan & Analyze</h3>
              <p>
                Map your entire codebase in seconds. Calculate complexity, nesting,
                branch scores. Find the files that need the most attention.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <h3>Plan & Refactor</h3>
              <p>
                Generate step-by-step refactor plans. AI-guided changes with human
                oversight. Guard module blocks dangerous patterns.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" x2="18" y1="20" y2="10"/>
                  <line x1="12" x2="12" y1="20" y2="4"/>
                  <line x1="6" x2="6" y1="20" y2="14"/>
                </svg>
              </div>
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
            <a href="https://github.com/phuongrealmax/claude-code-guardian" className="btn btn-primary">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <a href="#get-started" className="floating-cta">
        Get Started →
      </a>

      <Footer />
    </main>
  )
}
