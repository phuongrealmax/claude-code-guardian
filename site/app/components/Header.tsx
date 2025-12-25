'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink: 0}}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="logo-text">
            <span className="logo-text-mobile">CG Studio</span>
            <span className="logo-text-desktop">Code Guardian Studio</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="nav nav-desktop">
          <Link
            href="/case-study"
            className={`nav-link ${pathname === '/case-study' ? 'active' : ''}`}
          >
            Case Study
          </Link>
          <Link
            href="/partners"
            className={`nav-link ${pathname === '/partners' ? 'active' : ''}`}
          >
            Partners
          </Link>
          <Link
            href="/pricing"
            className={`nav-link ${pathname === '/pricing' ? 'active' : ''}`}
          >
            Pricing
          </Link>
          <a
            href="https://github.com/phuongrealmax/code-guardian"
            className="nav-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link href="/#pricing" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </nav>

        {/* Mobile CTA only */}
        <div className="nav-mobile">
          <Link href="/#pricing" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </div>
      </div>

      {/* Mobile nav links (second row) */}
      <nav className="nav-mobile-links">
        <Link
          href="/case-study"
          className={`nav-link ${pathname === '/case-study' ? 'active' : ''}`}
        >
          Case Study
        </Link>
        <Link
          href="/partners"
          className={`nav-link ${pathname === '/partners' ? 'active' : ''}`}
        >
          Partners
        </Link>
        <Link
          href="/pricing"
          className={`nav-link ${pathname === '/pricing' ? 'active' : ''}`}
        >
          Pricing
        </Link>
        <a
          href="https://github.com/phuongrealmax/code-guardian"
          className="nav-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>
  )
}
