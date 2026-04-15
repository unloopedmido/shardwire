export const siteConfig = {
  name: 'Shardwire',
  description: 'Discord-first bridge for splitting gateway runtime from app logic.',
  githubUrl: 'https://github.com/unloopedmido/shardwire',
  npmUrl: 'https://www.npmjs.com/package/shardwire',
  docsUrl: 'https://shardwire.js.org/',
};

/**
 * Absolute public URL for a Next.js pathname (e.g. `/docs/foo`, `/icon.png`).
 * Matches `trailingSlash: true` for HTML routes.
 */
export function absoluteUrlFromPathname(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, '');
  const hasFileExtension = /\.[a-z0-9]{2,5}$/i.test(trimmed);
  const needsTrailingSlash = !hasFileExtension && trimmed !== '' && !trimmed.endsWith('/');
  const rel = trimmed ? (needsTrailingSlash ? `${trimmed}/` : trimmed) : '';
  return new URL(rel || '.', siteConfig.docsUrl).href;
}

export const defaultOgImage = {
  url: absoluteUrlFromPathname('/icon.png'),
  width: 512,
  height: 512,
  alt: 'Shardwire',
} as const;

export function withBasePath(pathname: string): string {
  return pathname;
}

export function docsRepositoryUrl(contentPath: string): string {
  return `${siteConfig.githubUrl}/blob/main/apps/website/content/docs/${contentPath}`;
}
