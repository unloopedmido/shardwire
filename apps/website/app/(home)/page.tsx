import dynamic from 'next/dynamic';

const SiteHome = dynamic(
  () => import('@/components/home/site-home').then((m) => m.SiteHome),
  {
    loading: () => (
      <main
        className="min-h-screen bg-[color:var(--site-background)] font-sans text-[color:var(--site-foreground)]"
        aria-busy="true"
        aria-label="Loading home"
      >
        <div className="mx-auto max-w-5xl border-x border-[color:var(--site-line)] px-6 py-24">
          <div className="max-w-2xl space-y-4 motion-safe:animate-pulse">
            <div className="h-4 w-40 rounded bg-[color:var(--site-line-strong)]" />
            <div className="h-12 w-full max-w-lg rounded bg-[color:var(--site-line)]" />
            <div className="h-24 w-full max-w-xl rounded bg-[color:var(--site-line)]" />
          </div>
        </div>
      </main>
    ),
  },
);

export default function HomePage() {
  return <SiteHome />;
}
