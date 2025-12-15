import './globals.css'
import Header from './components/Header'
import { Metadata } from 'next'
import { SoftwareApplicationSchema, OrganizationSchema, FAQSchema } from './components/StructuredData'

export const metadata: Metadata = {
  metadataBase: new URL('https://codeguardian.studio'),
  title: {
    default: 'Code Guardian Studio — AI-Powered Code Refactor Engine',
    template: '%s | Code Guardian Studio',
  },
  description: 'Turn Claude Code into a refactor engine for large repositories. Scan repos, find hotspots, track Tech Debt Index. 100% offline, MIT open-core.',
  keywords: [
    'code refactoring',
    'AI code analysis',
    'Claude Code',
    'MCP server',
    'code optimization',
    'technical debt',
    'tech debt index',
    'code quality',
    'hotspot detection',
    'code complexity',
    'refactor engine',
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
    title: 'Code Guardian Studio — AI-Powered Code Refactor Engine',
    description: 'Turn Claude Code into a refactor engine for large repositories. Track Tech Debt Index, find hotspots, generate reports. 100% offline.',
    url: 'https://codeguardian.studio',
    siteName: 'Code Guardian Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Code Guardian Studio - AI-Powered Code Refactor Engine',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Code Guardian Studio — AI-Powered Code Refactor Engine',
    description: 'Turn Claude Code into a refactor engine for large repositories. 100% offline, MIT open-core.',
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
