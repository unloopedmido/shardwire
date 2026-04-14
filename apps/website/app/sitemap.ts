import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';
import { absoluteUrlFromPathname } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  const home = absoluteUrlFromPathname('/');
  byUrl.set(home, { url: home, changeFrequency: 'weekly', priority: 1 });

  for (const page of source.getPages()) {
    const url = absoluteUrlFromPathname(page.url);
    const isReference = page.url.includes('/reference');
    const depth = page.slugs.length;
    const priority = depth <= 1 ? 0.9 : Math.max(0.45, 0.85 - depth * 0.04);

    byUrl.set(url, {
      url,
      changeFrequency: isReference ? 'weekly' : 'monthly',
      priority,
    });
  }

  return [...byUrl.values()];
}
