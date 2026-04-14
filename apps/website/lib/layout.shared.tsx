import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { SiteMark } from '@/components/site-mark';
import { siteConfig } from '@/lib/site';

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: siteConfig.githubUrl,
    nav: {
      title: <SiteMark />,
      url: '/',
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Reference',
        url: '/docs/reference',
        active: 'nested-url',
      },
      {
        text: 'npm',
        url: siteConfig.npmUrl,
        secondary: true,
      },
    ],
  };
}
