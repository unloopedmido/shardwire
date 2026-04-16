import './global.css';

import type { Metadata } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono, Lexend } from 'next/font/google';
import type { ReactNode } from 'react';

import { Provider } from '@/app/provider';
import { defaultOgImage, siteConfig, withBasePath } from '@/lib/site';

const sans = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['400', '500', '600'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
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
  verification: {
    google: 'aWjd8fRAFISCNgNCOBRQxyFNWdgDHkMnabXMJY_yyQU',
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
