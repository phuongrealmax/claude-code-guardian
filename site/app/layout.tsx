import './globals.css'
import Header from './components/Header'
import { Metadata } from 'next'
import { SoftwareApplicationSchema, OrganizationSchema, FAQSchema } from './components/StructuredData'

export const metadata: Metadata = {
  metadataBase: new URL('https://codeguardian.studio'),
  title: {
    default: 'Code Guardian Studio — AI Safety Layer for Claude & Cursor',
    template: '%s | Code Guardian Studio',
  },
  description: 'AI safety & control layer with 113+ MCP tools. Prevent Claude, Cursor, and AI agents from breaking your codebase. Proof Pack validation, TDI Gates, hotspot detection. 100% offline, MIT open-core.',
  keywords: [
    'AI safety',
    'AI control layer',
    'Claude Code',
    'Cursor AI',
    'MCP server',
    'MCP tools',
    'code refactoring',
    'AI code analysis',
    'code optimization',
    'technical debt',
    'tech debt index',
    'TDI gates',
    'proof pack',
    'code quality',
    'hotspot detection',
    'code complexity',
    'AI coding agent',
    'code guardian',
  ],
  authors: [{ name: 'Code Guardian Studio', url: 'https://codeguardian.studio' }],
  creator: 'Code Guardian Studio',
  publisher: 'Code Guardian Studio',

  // Canonical & Alternates
  alternates: {
    canonical: '/',
  },

  // Open Graph
  openGraph: {
    title: 'Code Guardian Studio — AI Safety Layer for Claude & Cursor',
    description: 'AI safety & control layer with 113+ MCP tools. Prevent AI agents from breaking your codebase. Proof Pack, TDI Gates, hotspot detection.',
    url: 'https://codeguardian.studio',
    siteName: 'Code Guardian Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Code Guardian Studio - AI Safety Layer with 113+ MCP Tools',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Code Guardian Studio — AI Safety Layer for Claude & Cursor',
    description: '113+ MCP tools to prevent AI from breaking your codebase. Proof Pack, TDI Gates, hotspot detection. 100% offline.',
    images: ['/og-image.png'],
    creator: '@codeguardian',
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  // Manifest
  manifest: '/site.webmanifest',

  // Verification
  verification: {
    google: 'xf-1xP6FWPb_HkSy3ysGuJqDxfNAdE4ODBUOY5hmaLg',
  },

  // Category
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="xf-1xP6FWPb_HkSy3ysGuJqDxfNAdE4ODBUOY5hmaLg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SoftwareApplicationSchema />
        <OrganizationSchema />
        <FAQSchema />
        <Header />
        <main style={{ paddingTop: '96px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
