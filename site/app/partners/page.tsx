export default function Partners() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Partner Program</h1>
          <p>
            Help developers clean up their hardest codebases with Claude Code Guardian —
            and earn recurring revenue along the way.
          </p>
          <div className="cta-buttons">
            <a href="mailto:partners@codeguardian.studio?subject=CCG Partner Application" className="btn btn-primary">
              Apply Now
            </a>
            <a href="#how-it-works" className="btn btn-secondary">Learn More</a>
          </div>
        </div>
      </section>

      {/* Partner Stats */}
      <section>
        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="stat-value">30%</div>
              <div className="stat-label">Base Commission</div>
            </div>
            <div className="stat">
              <div className="stat-value">40%</div>
              <div className="stat-label">Top Partner Rate</div>
            </div>
            <div className="stat">
              <div className="stat-value">90</div>
              <div className="stat-label">Day Cookie</div>
            </div>
            <div className="stat">
              <div className="stat-value">∞</div>
              <div className="stat-label">Recurring Revenue</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <p className="subtitle">Three steps to start earning.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>1. Apply</h3>
              <p>
                Fill out a quick application. We review all partners to ensure
                alignment with developer-first values.
              </p>
            </div>
            <div className="feature-card">
              <h3>2. Share</h3>
              <p>
                Get your unique referral link and access to our Affiliate Kit
                with tested content hooks, emails, and video scripts.
              </p>
            </div>
            <div className="feature-card">
              <h3>3. Earn</h3>
              <p>
                Every Team or Enterprise signup through your link earns you
                recurring commission for the lifetime of the subscription.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section>
        <div className="container">
          <h2>Who It's For</h2>
          <p className="subtitle">We partner with creators who reach developers.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>YouTubers & Streamers</h3>
              <p>
                Create tutorials, reviews, or live demos. Our 60s and 10min
                video scripts are ready to use or adapt.
              </p>
            </div>
            <div className="feature-card">
              <h3>Newsletter Authors</h3>
              <p>
                Share CCG with your readers. We provide tested email templates
                that convert developers into users.
              </p>
            </div>
            <div className="feature-card">
              <h3>Community Leaders</h3>
              <p>
                Discord, Slack, or Telegram — introduce CCG to your community
                with our ready-made content hooks.
              </p>
            </div>
            <div className="feature-card">
              <h3>Course Creators</h3>
              <p>
                Include CCG in your curriculum. Teach code quality with a tool
                students can use in real projects.
              </p>
            </div>
            <div className="feature-card">
              <h3>Agencies & Consultants</h3>
              <p>
                Offer CCG to your clients as part of your code review or
                refactoring services. White-label options available.
              </p>
            </div>
            <div className="feature-card">
              <h3>Open Source Maintainers</h3>
              <p>
                Keep your projects clean. Earn from enterprise users who
                adopt CCG after seeing it in your workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Kit */}
      <section>
        <div className="container">
          <h2>What You Get</h2>
          <p className="subtitle">Everything you need to promote CCG effectively.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Content Hooks</h3>
              <p>
                3 tested hooks that grab developer attention:
                "68k lines in 47 seconds", "Your AI broke prod",
                and "The tool Claude uses on itself".
              </p>
            </div>
            <div className="feature-card">
              <h3>Email Templates</h3>
              <p>
                3 ready-to-send emails: announcement, case study,
                and pricing update. Copy, personalize, send.
              </p>
            </div>
            <div className="feature-card">
              <h3>Social Posts</h3>
              <p>
                6 platform-optimized posts for Twitter/X, LinkedIn,
                and Reddit. With and without images.
              </p>
            </div>
            <div className="feature-card">
              <h3>Video Scripts</h3>
              <p>
                60-second short and 10-minute deep dive scripts
                with shot-by-shot breakdowns.
              </p>
            </div>
            <div className="feature-card">
              <h3>Brand Assets</h3>
              <p>
                Logos, screenshots, and demo GIFs. Everything
                you need for thumbnails and graphics.
              </p>
            </div>
            <div className="feature-card">
              <h3>Partner Dashboard</h3>
              <p>
                Track clicks, conversions, and earnings in real-time.
                Monthly payouts via Stripe or PayPal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section>
        <div className="container">
          <h2>Commission Structure</h2>
          <p className="subtitle">Earn more as you grow.</p>

          <table className="hotspots-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Monthly Referrals</th>
                <th>Commission</th>
                <th>Bonus</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Starter</td>
                <td>1-5</td>
                <td className="score-medium">30%</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Growth</td>
                <td>6-20</td>
                <td className="score-medium">35%</td>
                <td>Early access to features</td>
              </tr>
              <tr>
                <td>Pro</td>
                <td>21-50</td>
                <td className="score-high">40%</td>
                <td>Co-marketing opportunities</td>
              </tr>
              <tr>
                <td>Elite</td>
                <td>50+</td>
                <td className="score-high">40% + Custom</td>
                <td>Dedicated partner manager</td>
              </tr>
            </tbody>
          </table>

          <p style={{textAlign: 'center', marginTop: '24px', color: 'var(--muted)'}}>
            All commissions are recurring for the lifetime of each subscription.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Ready to partner with us?</h2>
          <p className="subtitle">
            Join the growing network of developers helping developers write better code.
          </p>
          <div style={{marginTop: '32px'}}>
            <a
              href="mailto:partners@codeguardian.studio?subject=CCG Partner Application"
              className="btn btn-primary"
            >
              Apply to Partner Program
            </a>
          </div>
          <p style={{marginTop: '24px', color: 'var(--muted)'}}>
            Questions? Email us at partners@codeguardian.studio
          </p>
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
            <a href="/case-study">Case Study</a>
            {' • '}
            <a href="https://github.com/anthropic-community/claude-code-guardian">GitHub</a>
          </p>
        </div>
      </footer>
    </main>
  )
}
