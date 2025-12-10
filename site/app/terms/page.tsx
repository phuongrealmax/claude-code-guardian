import Footer from '../components/Footer';

export const metadata = {
  title: 'Terms of Service — Code Guardian Studio',
  description: 'Terms of Service for Code Guardian Studio',
};

export default function Terms() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>Terms of Service</h1>
          <p className="subtitle">Last updated: December 10, 2025</p>
        </div>
      </section>

      <section>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Code Guardian Studio ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Code Guardian Studio is an AI-powered code refactoring and optimization tool built on Claude Code and the
            Model Context Protocol (MCP). The Service provides:
          </p>
          <ul>
            <li>Code analysis and complexity metrics</li>
            <li>Automated refactoring suggestions</li>
            <li>Code optimization reports</li>
            <li>AI-assisted code improvements</li>
            <li>Team collaboration features (Team/Enterprise plans)</li>
          </ul>

          <h2>3. License Tiers</h2>
          <h3>Free Dev Tier</h3>
          <ul>
            <li>Available to all users at no cost</li>
            <li>Includes basic features: code optimizer, memory, guard, workflow</li>
            <li>No license key required</li>
          </ul>

          <h3>Team Tier ($39/month)</h3>
          <ul>
            <li>5 seats per license</li>
            <li>Advanced features: reports, agents, latent chain mode, testing suite</li>
            <li>Priority email support</li>
            <li>License key required for activation</li>
          </ul>

          <h3>Enterprise Tier (Custom Pricing)</h3>
          <ul>
            <li>Unlimited seats</li>
            <li>All Team features plus: SSO, audit logs, SOC2 compliance, dedicated support</li>
            <li>Custom integrations available</li>
            <li>Contact sales for pricing</li>
          </ul>

          <h2>4. Payment and Billing</h2>
          <p>
            Payments are processed through Paddle.com, our Merchant of Record. By subscribing to a paid plan:
          </p>
          <ul>
            <li>You authorize Paddle to charge your payment method on a recurring basis</li>
            <li>All prices are in USD and exclude applicable taxes (VAT/GST handled by Paddle)</li>
            <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
            <li>License keys are delivered via email after successful payment</li>
          </ul>

          <h2>5. Refund Policy</h2>
          <p>
            Please see our <a href="/refund">Refund Policy</a> for detailed information about refunds and cancellations.
          </p>

          <h2>6. License Key Usage</h2>
          <p>
            License keys are subject to the following restrictions:
          </p>
          <ul>
            <li>Team licenses are limited to 5 active machines (30-day activity window)</li>
            <li>License keys must not be shared publicly or sold to third parties</li>
            <li>We reserve the right to revoke licenses that violate these terms</li>
            <li>Inactive machines (not used for 30+ days) are automatically removed from seat count</li>
          </ul>

          <h2>7. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Attempt to reverse engineer, decompile, or disassemble the software</li>
            <li>Share license keys with unauthorized users</li>
            <li>Use the Service to generate malicious code or malware</li>
            <li>Overload or interfere with the Service's infrastructure</li>
            <li>Scrape or extract data from the Service via automated means</li>
          </ul>

          <h2>8. Intellectual Property</h2>
          <p>
            Code Guardian Studio, its code, design, and documentation are owned by the developers and protected by
            copyright and intellectual property laws. The Service is licensed under the MIT License for the open-source
            components, while commercial features require a paid license.
          </p>

          <h2>9. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>. We process your data
            in accordance with GDPR and other applicable privacy laws.
          </p>

          <h2>10. AI-Generated Code</h2>
          <p>
            Code Guardian Studio uses AI models (Claude) to analyze and suggest code improvements. You acknowledge that:
          </p>
          <ul>
            <li>AI-generated suggestions are provided "as-is" without warranty</li>
            <li>You are responsible for reviewing and testing all AI-generated code before deployment</li>
            <li>We are not liable for bugs, security vulnerabilities, or issues in AI-generated code</li>
            <li>Your code remains your intellectual property</li>
          </ul>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CODE GUARDIAN STUDIO SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
            DATA, OR GOODWILL, ARISING OUT OF YOUR USE OF THE SERVICE.
          </p>

          <h2>12. Warranty Disclaimer</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
            TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>

          <h2>13. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the Service at any time for:
          </p>
          <ul>
            <li>Violation of these Terms of Service</li>
            <li>Non-payment of fees</li>
            <li>Fraudulent or illegal activity</li>
            <li>Abuse of the Service or its infrastructure</li>
          </ul>
          <p>
            You may cancel your subscription at any time through your Paddle account or by contacting support.
          </p>

          <h2>14. Changes to Terms</h2>
          <p>
            We may update these Terms of Service from time to time. Material changes will be communicated via email or
            through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>15. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without
            regard to its conflict of law provisions.
          </p>

          <h2>16. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at:{' '}
            <a href="mailto:hello@codeguardian.studio">hello@codeguardian.studio</a>
          </p>

          <hr style={{ margin: '48px 0', opacity: 0.2 }} />

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            By using Code Guardian Studio, you acknowledge that you have read, understood, and agree to be bound by
            these Terms of Service.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
