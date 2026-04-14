import { absoluteUrlFromPathname, siteConfig } from '@/lib/site';

export function SiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrlFromPathname('/'),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    codeRepository: siteConfig.githubUrl,
    license: 'https://opensource.org/licenses/MIT',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    sameAs: [siteConfig.githubUrl, siteConfig.npmUrl].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
