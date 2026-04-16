import { absoluteUrlFromPathname, siteConfig } from '@/lib/site';

export function SiteJsonLd() {
  const siteRoot = absoluteUrlFromPathname('/');
  const websiteId = `${siteRoot}#website`;
  const softwareId = `${siteRoot}#software`;

  const webSite = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteRoot,
  };

  const softwareApplication = {
    '@type': 'SoftwareApplication',
    '@id': softwareId,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteRoot,
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
    isPartOf: { '@id': websiteId },
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [webSite, softwareApplication],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
