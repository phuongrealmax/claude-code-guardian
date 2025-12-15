// Structured Data (JSON-LD) for SEO

export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Code Guardian Studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: [
      {
        '@type': 'Offer',
        name: 'Dev Tier',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier with full CLI, hotspot detection, and basic reports. 100% offline.',
      },
      {
        '@type': 'Offer',
        name: 'Team Tier',
        price: '19',
        priceCurrency: 'USD',
        priceValidUntil: '2025-12-31',
        description: 'Advanced reports, Tech Debt Index tracking, trend charts, and priority support.',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '24',
      bestRating: '5',
      worstRating: '1',
    },
    description: 'AI-powered code refactor engine for large repositories. Scan repos, find hotspots, track Tech Debt Index. Built on Claude Code + MCP.',
    url: 'https://codeguardian.studio',
    downloadUrl: 'https://www.npmjs.com/package/codeguardian-studio',
    softwareVersion: '4.0.0',
    releaseNotes: 'Open-core architecture with MIT license. Dev tier runs 100% offline.',
    screenshot: 'https://codeguardian.studio/og-image.png',
    featureList: [
      'Code hotspot detection',
      'Tech Debt Index tracking',
      'Complexity analysis',
      'Markdown reports',
      'Claude Code MCP integration',
      '100% offline operation',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Code Guardian Studio',
    url: 'https://codeguardian.studio',
    logo: 'https://codeguardian.studio/logo.png',
    description: 'AI-powered code quality tools for developers',
    sameAs: [
      'https://github.com/phuongrealmax/claude-code-guardian',
      'https://www.npmjs.com/package/codeguardian-studio',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@codeguardian.studio',
      contactType: 'customer service',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Why not just use SonarQube + Claude?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Code Guardian Studio gives you Tech Debt Index (one number for codebase health), trend tracking across sprints, multi-session reports with before/after comparisons, and Claude-native workflow with MCP integration.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does the free tier have limits?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No artificial limits. Dev tier includes full CLI, hotspot detection, Tech Debt Index, and basic reports. It runs 100% offline with no license key required.',
        },
      },
      {
        '@type': 'Question',
        name: 'What languages are supported?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JavaScript/TypeScript have the best support. Python, Java, Go, Rust, and C/C++ work with basic metrics. Any language with recognizable syntax gets file-level analysis.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my code sent to any server?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. CCG runs 100% locally. All analysis data is stored in the .ccg/ folder in your project and never uploaded anywhere. Only license verification sends your license key (not your code).',
        },
      },
      {
        '@type': 'Question',
        name: 'What data does CCG store?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Everything is stored locally in .ccg/: memory.db for decisions and patterns, tasks/*.json for workflow tracking, checkpoints/ for restore points, and registry/ for document index.',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
