import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';

import { DocsJsonLd } from '@/components/docs-json-ld';
import { getMDXComponents } from '@/components/mdx';
import { absoluteUrlFromPathname, defaultOgImage, docsRepositoryUrl } from '@/lib/site';
import { source } from '@/lib/source';

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsJsonLd page={page} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <ViewOptionsPopover githubUrl={docsRepositoryUrl(page.path)} />
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const canonical = absoluteUrlFromPathname(page.url);

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: canonical,
      siteName: 'Shardwire',
      type: 'article',
      images: [defaultOgImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: [defaultOgImage.url],
    },
  };
}
