import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

import { collectPublicExports } from './collect-public-exports.mjs';
import { getReferenceCategoryId, slugify } from './routing.mjs';

const CATEGORY_DEFINITIONS = [
  {
    id: 'bridge-apis',
    title: 'Bridge APIs',
    description: 'Bot-side and app-side bridge entry points, configuration types, and negotiated capabilities.',
    guideLinks: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'Bot Bridge', href: '/docs/guides/bot-bridge' },
      { label: 'App Bridge', href: '/docs/guides/app-bridge' },
    ],
  },
  {
    id: 'contracts-and-diagnostics',
    title: 'Contracts & Diagnostics',
    description: 'Manifest contracts, capability discovery, strict startup, and diagnostics helpers.',
    guideLinks: [
      { label: 'Manifests', href: '/docs/guides/manifests' },
      { label: 'Strict Startup', href: '/docs/guides/strict-startup' },
      { label: 'Diagnostics', href: '/docs/operations/diagnostics' },
    ],
  },
  {
    id: 'workflows',
    title: 'Workflow Helpers',
    description: 'Higher-level helpers that combine multiple bridge actions into practical workflows.',
    guideLinks: [{ label: 'Workflow Helpers', href: '/docs/guides/workflows' }],
  },
  {
    id: 'errors-and-failures',
    title: 'Errors & Failures',
    description: 'Error classes, failure payloads, and result wrappers you should branch on explicitly.',
    guideLinks: [
      { label: 'Diagnostics', href: '/docs/operations/diagnostics' },
      { label: 'Troubleshooting', href: '/docs/operations/troubleshooting' },
    ],
  },
  {
    id: 'event-and-data-models',
    title: 'Event & Data Models',
    description: 'Normalized Discord payload models, event envelopes, catalog metadata, and bridge-side data shapes.',
    guideLinks: [{ label: 'How Shardwire works', href: '/docs/concepts/how-shardwire-works' }],
  },
  {
    id: 'action-models',
    title: 'Action Models',
    description: 'Action payloads, action result data, and the typed result wrappers returned from the bridge.',
    guideLinks: [
      { label: 'Capabilities & Scoped Secrets', href: '/docs/concepts/capabilities-and-scopes' },
      { label: 'App Bridge', href: '/docs/guides/app-bridge' },
    ],
  },
];

const CATEGORY_LOOKUP = new Map(CATEGORY_DEFINITIONS.map((category) => [category.id, category]));

function sanitizeText(value) {
  return String(value)
    .replace(/\{@link\s+([^}\s|]+)(?:\s*\|\s*([^}]+))?\s*\}/g, (_, target, label) => label ?? target)
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeFrontmatter(value) {
  return JSON.stringify(sanitizeText(value));
}

function getDeclarationKind(declaration) {
  if (ts.isFunctionDeclaration(declaration)) return 'function';
  if (ts.isInterfaceDeclaration(declaration)) return 'interface';
  if (ts.isTypeAliasDeclaration(declaration)) return 'type';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (ts.isEnumDeclaration(declaration)) return 'enum';
  return 'symbol';
}

function getSourceText(declaration) {
  const source = declaration.getSourceFile().getFullText();
  return source.slice(declaration.getStart(), declaration.getEnd());
}

function getPrintedSignature(entry) {
  const declaration = entry.declaration;

  if (entry.kind === 'function') {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer
      .printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile())
      .replace(/\s*\{[\s\S]*$/, '')
      .trimEnd()
      .concat(';');
  }

  if (entry.kind === 'type' || entry.kind === 'interface' || entry.kind === 'class' || entry.kind === 'enum') {
    return getSourceText(declaration);
  }

  return `export ${entry.kind} ${entry.name};`;
}

function isTableFriendly(entry) {
  if (entry.kind === 'interface' || entry.kind === 'class') {
    return true;
  }

  if (entry.kind === 'type' && ts.isTypeAliasDeclaration(entry.declaration)) {
    const typeNode = entry.declaration.type;
    return ts.isTypeLiteralNode(typeNode) || ts.isIntersectionTypeNode(typeNode);
  }

  return false;
}

function renderReferenceIndex(groups) {
  const sections = groups
    .filter((group) => group.entries.length > 0)
    .map((group) => `- [${group.title}](/docs/reference/${group.id})\n  ${group.description}`)
    .join('\n');

  return `---
title: "Reference"
description: "Generated API and type reference for the public Shardwire surface."
---

The reference section is generated directly from the public exports of \`packages/shardwire/src/index.ts\`.

It is organized by operational role instead of source-file ownership so the API surface reads like the product, not the repo.

## Sections

${sections}
`;
}

function renderCategoryIndex(group) {
  const pages = group.entries.map((entry) => `- [\`${entry.name}\`](/docs/reference/${group.id}/${entry.slug})`).join('\n');

  return `---
title: ${escapeFrontmatter(group.title)}
description: ${escapeFrontmatter(group.description)}
---

${group.description}

## Symbols

${pages}
`;
}

function renderReferencePage(entry, sourcePathFromWebsite) {
  const category = CATEGORY_LOOKUP.get(entry.categoryId);
  const description =
    entry.description ||
    `Reference for \`${entry.name}\`, exported as part of the public Shardwire surface.`;
  const signature = getPrintedSignature(entry).trim();
  const sourceLabel = path.posix.normalize(entry.sourcePath).replace(/\\/g, '/');
  const relatedLinks = category.guideLinks.map((link) => `- [${link.label}](${link.href})`).join('\n');
  const tableSection = isTableFriendly(entry)
    ? `\n## Structure\n\n<AutoTypeTable path="${sourcePathFromWebsite}" name="${entry.name}" />\n`
    : '';

  return `---
title: ${escapeFrontmatter(entry.name)}
description: ${escapeFrontmatter(description)}
---

\`${entry.kind}\` exported from \`${sourceLabel}\`.

## Summary

${sanitizeText(description)}

## Signature

\`\`\`ts
${signature}
\`\`\`
${tableSection}
## Related Guides

${relatedLinks}
`;
}

function buildGroups(entries, packageRoot) {
  const groups = CATEGORY_DEFINITIONS.map((definition) => ({
    ...definition,
    entries: [],
  }));
  const groupLookup = new Map(groups.map((group) => [group.id, group]));

  for (const entry of entries) {
    entry.categoryId = getReferenceCategoryId(entry.name);
    entry.slug = slugify(entry.name);
    entry.sourcePath = path.relative(packageRoot, entry.declaration.getSourceFile().fileName);
    groupLookup.get(entry.categoryId)?.entries.push(entry);
  }

  for (const group of groups) {
    group.entries.sort((left, right) => left.name.localeCompare(right.name));
  }

  return groups;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function generateReferenceDocs({
  packageRoot,
  docsRoot,
  indexFile = path.join(packageRoot, 'src', 'index.ts'),
} = {}) {
  if (!packageRoot || !docsRoot) {
    throw new Error('generateReferenceDocs requires both `packageRoot` and `docsRoot`.');
  }

  const websiteRoot = path.resolve(docsRoot, '..', '..', '..');
  const entries = collectPublicExports(indexFile);
  const groups = buildGroups(entries, packageRoot);

  await rm(docsRoot, { force: true, recursive: true });
  await mkdir(docsRoot, { recursive: true });

  await writeFile(path.join(docsRoot, 'index.mdx'), renderReferenceIndex(groups), 'utf8');
  await writeJson(path.join(docsRoot, 'meta.json'), {
    title: 'Reference',
    defaultOpen: false,
    pages: ['index', ...groups.filter((group) => group.entries.length > 0).map((group) => group.id)],
  });

  for (const group of groups) {
    if (group.entries.length === 0) {
      continue;
    }

    const groupRoot = path.join(docsRoot, group.id);
    await mkdir(groupRoot, { recursive: true });

    await writeFile(path.join(groupRoot, 'index.mdx'), renderCategoryIndex(group), 'utf8');
    await writeJson(path.join(groupRoot, 'meta.json'), {
      title: group.title,
      defaultOpen: false,
      pages: ['index', ...group.entries.map((entry) => entry.slug)],
    });

    for (const entry of group.entries) {
      const sourcePathFromWebsite = path.relative(websiteRoot, entry.declaration.getSourceFile().fileName).replace(/\\/g, '/');
      await writeFile(
        path.join(groupRoot, `${entry.slug}.mdx`),
        renderReferencePage(entry, sourcePathFromWebsite),
        'utf8',
      );
    }
  }

  return {
    entryCount: entries.length,
    categoryCount: groups.filter((group) => group.entries.length > 0).length,
  };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const packageRoot = path.resolve(process.cwd(), '..', '..', 'packages', 'shardwire');
  const docsRoot = path.resolve(process.cwd(), 'content', 'docs', 'reference');

  generateReferenceDocs({ packageRoot, docsRoot }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
