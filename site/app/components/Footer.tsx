import Link from 'next/link'

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '48px',
          marginBottom: '48px'
        }}>
          {/* Brand Column */}
          <div>
            <div className="footer-brand" style={{marginBottom: '16px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink: 0}}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <strong>Code Guardian Studio</strong>
            </div>
            <p className="footer-tagline" style={{fontSize: '0.875rem', lineHeight: 1.6}}>
              AI-powered code refactor engine for large repositories, built on Claude Code + MCP.
            </p>
            {/* Social Links */}
            <div style={{display: 'flex', gap: '16px', marginTop: '16px'}}>
              <a href="https://github.com/phuongrealmax/claude-code-guardian" target="_blank" rel="noopener noreferrer" title="GitHub" style={{opacity: 0.7, transition: 'opacity 0.2s'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
              </a>
              <a href="https://npmjs.com/package/codeguardian-studio" target="_blank" rel="noopener noreferrer" title="npm" style={{opacity: 0.7, transition: 'opacity 0.2s'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </a>
              <a href="https://twitter.com/codeguardianstudio" target="_blank" rel="noopener noreferrer" title="Twitter" style={{opacity: 0.7, transition: 'opacity 0.2s'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="mailto:hello@codeguardian.studio" title="Email" style={{opacity: 0.7, transition: 'opacity 0.2s'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 style={{marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>Product</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem'}}>
              <Link href="/#features">Features</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/case-study">Case Study</Link>
              <a href="https://github.com/phuongrealmax/claude-code-guardian" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://npmjs.com/package/codeguardian-studio" target="_blank" rel="noopener noreferrer">npm Package</a>
            </div>
          </div>

          {/* Resources Column */}
          <div>
            <h4 style={{marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>Resources</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem'}}>
              <a href="https://github.com/phuongrealmax/claude-code-guardian/blob/v4.0.1/docs/USER_GUIDE.md" target="_blank" rel="noopener noreferrer">User Guide</a>
              <a href="https://github.com/phuongrealmax/claude-code-guardian/blob/v4.0.1/docs/QUICKSTART.md" target="_blank" rel="noopener noreferrer">Quickstart</a>
              <a href="https://github.com/phuongrealmax/claude-code-guardian/blob/v4.0.1/docs/PUBLIC_RELEASE.md" target="_blank" rel="noopener noreferrer">Public Release</a>
              <a href="https://github.com/phuongrealmax/claude-code-guardian/blob/v4.0.1/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Changelog</a>
              <Link href="/partners">Partner Program</Link>
            </div>
          </div>

          {/* Legal Column */}
          <div>
            <h4 style={{marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>Legal</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem'}}>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/refund">Refund Policy</Link>
              <a href="mailto:hello@codeguardian.studio">Contact Support</a>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '0.875rem',
          opacity: 0.7
        }}>
          <p className="footer-copy" style={{margin: 0}}>
            © 2025 Code Guardian Studio. Built with Claude. Protected by Guardian.
          </p>
          <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Built on Claude
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
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
      </div>
    </footer>
  )
}
