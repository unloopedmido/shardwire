import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMDX } from 'fumadocs-mdx/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';
const basePath = isProduction ? '/shardwire' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: isProduction ? `${basePath}/` : undefined,
};

const withMDX = createMDX();

export default withMDX(nextConfig);
