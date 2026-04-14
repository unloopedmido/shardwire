export const siteConfig = {
  name: 'Shardwire',
  description: 'Discord-first bridge for splitting gateway runtime from app logic.',
  githubUrl: 'https://github.com/unloopedmido/shardwire',
  npmUrl: 'https://www.npmjs.com/package/shardwire',
  docsUrl: 'https://unloopedmido.github.io/shardwire/',
  basePath: process.env.NODE_ENV === 'production' ? '/shardwire' : '',
};

export function withBasePath(pathname: string): string {
  if (!pathname.startsWith('/')) return pathname;
  return siteConfig.basePath.length > 0 ? `${siteConfig.basePath}${pathname}` : pathname;
}

export function docsRepositoryUrl(contentPath: string): string {
  return `${siteConfig.githubUrl}/blob/main/apps/website/content/docs/${contentPath}`;
}
