import Footer from '../components/Footer';

export const metadata = {
  title: 'Refund Policy — Code Guardian Studio',
  description: 'Refund Policy for Code Guardian Studio',
};

export default function Refund() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>Refund Policy</h1>
          <p className="subtitle">Last updated: December 10, 2025</p>
        </div>
      </section>

      <section>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2>14-Day Money-Back Guarantee</h2>
          <p>
            We offer a <strong>full 14-day money-back guarantee</strong> on all paid subscriptions, no questions asked.
            If you're not completely satisfied with Code Guardian Studio for any reason, simply request a refund within
            14 days of your purchase and we'll refund you in full.
          </p>

          <div
            className="feature-card"
            style={{
              background: 'rgba(88, 101, 242, 0.1)',
              border: '1px solid var(--primary)',
              marginTop: '24px',
              marginBottom: '32px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Our Promise</h3>
            <ul style={{ marginBottom: 0 }}>
              <li><strong>Full refund</strong> within 14 days of purchase</li>
              <li><strong>No questions asked</strong> - your satisfaction is our priority</li>
              <li><strong>Quick processing</strong> - refunds processed within 5-7 business days</li>
            </ul>
          </div>

          <h2>How to Request a Refund</h2>
          <p>To request a refund:</p>
          <ol>
            <li>
              Email us at: <a href="mailto:hello@codeguardian.studio">hello@codeguardian.studio</a>
            </li>
            <li>Include your license key or the email address used for purchase</li>
          </ol>
          <p>
            <strong>Processing time:</strong> Refunds are typically processed within 5-7 business days. You will receive
            a confirmation email once the refund is issued.
          </p>

          <h2>Subscription Cancellation</h2>
          <p>You can cancel your subscription at any time:</p>

          <h3>How to Cancel</h3>
          <ul>
            <li>
              Via Paddle: Log in to your Paddle account and manage your subscription
            </li>
            <li>
              Via Email: Contact <a href="mailto:hello@codeguardian.studio">hello@codeguardian.studio</a> with your
              license key
            </li>
          </ul>

          <h3>What Happens After Cancellation</h3>
          <ul>
            <li>Your license remains active until the end of the current billing period</li>
            <li>You will not be charged for the next billing cycle</li>
            <li>After the period ends, your access reverts to the Free Dev tier</li>
            <li>Your data and settings are retained for 90 days in case you reactivate</li>
          </ul>

          <h2>Free Dev Tier</h2>
          <p>
            The Free Dev tier is provided at no cost. You can use the Free Dev tier indefinitely at no charge.
          </p>

          <h2>Taxes and VAT</h2>
          <p>
            Paddle, our Merchant of Record, handles all tax calculations and compliance (VAT, GST, sales tax)
            automatically based on your location. When a refund is issued, taxes are handled by Paddle according
            to local tax laws.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Refund Policy from time to time. Material changes will be communicated via email or
            through the Service.
          </p>

          <h2>Contact Us</h2>
          <p>For refund requests or questions about this policy:</p>
          <ul>
            <li>
              <strong>Email:</strong> <a href="mailto:hello@codeguardian.studio">hello@codeguardian.studio</a>
            </li>
          </ul>
          <p>We aim to respond to all requests within 1-2 business days.</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
