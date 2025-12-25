import Footer from '../components/Footer';

export const metadata = {
  title: 'Privacy Policy — Code Guardian Studio',
  description: 'Privacy Policy for Code Guardian Studio',
};

export default function Privacy() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="subtitle">Last updated: December 4, 2025</p>
        </div>
      </section>

      <section>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2>1. Introduction</h2>
          <p>
            Code Guardian Studio ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Account Information</h3>
          <ul>
            <li>Email address (for license delivery and support)</li>
            <li>Payment information (processed by Paddle.com, our payment processor)</li>
            <li>Company name (for Enterprise customers)</li>
          </ul>

          <h3>2.2 Technical Information</h3>
          <ul>
            <li>Machine ID (hashed hostname + platform for seat tracking)</li>
            <li>License verification requests (timestamp, status)</li>
            <li>CLI usage data (feature usage, error logs - if opted in)</li>
            <li>IP address and browser information (for web analytics)</li>
          </ul>

          <h3>2.3 Code Data</h3>
          <p>
            Code Guardian Studio analyzes your code <strong>locally on your machine</strong>. We do NOT:
          </p>
          <ul>
            <li>Upload your source code to our servers</li>
            <li>Store your code in our databases</li>
            <li>Share your code with third parties</li>
            <li>Train AI models on your code</li>
          </ul>
          <p>
            <strong>Exception:</strong> When using AI-assisted features (e.g., latent chain mode, agents), code
            snippets may be sent to Anthropic's Claude API for analysis. This is governed by{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener">
              Anthropic's Privacy Policy
            </a>
            .
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the Service</li>
            <li>Process payments and deliver license keys</li>
            <li>Verify license validity and enforce seat limits</li>
            <li>Provide customer support</li>
            <li>Send transactional emails (license keys, renewal reminders)</li>
            <li>Improve the Service and develop new features</li>
            <li>Prevent fraud and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Information Sharing</h2>
          <p>We share your information with:</p>

          <h3>4.1 Service Providers</h3>
          <ul>
            <li>
              <strong>Paddle.com</strong> (payment processing, VAT/tax compliance) -{' '}
              <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener">
                Paddle Privacy Policy
              </a>
            </li>
            <li>
              <strong>Anthropic</strong> (AI code analysis via Claude API) -{' '}
              <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener">
                Anthropic Privacy Policy
              </a>
            </li>
            <li>
              <strong>Vercel</strong> (hosting and infrastructure) -{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">
                Vercel Privacy Policy
              </a>
            </li>
          </ul>

          <h3>4.2 Legal Requirements</h3>
          <p>We may disclose your information if required by law or to:</p>
          <ul>
            <li>Comply with legal processes (subpoenas, court orders)</li>
            <li>Enforce our Terms of Service</li>
            <li>Protect our rights, property, or safety</li>
            <li>Prevent fraud or illegal activity</li>
          </ul>

          <h2>5. Data Retention</h2>
          <ul>
            <li>
              <strong>Account data:</strong> Retained while your subscription is active + 90 days after cancellation
            </li>
            <li>
              <strong>License keys:</strong> Retained indefinitely for audit purposes
            </li>
            <li>
              <strong>Payment data:</strong> Managed by Paddle (we do not store credit card information)
            </li>
            <li>
              <strong>Usage logs:</strong> 12 months for analytics and debugging
            </li>
          </ul>

          <h2>6. Data Security</h2>
          <p>We implement appropriate security measures including:</p>
          <ul>
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Encrypted storage for sensitive data (license keys, machine IDs)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication</li>
            <li>Webhook signature verification for payment events</li>
          </ul>
          <p>
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>

          <h2>7. Your Rights (GDPR)</h2>
          <p>If you are in the European Economic Area (EEA), you have the right to:</p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Rectification:</strong> Correct inaccurate or incomplete data
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")
            </li>
            <li>
              <strong>Restriction:</strong> Limit how we use your data
            </li>
            <li>
              <strong>Portability:</strong> Receive your data in a structured format
            </li>
            <li>
              <strong>Objection:</strong> Object to data processing for certain purposes
            </li>
            <li>
              <strong>Withdraw consent:</strong> Opt out of optional data collection
            </li>
          </ul>
          <p>
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@codeguardian.studio">privacy@codeguardian.studio</a>
          </p>

          <h2>8. Cookies and Tracking</h2>
          <p>We use minimal cookies and tracking:</p>
          <ul>
            <li>
              <strong>Essential cookies:</strong> For authentication and session management
            </li>
            <li>
              <strong>Analytics:</strong> Basic usage statistics (page views, feature usage) - anonymized
            </li>
            <li>
              <strong>No third-party advertising cookies</strong>
            </li>
          </ul>

          <h2>9. Children's Privacy</h2>
          <p>
            Code Guardian Studio is not intended for users under 13 years of age. We do not knowingly collect personal
            information from children. If you believe we have collected data from a child, please contact us
            immediately.
          </p>

          <h2>10. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries outside your jurisdiction (e.g., United States
            for hosting, UK for payment processing via Paddle). We ensure appropriate safeguards are in place,
            including:
          </p>
          <ul>
            <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
            <li>Compliance with GDPR and local privacy laws</li>
            <li>Data processing agreements with service providers</li>
          </ul>

          <h2>11. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated via:
          </p>
          <ul>
            <li>Email notification to registered users</li>
            <li>Prominent notice on our website</li>
            <li>Updated "Last updated" date at the top of this page</li>
          </ul>
          <p>Continued use of the Service after changes constitutes acceptance of the updated policy.</p>

          <h2>12. Contact Us</h2>
          <p>For privacy-related questions or concerns:</p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@codeguardian.studio">privacy@codeguardian.studio</a>
            </li>
            <li>
              <strong>Support:</strong> <a href="mailto:hello@codeguardian.studio">hello@codeguardian.studio</a>
            </li>
            <li>
              <strong>GitHub Issues:</strong>{' '}
              <a
                href="https://github.com/phuongrealmax/code-guardian/issues"
                target="_blank"
                rel="noopener"
              >
                Report a privacy concern
              </a>
            </li>
          </ul>

          <hr style={{ margin: '48px 0', opacity: 0.2 }} />

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>Summary:</strong> We respect your privacy. Your code stays on your machine. We only collect what's
            necessary for licensing, payments, and support. We don't sell your data. You have control over your
            information.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
