import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partners & Affiliates',
  description: 'Join the Code Guardian Studio affiliate program. Earn 20-30% commission promoting AI-powered code quality tools to developers.',
  alternates: {
    canonical: '/partners',
  },
  openGraph: {
    title: 'Partners & Affiliates — Code Guardian Studio',
    description: 'Join our affiliate program and earn 20-30% commission promoting Code Guardian Studio.',
    url: 'https://codeguardian.studio/partners',
  },
}

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
