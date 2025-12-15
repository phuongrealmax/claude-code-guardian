'use client'

import Footer from '../components/Footer'
import CheckoutButton from '../components/CheckoutButton'

export default function Pricing() {
  return (
    <main>
      {/* Hero */}
      <section className="pricing-hero">
        <div className="container">
          <h1>Simple, transparent pricing</h1>
          <p className="subtitle">
            Start free with the Dev tier. Upgrade when your team needs advanced reporting.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section>
        <div className="container">
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Dev</h3>
              <div className="price">Free</div>
              <p>For solo devs & side projects</p>
              <ul>
                <li>Core CLI & hotspot detection</li>
                <li>Tech Debt Index per run</li>
                <li>Basic markdown reports</li>
                <li>GitHub Actions template</li>
                <li>Fully local, no license</li>
                <li>Unlimited projects</li>
              </ul>
              <a href="/#get-started" className="btn btn-secondary">Get Started</a>
            </div>

            <div className="pricing-card featured">
              <span className="badge" style={{position: 'absolute', top: '-12px', right: '16px', background: 'var(--primary)'}}>
                Most Popular
              </span>
              <h3>Team</h3>
              <div className="price">$19<span style={{fontSize: '1rem', color: '#888'}}>/mo per user</span></div>
              <p>For product teams & agencies</p>
              <ul>
                <li>Everything in Dev</li>
                <li>Advanced reports (before/after)</li>
                <li>TDI trends & session history</li>
                <li>Multi-repo config</li>
                <li>PR hotspot comments</li>
                <li>VS Code integration</li>
                <li>Email support</li>
              </ul>
              <CheckoutButton tier="team" className="btn btn-primary">Start 14-Day Trial</CheckoutButton>
              <p style={{fontSize: '0.75rem', opacity: 0.7, marginTop: '8px'}}>
                No credit card required for trial
              </p>
            </div>

            <div className="pricing-card">
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
                <li>Custom integrations</li>
              </ul>
              <CheckoutButton tier="enterprise" className="btn btn-secondary">Contact Sales</CheckoutButton>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>Feature Comparison</h2>
          <p className="subtitle">See exactly what's included in each tier.</p>

          <div style={{overflowX: 'auto', marginTop: '32px'}}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Dev</th>
                  <th>Team</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Core Analysis</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>Tech Debt Index (TDI)</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Hotspot Detection</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Code Metrics</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Basic Markdown Reports</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td><strong>Reporting & Tracking</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>Advanced Reports (Before/After)</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>TDI Trend Charts</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Session History</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Dogfood Reports</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td><strong>Integrations</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>GitHub Actions Template</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>PR Hotspot Comments</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>VS Code Integration</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Multi-repo Config</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td><strong>Enterprise Features</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>SSO / SAML</td>
                  <td className="dash">-</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Audit Logs</td>
                  <td className="dash">-</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Dedicated Cloud Backend</td>
                  <td className="dash">-</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Custom Integrations</td>
                  <td className="dash">-</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td><strong>Support</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>Community (GitHub)</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Email Support</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                  <td className="check">&#10003;</td>
                </tr>
                <tr>
                  <td>Priority Support + SLA</td>
                  <td className="dash">-</td>
                  <td className="dash">-</td>
                  <td className="check">&#10003;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="container">
          <h2>Frequently Asked Questions</h2>

          <div className="features-grid" style={{gridTemplateColumns: '1fr', maxWidth: '800px', margin: '40px auto 0'}}>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>How does the free trial work?</h3>
              <p style={{lineHeight: 1.8}}>
                The Team tier includes a 14-day free trial. No credit card required to start.
                After the trial, you can continue with the free Dev tier or upgrade to keep
                advanced features.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Can I use CCG offline?</h3>
              <p style={{lineHeight: 1.8}}>
                Yes! The Dev tier runs 100% offline with no license key required.
                Team and Enterprise tiers require license activation but then work locally
                with periodic license validation.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>How is per-user pricing calculated?</h3>
              <p style={{lineHeight: 1.8}}>
                Each developer who activates a license key counts as one user.
                You can add or remove users at any time. Billing is prorated.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>What payment methods do you accept?</h3>
              <p style={{lineHeight: 1.8}}>
                We use Paddle as our payment processor, which accepts all major credit cards,
                PayPal, and supports invoicing for Enterprise customers.
                Paddle handles VAT/tax collection automatically.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Can I cancel anytime?</h3>
              <p style={{lineHeight: 1.8}}>
                Yes, you can cancel your subscription at any time. Your access continues
                until the end of your billing period. No questions asked.
              </p>
            </div>

            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Do you offer refunds?</h3>
              <p style={{lineHeight: 1.8}}>
                We offer a 30-day money-back guarantee. If you're not satisfied,
                contact us and we'll process a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open-core vs Paid */}
      <section style={{background: 'rgba(255,255,255,0.02)'}}>
        <div className="container">
          <h2>Open-Core vs Paid</h2>
          <p className="subtitle">Understand what runs locally vs cloud-powered.</p>

          <div className="features-grid" style={{marginTop: '40px'}}>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Open-Core (Public)</h3>
              <p style={{lineHeight: 1.8}}>
                The CLI, local analysis, MCP tools, and core hotspot detection run <strong>100% offline</strong>.
                No license required for the Dev tier. Source code available on GitHub.
              </p>
            </div>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Team (Paid)</h3>
              <p style={{lineHeight: 1.8}}>
                Advanced reports, TDI trends, VS Code integration, and session history.
                Requires license key validated via <code>api.codeguardian.studio</code>.
              </p>
            </div>
            <div className="feature-card" style={{textAlign: 'left'}}>
              <h3>Enterprise (Paid)</h3>
              <p style={{lineHeight: 1.8}}>
                Everything in Team plus SSO, audit logs, SLA, and <strong>dedicated cloud backend</strong>.
                Custom integrations and priority support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Ready to clean up your codebase?</h2>
          <p className="subtitle">
            Start with the free Dev tier. Upgrade when you need it.
          </p>
          <div style={{marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <a href="/#get-started" className="btn btn-primary">Get Started Free</a>
            <CheckoutButton tier="team" className="btn btn-secondary">Start Team Trial</CheckoutButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
