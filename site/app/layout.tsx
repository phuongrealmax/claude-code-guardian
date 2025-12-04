import './globals.css'
import Header from './components/Header'

export const metadata = {
  title: 'Code Guardian Studio — AI-Powered Code Refactor Engine',
  description: 'Turn Claude Code into a refactor engine for large repositories. Scan repos, find hotspots, generate optimization reports. Built on Claude Code + MCP.',
  keywords: 'code refactoring, AI code analysis, Claude Code, MCP, code optimization, technical debt',
  authors: [{ name: 'Code Guardian Studio' }],
  openGraph: {
    title: 'Code Guardian Studio',
    description: 'AI-powered code refactor engine for large repositories',
    url: 'https://codeguardian.studio',
    siteName: 'Code Guardian Studio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code Guardian Studio',
    description: 'AI-powered code refactor engine for large repositories',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main style={{ paddingTop: '96px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
