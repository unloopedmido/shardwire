import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { SiteJsonLd } from '@/components/site-json-ld';
import { baseOptions } from '@/lib/layout.shared';
import { absoluteUrlFromPathname, defaultOgImage, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrlFromPathname('/') },
  openGraph: {
    title: 'Shardwire — Discord split-process bridge',
    description: siteConfig.description,
    url: absoluteUrlFromPathname('/'),
    images: [defaultOgImage],
  },
  twitter: {
    title: 'Shardwire — Discord split-process bridge',
    description: siteConfig.description,
    images: [defaultOgImage.url],
  },
};

export default function HomeShell({ children }: { children: ReactNode }) {
  const base = baseOptions();

  return (
    <HomeLayout
      {...base}
      nav={{
        ...base.nav,
        transparentMode: 'top',
      }}
    >
      <SiteJsonLd />
      {children}
    </HomeLayout>
  );
}
