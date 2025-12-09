'use client'

import Footer from './components/Footer'
import WorkflowDiagram from './components/WorkflowDiagram'
import CheckoutButton from './components/CheckoutButton'
import { useScrollAnimation } from './hooks/useScrollAnimation'

export default function Home() {
  const heroRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const statsRef = useScrollAnimation<HTMLElement>({ threshold: 0.3 })
  const personaRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const featuresRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const hotspotsRef = useScrollAnimation<HTMLElement>({ threshold: 0.3 })
  const howItWorksRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const ossRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const pricingRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const faqRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })

  return (
    <main>
      {/* Hero */}
      <section ref={heroRef} className="hero scroll-fade-in">
        <div className="container">
          <span className="badge">
            v4.0.0 — MIT Open-Core
          </span>
          <h1>Turn Claude Code into a refactor engine for your biggest repos.</h1>
          <p>
            Free, local-first. Advanced tech-debt reports when your team is ready.
          </p>
          <p style={{fontSize: '0.9rem', opacity: 0.8, marginTop: '-8px'}}>
            Dev tier runs fully offline. No license required.
          </p>
          <div className="cta-buttons">
            <a href="#get-started" className="btn btn-primary">Install via npm</a>
            <a href="https://github.com/phuongrealmax/claude-code-guardian" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">View GitHub Repo</a>
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
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              MIT Open-Core
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              100% Offline (Dev)
            </span>
          </div>
        </div>
      </section>

      {/* Stats from dogfooding */}
      <section ref={statsRef} className="scroll-fade-in">
        <div className="container">
          <p className="subtitle" style={{textAlign: 'center', marginBottom: '32px'}}>
            Real results from dogfooding CCG on itself
          </p>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">75→68</div>
              <div className="stat-label">Tech Debt Index</div>
            </div>
            <div className="stat">
              <div className="stat-value">-9.3%</div>
              <div className="stat-label">TDI Improvement</div>
            </div>
            <div className="stat">
              <div className="stat-value">62k</div>
              <div className="stat-label">Lines Analyzed</div>
            </div>
            <div className="stat">
              <div className="stat-value">&lt;1s</div>
              <div className="stat-label">Quickstart Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Real Developer Workflows */}
      <section ref={personaRef} className="scroll-fade-in" style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>Built for Real Developer Workflows</h2>
          <p className="subtitle">No JSON wrangling. No complex setup. Just results.</p>

          <div className="features-grid">
            <div className="feature-card stagger-item">
              <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>
              <h3>CLI-First, No JSON</h3>
              <p>
                You never touch raw MCP JSON. Just run <code>ccg quickstart</code> and
                use natural language with Claude. The tools handle the rest.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3>IDE-Native</h3>
              <p>
                VS Code extension shows Tech Debt Index in your status bar.
                Claude Code MCP integration means you stay in your editor.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Fast Enough for Daily Use</h3>
              <p>
                Quickstart analyzes ~100k LOC in under a second. Heavy Latent Chain
                reasoning is there when you need it, not blocking your flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - What It Does */}
      <section ref={featuresRef} className="scroll-fade-in">
        <div className="container">
          <h2>What It Does</h2>
          <p className="subtitle">Four capabilities organized by what you need and when.</p>

          <div className="features-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'}}>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem'}}>Dev — Free</span>
              <h3>Scan & Measure</h3>
              <p>
                <strong>Tech Debt Index</strong> (0-100, grade A-F) gives you one number
                for codebase health. Hotspot detection finds large files and high complexity.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem'}}>Dev — Free</span>
              <h3>Plan & Refactor with Claude</h3>
              <p>
                <strong>Latent Chain</strong> mode walks through Analysis, Plan, Impl, Review.
                Guard module blocks dangerous patterns before they ship.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: 'var(--primary)'}}>Team</span>
              <h3>Track Progress Over Time</h3>
              <p>
                Before/after metrics and <strong>TDI trend charts</strong>. Session history
                shows how your codebase improves sprint over sprint.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: 'var(--primary)'}}>Team / Enterprise</span>
              <h3>Integrate with Your Workflow</h3>
              <p>
                <strong>GitHub Action</strong> PR comments + quality gates. VS Code extension.
                Multi-repo config for monorepos. Claude Code MCP integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Hotspots */}
      <section ref={hotspotsRef} className="scroll-fade-in">
        <div className="container">
          <h2>Real Results</h2>
          <p className="subtitle">From our own codebase analysis (yes, we dogfood).</p>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full px-4 sm:px-0">
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
                    <td><code>agents.service.ts</code></td>
                    <td className="score-high">90</td>
                    <td>542 lines, complexity 78</td>
                    <td>split-module</td>
                  </tr>
                  <tr>
                    <td>#2</td>
                    <td><code>workflow.service.ts</code></td>
                    <td className="score-high">89</td>
                    <td>518 lines, nesting 7</td>
                    <td>split-module</td>
                  </tr>
                  <tr>
                    <td>#3</td>
                    <td><code>commands.service.ts</code></td>
                    <td className="score-high">88</td>
                    <td>502 lines, complexity 72</td>
                    <td>split-module</td>
                  </tr>
                  <tr>
                    <td>#4</td>
                    <td><code>ccg.ts</code></td>
                    <td className="score-high">85</td>
                    <td>489 lines, nesting 6</td>
                    <td>refactor</td>
                  </tr>
                  <tr>
                    <td>#5</td>
                    <td><code>latent.service.ts</code></td>
                    <td className="score-high">83</td>
                    <td>467 lines, complexity 65</td>
                    <td>refactor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksRef} className="scroll-fade-in">
        <div className="container">
          <h2>How It Works</h2>
          <p className="subtitle">From install to insights in 4 steps.</p>

          <div className="features-grid">
            <div className="feature-card stagger-item">
              <h3>1. Install</h3>
              <div className="code-block">
                npm install -g codeguardian-studio
              </div>
              <p style={{marginTop: '12px', fontSize: '0.875rem', opacity: 0.8}}>
                One global install. Works on any Node.js project.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <h3>2. Run Quickstart</h3>
              <div className="code-block">
                ccg quickstart
              </div>
              <p style={{marginTop: '12px', fontSize: '0.875rem', opacity: 0.8}}>
                Scans repo, finds hotspots, writes markdown report to <code>docs/reports/</code>. Works offline.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <h3>3. Review & Refactor</h3>
              <p>
                Open the report in your editor. Start with worst-grade files.
                Use Claude Code + CCG MCP tools to refactor safely with Latent Chain.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <h3>4. Track Progress (Team)</h3>
              <div className="code-block">
                ccg dogfood-report --summary
              </div>
              <p style={{marginTop: '12px', fontSize: '0.875rem', opacity: 0.8}}>
                Track TDI and hotspots over time. See trends across sessions.
              </p>
            </div>
          </div>

          <div style={{marginTop: '60px'}}>
            <h3 style={{textAlign: 'center', marginBottom: '16px', fontSize: '1.5rem'}}>
              Agent Collaboration Workflow
            </h3>
            <p className="subtitle" style={{marginBottom: '40px'}}>
              How CCG's specialized agents work together to solve complex tasks
            </p>
            <WorkflowDiagram />
          </div>
        </div>
      </section>

      {/* For Open Source Maintainers */}
      <section ref={ossRef} className="scroll-fade-in" style={{background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'}}>
        <div className="container">
          <h2>For Open Source Maintainers</h2>
          <p className="subtitle">Automate code quality checks on every pull request.</p>

          <div className="features-grid" style={{marginTop: '40px'}}>
            <div className="feature-card stagger-item" style={{background: 'rgba(255,255,255,0.05)'}}>
              <h3>Automatic PR Comments</h3>
              <p>Every PR gets a formatted comment showing top hotspots, TDI delta, and suggested fixes. No manual review needed.</p>
            </div>
            <div className="feature-card stagger-item" style={{background: 'rgba(255,255,255,0.05)'}}>
              <h3>Quality Gates</h3>
              <p>Set a TDI threshold and let CI fail on critical hotspots. Prevent complex code from being merged without review.</p>
            </div>
            <div className="feature-card stagger-item" style={{background: 'rgba(255,255,255,0.05)'}}>
              <h3>GitHub Actions Ready</h3>
              <p>Copy-paste our workflow file and start enforcing quality in minutes. Works with any Node.js project.</p>
            </div>
          </div>

          <div style={{marginTop: '40px', textAlign: 'center'}}>
            <div className="code-block" style={{display: 'inline-block', textAlign: 'left', fontSize: '0.875rem'}}>
              # .github/workflows/ccg-pr.yml<br/>
              - run: npx codeguardian-studio code-optimize --ci --threshold 70
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section ref={pricingRef} id="pricing" className="scroll-fade-in">
        <div className="container">
          <h2>Pricing</h2>
          <p className="subtitle">Start free. Scale when ready.</p>

          <div className="pricing-grid">
            <div className="pricing-card scroll-scale">
              <h3>Dev</h3>
              <div className="price">Free</div>
              <p>For solo devs & side projects</p>
              <ul>
                <li>Core CLI & hotspot detection</li>
                <li>Tech Debt Index per run</li>
                <li>Basic markdown reports</li>
                <li>GitHub Actions template</li>
                <li>Fully local, no license</li>
              </ul>
              <a href="#get-started" className="btn btn-secondary">Get Started</a>
            </div>

            <div className="pricing-card featured scroll-scale">
              <h3>Team</h3>
              <div className="price">$19<span style={{fontSize: '1rem', color: '#888'}}>/mo</span></div>
              <p>For product teams & agencies</p>
              <ul>
                <li>Everything in Dev</li>
                <li>Advanced reports (before/after)</li>
                <li>TDI trends & session history</li>
                <li>Multi-repo config</li>
                <li>PR hotspot comments</li>
                <li>VS Code extension</li>
                <li>Email support</li>
              </ul>
              <CheckoutButton tier="team" className="btn btn-primary">Start Trial</CheckoutButton>
            </div>

            <div className="pricing-card scroll-scale">
              <h3>Enterprise</h3>
              <div className="price">Custom</div>
              <p>For large orgs & compliance</p>
              <ul>
                <li>Everything in Team</li>
                <li>Unlimited repos</li>
                <li>SSO / SAML</li>
                <li>Audit logs</li>
                <li>Dedicated cloud backend</li>
                <li>SLA + dedicated support</li>
              </ul>
              <CheckoutButton tier="enterprise" className="btn btn-secondary">Contact Sales</CheckoutButton>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Why not SonarQube */}
      <section ref={faqRef} className="scroll-fade-in" style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>FAQ</h2>

          <div className="features-grid" style={{gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto'}}>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Why not just use SonarQube + Claude?</h3>
              <p style={{lineHeight: 1.8}}>
                You could! But Code Guardian Studio gives you:
              </p>
              <ul style={{marginTop: '12px', lineHeight: 2}}>
                <li><strong>Tech Debt Index</strong> — one number for codebase health (0-100, grade A-F)</li>
                <li><strong>Trend tracking</strong> — see how TDI changes sprint over sprint</li>
                <li><strong>Multi-session reports</strong> — before/after comparisons out of the box</li>
                <li><strong>Claude-native workflow</strong> — Latent Chain mode, MCP integration, no glue code</li>
              </ul>
              <p style={{marginTop: '16px', opacity: 0.8}}>
                SonarQube is great for static analysis. CCG adds the "what changed" and "what to do next"
                layers that turn analysis into action.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Does the free tier have limits?</h3>
              <p style={{lineHeight: 1.8}}>
                No artificial limits. Dev tier includes full CLI, hotspot detection, Tech Debt Index,
                and basic reports. It runs 100% offline with no license key required.
              </p>
              <p style={{marginTop: '12px', opacity: 0.8}}>
                Team tier adds trend tracking, advanced reports, PR comments, and VS Code integration
                for teams who want visibility into progress over time.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>What languages are supported?</h3>
              <p style={{lineHeight: 1.8}}>
                JavaScript/TypeScript have the best support. Python, Java, Go, Rust, and C/C++ work
                with basic metrics. Any language with recognizable syntax gets file-level analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started */}
      <section id="get-started">
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Ready to clean up your codebase?</h2>
          <div className="code-block" style={{display: 'inline-block', textAlign: 'left'}}>
            npm install -g codeguardian-studio<br/>
            ccg quickstart
          </div>
          <p style={{marginTop: '16px', opacity: 0.8, fontSize: '0.9rem'}}>
            That's it. Report appears in <code>docs/reports/</code>.
          </p>
          <div style={{marginTop: '32px'}}>
            <a href="https://github.com/phuongrealmax/claude-code-guardian" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
            {' '}
            <a href="/case-study" className="btn btn-secondary">
              See Case Study
            </a>
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <a href="#get-started" className="floating-cta">
        Get Started
      </a>

      <Footer />
    </main>
  )
}
