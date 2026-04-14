import { absoluteUrlFromPathname, siteConfig } from '@/lib/site';
import { source } from '@/lib/source';

type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

function buildBreadcrumbs(page: DocsPage): { name: string; url: string }[] {
  const siteRoot = absoluteUrlFromPathname('/');
  const crumbs: { name: string; url: string }[] = [{ name: 'Home', url: siteRoot }];

  const docsIndex = source.getPage([]);
  if (docsIndex) {
    crumbs.push({
      name: String(docsIndex.data.title),
      url: absoluteUrlFromPathname(docsIndex.url),
    });
  } else {
    crumbs.push({ name: 'Docs', url: absoluteUrlFromPathname('/docs') });
  }

  for (let i = 0; i < page.slugs.length; i++) {
    const sub = page.slugs.slice(0, i + 1);
    const p = source.getPage(sub);
    if (p) {
      crumbs.push({
        name: String(p.data.title),
        url: absoluteUrlFromPathname(p.url),
      });
    }
  }

  return crumbs;
}

export function DocsJsonLd({ page }: { page: DocsPage }) {
  const canonical = absoluteUrlFromPathname(page.url);
  const siteRoot = absoluteUrlFromPathname('/');
  const crumbs = buildBreadcrumbs(page);

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: page.data.title,
    description: page.data.description,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteRoot,
    },
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbList, webPage],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
