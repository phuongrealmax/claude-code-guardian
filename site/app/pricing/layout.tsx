import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Code Guardian Studio. Start free with Dev tier, upgrade to Team ($19/mo) for advanced Tech Debt reporting.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing — Code Guardian Studio',
    description: 'Start free with Dev tier. Upgrade to Team ($19/mo) for Tech Debt Index tracking and advanced reports.',
    url: 'https://codeguardian.studio/pricing',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
