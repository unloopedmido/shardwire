import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { baseOptions } from '@/lib/layout.shared';

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
              className="inline-flex items-center rounded-full border border-[color:var(--site-line-strong)] bg-[color:var(--site-accent-strong)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Open docs
            </Link>
            <Link
              href="/docs/reference"
              className="inline-flex items-center rounded-full border border-[color:var(--site-line)] bg-[color:var(--site-panel)] px-5 py-2.5 text-sm font-medium text-fd-foreground"
            >
              Open reference
            </Link>
          </div>
        </div>
      </main>
    </HomeLayout>
  );
}
