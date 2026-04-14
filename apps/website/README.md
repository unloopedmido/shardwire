# Shardwire Website

This app is the Shardwire docs site, rebuilt on:

- Next.js App Router
- Fumadocs MDX + Fumadocs Core + Fumadocs UI
- static export for GitHub Pages

## Local Development

From the monorepo root:

```bash
npm install
npm run docs:dev
```

The reference section is generated from `packages/shardwire/src/index.ts` before dev and build.

## Important Paths

- content docs: `content/docs`
- generated reference docs: `content/docs/reference`
- Fumadocs source config: `source.config.ts`
- shared source loader: `lib/source.ts`
- reference generator: `scripts/reference/generate.mjs`

## Verification

```bash
npm run -w website test
npm run -w website build
```
