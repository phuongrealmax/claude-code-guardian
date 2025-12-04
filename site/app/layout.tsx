import './globals.css'

export const metadata = {
  title: 'Claude Code Guardian — AI Refactoring for Large Codebases',
  description: 'Turn Claude Code into a refactor engine. Scan repos, find hotspots, generate optimization reports.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
