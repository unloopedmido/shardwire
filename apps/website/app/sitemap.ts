import { statSync } from 'node:fs';
import path from 'node:path';

import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';
import { absoluteUrlFromPathname } from '@/lib/site';

export const dynamic = 'force-static';

function mtimeOrUndefined(filePath: string | undefined): Date | undefined {
  if (!filePath) return undefined;
  try {
    return statSync(filePath).mtime;
  } catch {
    return undefined;
  }
}

function homeShellLastModified(): Date {
  const candidates = [
    path.join(process.cwd(), 'components/home/site-home.tsx'),
    path.join(process.cwd(), 'app/(home)/page.tsx'),
    path.join(process.cwd(), 'app/(home)/layout.tsx'),
  ];
  let maxMs = 0;
  for (const file of candidates) {
    try {
      maxMs = Math.max(maxMs, statSync(file).mtimeMs);
    } catch {
      /* ignore missing paths */
    }
  }
  return new Date(maxMs || Date.now());
}

export default function sitemap(): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  const home = absoluteUrlFromPathname('/');
  byUrl.set(home, {
    url: home,
    lastModified: homeShellLastModified(),
    changeFrequency: 'weekly',
    priority: 1,
  });

  for (const page of source.getPages()) {
    const url = absoluteUrlFromPathname(page.url);
    const isReference = page.url.includes('/reference');
    const depth = page.slugs.length;
    const priority = depth <= 1 ? 0.9 : Math.max(0.45, 0.85 - depth * 0.04);

    byUrl.set(url, {
      url,
      lastModified: mtimeOrUndefined(page.absolutePath),
      changeFrequency: isReference ? 'weekly' : 'monthly',
      priority,
    });
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}
