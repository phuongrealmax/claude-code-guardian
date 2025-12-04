'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Footer from '../components/Footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // In production, fetch license key from backend using sessionId
    // For now, generate a mock license key
    if (sessionId) {
      setTimeout(() => {
        const mockKey = `CGS-TEAM-${randomCode()}-${randomCode()}`;
        setLicenseKey(mockKey);
        setLoading(false);
      }, 1500);
    } else {
      setError('No session ID found');
      setLoading(false);
    }
  }, [sessionId]);

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function copyLicenseKey() {
    navigator.clipboard.writeText(licenseKey);
    alert('License key copied to clipboard!');
  }

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          {loading ? (
            <>
              <h1>Processing your payment...</h1>
              <p>Please wait while we activate your license.</p>
            </>
          ) : error ? (
            <>
              <h1 style={{ color: 'var(--error)' }}>Error</h1>
              <p>{error}</p>
              <div style={{ marginTop: '32px' }}>
                <a href="/pricing" className="btn btn-primary">
                  Back to Pricing
                </a>
              </div>
            </>
          ) : (
            <>
              <h1>Welcome to Code Guardian Studio!</h1>
              <p>Your Team license is now active.</p>
            </>
          )}
        </div>
      </section>

      {!loading && !error && licenseKey && (
        <>
          {/* License Key Section */}
          <section>
            <div className="container" style={{ maxWidth: '800px' }}>
              <h2>Your License Key</h2>
              <p className="subtitle">
                Save this key safely. You'll need it to activate CCG in your CLI.
              </p>

              <div
                className="code-block"
                style={{
                  background: 'rgba(88, 101, 242, 0.1)',
                  border: '1px solid var(--primary)',
                  padding: '24px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginTop: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                    letterSpacing: '2px',
                    marginBottom: '16px',
                  }}
                >
                  {licenseKey}
                </div>
                <button onClick={copyLicenseKey} className="btn btn-secondary btn-sm">
                  Copy to Clipboard
                </button>
              </div>

              <div style={{ marginTop: '32px', textAlign: 'left' }}>
                <h3>Next Steps:</h3>
                <ol style={{ lineHeight: 1.8 }}>
                  <li>
                    <strong>Install CCG globally</strong> (if not already installed):
                    <div className="code-block" style={{ marginTop: '8px' }}>
                      npm install -g codeguardian-studio
                    </div>
                  </li>
                  <li style={{ marginTop: '16px' }}>
                    <strong>Activate your license:</strong>
                    <div className="code-block" style={{ marginTop: '8px' }}>
                      ccg activate
                    </div>
                  </li>
                  <li style={{ marginTop: '16px' }}>
                    <strong>Enter your license key</strong> when prompted
                  </li>
                  <li style={{ marginTop: '16px' }}>
                    <strong>Start using Team features!</strong>
                    <div className="code-block" style={{ marginTop: '8px' }}>
                      ccg code-optimize --report
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Features Unlocked */}
          <section>
            <div className="container">
              <h2>Team Features Unlocked</h2>
              <p className="subtitle">You now have access to:</p>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <line x1="18" x2="18" y1="20" y2="10"/>
                      <line x1="12" x2="12" y1="20" y2="4"/>
                      <line x1="6" x2="6" y1="20" y2="14"/>
                    </svg>
                  </div>
                  <h3>Advanced Reports</h3>
                  <p>
                    Generate detailed Markdown reports with hotspot rankings,
                    metrics, and refactor plans.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  </div>
                  <h3>Latent Chain Mode</h3>
                  <p>
                    Multi-phase reasoning for complex refactoring tasks with
                    step-by-step context tracking.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="M7 7h.01"/>
                      <path d="M17 7h.01"/>
                      <path d="M7 17h.01"/>
                      <path d="M17 17h.01"/>
                      <path d="M7 12h10"/>
                    </svg>
                  </div>
                  <h3>Specialized Agents</h3>
                  <p>
                    Coordinate multiple agents for cross-domain tasks like
                    trading systems or ERP workflows.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                    </svg>
                  </div>
                  <h3>Thinking Models</h3>
                  <p>
                    Structured reasoning frameworks: chain-of-thought, tree-of-thoughts,
                    and more.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 10h3v3H7v-3Z"/>
                      <path d="M14 10h3v3h-3v-3Z"/>
                      <path d="M2 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
                    </svg>
                  </div>
                  <h3>Testing Suite</h3>
                  <p>
                    Browser testing with Playwright, test generation, and
                    automated test runs.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" x2="12" y1="8" y2="12"/>
                      <line x1="12" x2="12.01" y1="16" y2="16"/>
                    </svg>
                  </div>
                  <h3>Priority Support</h3>
                  <p>
                    Get help faster with priority email support and dedicated
                    assistance.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Email Confirmation */}
          <section>
            <div className="container" style={{ textAlign: 'center' }}>
              <h2>Check Your Email</h2>
              <p className="subtitle">
                We've sent a copy of your license key to your email address.
                <br />
                Keep it safe for future reference.
              </p>
              <div style={{ marginTop: '32px' }}>
                <a href="/" className="btn btn-primary">
                  Back to Home
                </a>
                {' '}
                <a href="https://codeguardian.studio/docs" className="btn btn-secondary">
                  View Documentation
                </a>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </main>
  );
}

export default function Success() {
  return (
    <Suspense fallback={
      <main>
        <section className="hero">
          <div className="container">
            <h1>Loading...</h1>
          </div>
        </section>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
