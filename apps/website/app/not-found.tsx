import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { baseOptions } from '@/lib/layout.shared';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This URL is not part of the Shardwire documentation site.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="px-4 py-24 sm:px-6 lg:px-8">
        <div
          data-site-panel
          className="mx-auto flex max-w-3xl flex-col gap-6 rounded-[2rem] border p-10 text-center"
        >
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-fd-muted-foreground">404</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-fd-foreground">
            That route is not part of the bridge map.
          </h1>
          <p className="text-base leading-8 text-fd-muted-foreground">
            Try the main docs entry or jump straight into the generated reference section.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/docs"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--site-line-strong)] bg-[color:var(--site-foreground)] px-5 py-2.5 text-sm font-medium text-[color:var(--site-background)] transition-opacity duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--site-foreground)]"
            >
              Open docs
            </Link>
            <Link
              href="/docs/reference"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--site-line)] bg-[color:var(--site-panel)] px-5 py-2.5 text-sm font-medium text-fd-foreground transition-colors duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] hover:border-[color:var(--site-line-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--site-foreground)]"
            >
              Open reference
            </Link>
          </div>
        </div>
      </main>
    </HomeLayout>
  );
}
