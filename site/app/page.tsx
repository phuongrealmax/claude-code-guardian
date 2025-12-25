'use client'

import Footer from './components/Footer'
import WorkflowDiagram from './components/WorkflowDiagram'
import SafetyFlowDiagram from './components/SafetyFlowDiagram'
import CheckoutButton from './components/CheckoutButton'
import { useScrollAnimation } from './hooks/useScrollAnimation'

export default function Home() {
  const heroRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
  const controlPlaneRef = useScrollAnimation<HTMLElement>({ threshold: 0.3 })
  const blocksRef = useScrollAnimation<HTMLElement>({ threshold: 0.2 })
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
            v4.1.0 — MIT Open-Core • 113+ MCP Tools
          </span>
          <h1>A safety & control layer for AI coding agents.</h1>
          <p style={{fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 16px'}}>
            Prevent Claude, Cursor, and AI agents from breaking your codebase.
          </p>
          <p style={{fontSize: '1rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto'}}>
            CCG sits between AI agents and your repository to enforce safety, policy, and structure.
          </p>
          <div className="cta-buttons" style={{marginTop: '32px'}}>
            <a href="#get-started" className="btn btn-primary">Install Guard</a>
            <a href="#what-ccg-blocks" className="btn btn-secondary">See What CCG Blocks</a>
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
              AI Safety Layer
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Blocks Dangerous Actions
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              100% Local Control
            </span>
          </div>

          {/* Available On Badges */}
          <div style={{
            marginTop: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <a href="https://www.npmjs.com/package/codeguardian-studio" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/>
              </svg>
              npm
            </a>
            <a href="https://mcp.so/server/code-guardian" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              mcp.so
            </a>
            <a href="https://github.com/phuongrealmax/code-guardian" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Control Plane - How CCG Works */}
      <section ref={controlPlaneRef} className="scroll-fade-in" style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>The Control Plane for AI Agents</h2>
          <p className="subtitle">CCG sits between AI and your code. Every action goes through safety checks.</p>
          <SafetyFlowDiagram />
        </div>
      </section>

      {/* What CCG Blocks - OH SH*T Moment */}
      <section ref={blocksRef} id="what-ccg-blocks" className="scroll-fade-in" style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>What CCG Blocks</h2>
          <p className="subtitle" style={{marginBottom: '40px'}}>
            Real examples of dangerous AI actions that CCG prevented.
          </p>

          <div className="features-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'}}>
            {/* Blocked Action 1 */}
            <div className="feature-card stagger-item">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <span style={{background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)'}}>BLOCKED</span>
                <span style={{opacity: 0.6, fontSize: '0.85rem'}}>Mass Delete</span>
              </div>
              <h3 style={{fontSize: '1rem', marginBottom: '8px'}}>AI wanted to delete 42 files</h3>
              <p style={{fontSize: '0.9rem', opacity: 0.8, marginBottom: '16px'}}>
                Claude attempted to &quot;clean up&quot; by removing entire <code>/src/core</code> directory during refactoring.
              </p>
              <div style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  CCG Response
                </div>
                <p style={{fontSize: '0.85rem', marginTop: '8px', opacity: 0.7}}>
                  Blocked execution. Generated risk report. Required human approval for each file.
                </p>
              </div>
            </div>

            {/* Blocked Action 2 */}
            <div className="feature-card stagger-item">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <span style={{background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)'}}>BLOCKED</span>
                <span style={{opacity: 0.6, fontSize: '0.85rem'}}>Breaking Change</span>
              </div>
              <h3 style={{fontSize: '1rem', marginBottom: '8px'}}>AI rewrote database layer</h3>
              <p style={{fontSize: '0.9rem', opacity: 0.8, marginBottom: '16px'}}>
                Cursor attempted to change ORM from Prisma to Drizzle without migration plan.
              </p>
              <div style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  CCG Response
                </div>
                <p style={{fontSize: '0.85rem', marginTop: '8px', opacity: 0.7}}>
                  Detected architectural change. Required migration plan before proceeding.
                </p>
              </div>
            </div>

            {/* Blocked Action 3 */}
            <div className="feature-card stagger-item">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <span style={{background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)'}}>BLOCKED</span>
                <span style={{opacity: 0.6, fontSize: '0.85rem'}}>API Breaking</span>
              </div>
              <h3 style={{fontSize: '1rem', marginBottom: '8px'}}>AI changed public API signature</h3>
              <p style={{fontSize: '0.9rem', opacity: 0.8, marginBottom: '16px'}}>
                Agent renamed exported functions without considering downstream consumers.
              </p>
              <div style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  CCG Response
                </div>
                <p style={{fontSize: '0.85rem', marginTop: '8px', opacity: 0.7}}>
                  Flagged breaking change. Suggested deprecation path with versioning.
                </p>
              </div>
            </div>
          </div>

          {/* Fear headline */}
          <div style={{textAlign: 'center', marginTop: '48px', padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'}}>
            <p style={{fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px'}}>
              AI is powerful. Uncontrolled AI is dangerous.
            </p>
            <p style={{opacity: 0.7}}>
              CCG ensures every AI action is safe, reversible, and human-approved.
            </p>
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
              <div className="stat-value">113+</div>
              <div className="stat-label">MCP Tools</div>
            </div>
            <div className="stat">
              <div className="stat-value">75→68</div>
              <div className="stat-label">Tech Debt Index</div>
            </div>
            <div className="stat">
              <div className="stat-value">68k</div>
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
          <h2>Safety Without Friction</h2>
          <p className="subtitle">Protection that fits into your existing workflow.</p>

          <div className="features-grid">
            <div className="feature-card stagger-item">
              <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>
              <h3>Zero-Config Protection</h3>
              <p>
                Run <code>ccg quickstart</code> and guard rails activate immediately.
                No configuration needed. Sensible defaults protect you from day one.
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
              <h3>Works With Any AI Tool</h3>
              <p>
                <strong>Context Profiles</strong> auto-detect VSCode, Cursor, or CLI mode.
                CCG protects regardless of which AI agent you use.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Instant Risk Analysis</h3>
              <p>
                Analyze ~100k LOC in under a second. See risk scores before
                AI makes any changes. Real-time protection without slowdown.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - What It Does */}
      <section ref={featuresRef} className="scroll-fade-in">
        <div className="container">
          <h2>How CCG Protects Your Code</h2>
          <p className="subtitle">Safety features organized by protection level.</p>

          <div className="features-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'}}>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem'}}>Dev — Free</span>
              <h3>Detect Risk Before AI Acts</h3>
              <p>
                <strong>Tech Debt Index</strong> (0-100, grade A-F) identifies structural risk.
                Hotspot detection flags files AI should never touch blindly.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem'}}>Dev — Free</span>
              <h3>Human-Reviewable Execution Plans</h3>
              <p>
                <strong>Latent Chain</strong> mode enforces Analysis → Plan → Impl → Review.
                Guard module blocks dangerous patterns before they execute.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: 'var(--primary)'}}>Team</span>
              <h3>Audit Trail & Rollback</h3>
              <p>
                Before/after metrics and <strong>checkpoint system</strong>. Every AI action
                is logged and reversible. Full session history for compliance.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: 'var(--primary)'}}>Team / Enterprise</span>
              <h3>CI/CD Safety Gates</h3>
              <p>
                <strong>GitHub Action</strong> blocks PRs that exceed risk threshold.
                Quality gates prevent unsafe code from reaching production.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: '#10b981'}}>NEW in v4.1</span>
              <h3>Proof Pack & TDI Gates</h3>
              <p>
                <strong>Tamper-evident validation</strong> with SHA-256 hash chain.
                TDI budget gates block code that exceeds complexity thresholds.
              </p>
            </div>
            <div className="feature-card stagger-item">
              <span className="badge" style={{marginBottom: '12px', fontSize: '0.7rem', background: 'var(--primary)'}}>Team</span>
              <h3>Security & Threat Detection</h3>
              <p>
                <strong>STRIDE threat modeling</strong> built-in. Detect SQL injection,
                hardcoded secrets, and vulnerabilities before AI introduces them.
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
                Scans repo, finds hotspots, generates local report in <code>docs/reports/</code> (gitignored). Works offline.
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
            <div className="code-block" style={{display: 'inline-block', textAlign: 'left', fontSize: '0.875rem', whiteSpace: 'pre'}}>
{`# .github/workflows/ccg-analysis.yml
name: CCG Code Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codeguardian/ccg-action@v1
        with:
          threshold: 70
          strategy: mixed
          comment-on-pr: true`}
            </div>
            <p style={{marginTop: '16px', opacity: 0.7, fontSize: '0.9rem'}}>
              Coming soon to GitHub Marketplace
            </p>
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
                <li>AST Analysis (JS/TS)</li>
                <li>Auto-migration & Onboarding Agent</li>
                <li>Context Profiles (IDE auto-detect)</li>
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
                <li><strong>Latent Chain</strong> - Multi-phase reasoning</li>
                <li><strong>AutoAgent</strong> - Task decomposition</li>
                <li><strong>Thinking Models</strong> - Structured reasoning</li>
                <li><strong>RAG Search</strong> - Semantic code search</li>
                <li>Advanced reports & trends</li>
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
                <strong>JavaScript/TypeScript</strong> have full AST-based analysis for precise complexity
                and function-level metrics. Python, Java, Go, Rust, and C/C++ work with basic metrics.
                Any language with recognizable syntax gets file-level analysis.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Is my code sent to any server?</h3>
              <p style={{lineHeight: 1.8}}>
                <strong>No.</strong> CCG runs 100% locally. All analysis data (memories, tasks, reports,
                checkpoints) is stored in the <code>.ccg/</code> folder in your project — never uploaded anywhere.
              </p>
              <ul style={{marginTop: '12px', lineHeight: 2}}>
                <li><strong>Code analysis</strong> — processed locally, results saved to <code>.ccg/</code></li>
                <li><strong>RAG embeddings</strong> — local TF-IDF by default (no external API)</li>
                <li><strong>License verification</strong> — only your license key is sent (not your code)</li>
                <li><strong>No telemetry</strong> — zero analytics, zero tracking</li>
              </ul>
              <p style={{marginTop: '16px', opacity: 0.8}}>
                Even with a Team license, we only verify your license key. Your source code
                never leaves your machine.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>What data does CCG store?</h3>
              <p style={{lineHeight: 1.8}}>
                Everything is stored locally in <code>.ccg/</code>:
              </p>
              <ul style={{marginTop: '12px', lineHeight: 2}}>
                <li><code>memory.db</code> — decisions, patterns, notes</li>
                <li><code>tasks/*.json</code> — workflow tracking</li>
                <li><code>checkpoints/</code> — git-like restore points</li>
                <li><code>registry/</code> — document index</li>
              </ul>
              <p style={{marginTop: '16px', opacity: 0.8}}>
                Add <code>.ccg/</code> to <code>.gitignore</code> to keep this data private
                (we do this automatically on <code>ccg init</code>).
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
            That's it. Local report generated in <code>docs/reports/</code> (gitignored).
          </p>
          <div style={{marginTop: '32px'}}>
            <a href="https://github.com/phuongrealmax/code-guardian" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
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
