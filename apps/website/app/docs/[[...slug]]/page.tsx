import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ComponentType } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
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

type MDXComponent = ComponentType<{ components?: ReturnType<typeof getMDXComponents> }>;
type DocsRuntimeData = {
  body: MDXComponent;
  toc?: TOCItemType[];
  full?: boolean;
  title: string;
  description?: string;
};

function isMDXComponent(value: unknown): value is MDXComponent {
  return typeof value === 'function';
}

function isDocsToc(value: unknown): value is TOCItemType[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is TOCItemType =>
        typeof item === 'object' &&
        item !== null &&
        'title' in item &&
        'url' in item &&
        'depth' in item &&
        typeof item.url === 'string' &&
        typeof item.depth === 'number',
    )
  );
}

function parseDocsRuntimeData(value: object): DocsRuntimeData | null {
  if (!('body' in value) || !isMDXComponent(value.body)) {
    return null;
  }

  if (!('title' in value) || typeof value.title !== 'string') {
    return null;
  }

  const toc = 'toc' in value && isDocsToc(value.toc) ? value.toc : undefined;
  const full = 'full' in value && typeof value.full === 'boolean' ? value.full : undefined;
  const description = 'description' in value && typeof value.description === 'string' ? value.description : undefined;

  return {
    body: value.body,
    title: value.title,
    toc,
    full,
    description,
  };
}

export default async function Page({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const docsData = parseDocsRuntimeData(page.data);

  if (!docsData) {
    notFound();
  }

  const MDX = docsData.body;

  return (
    <DocsPage toc={docsData.toc} full={docsData.full}>
      <DocsJsonLd page={page} />
      <DocsTitle>{docsData.title}</DocsTitle>
      <DocsDescription>{docsData.description}</DocsDescription>
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
