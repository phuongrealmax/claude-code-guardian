import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Case Study: Dogfooding CCG',
  description: 'How Code Guardian Studio reduced its Tech Debt Index from 75 to 68 (-9.3%) by running CCG on its own 62,000 line codebase.',
  alternates: {
    canonical: '/case-study',
  },
  openGraph: {
    title: 'Case Study: Dogfooding CCG — Code Guardian Studio',
    description: 'Real results: TDI reduced from 75 to 68 (-9.3%) on a 62,000 line codebase.',
    url: 'https://codeguardian.studio/case-study',
  },
}

export default function CaseStudyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
