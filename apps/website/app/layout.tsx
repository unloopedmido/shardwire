import './global.css';

import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

import { Provider } from '@/app/provider';
import { defaultOgImage, siteConfig, withBasePath } from '@/lib/site';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  weight: ['400', '500', '600'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
});

const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  /** Project site: https://shardwire.js.org/ */
  metadataBase: new URL(siteConfig.docsUrl),
  title: {
    default: 'Shardwire — Discord split-process bridge',
    template: '%s | Shardwire',
  },
  description: siteConfig.description,
  icons: {
    icon: [{ url: withBasePath('/icon.png'), type: 'image/png' }],
    apple: [{ url: withBasePath('/icon.png'), type: 'image/png' }],
  },
  openGraph: {
    title: 'Shardwire — Discord split-process bridge',
    description: siteConfig.description,
    url: siteConfig.docsUrl,
    siteName: 'Shardwire',
    type: 'website',
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shardwire — Discord split-process bridge',
    description: siteConfig.description,
    images: [defaultOgImage.url],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} ${display.variable} flex min-h-screen flex-col bg-background text-foreground antialiased`}
      >
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
