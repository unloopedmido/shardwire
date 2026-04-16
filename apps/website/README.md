<div align="center">

# Shardwire documentation site

### Next.js + Fumadocs app that builds the public docs at [shardwire.js.org](https://shardwire.js.org/).

[![Live docs](https://img.shields.io/badge/docs-shardwire.js.org-6b46c1?style=flat-square)](https://shardwire.js.org/docs/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fumadocs](https://img.shields.io/badge/Fumadocs-171717?style=flat-square)](https://fumadocs.dev/)
[![License: MIT](https://img.shields.io/badge/license-MIT-326ce5?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/unloopedmido/shardwire/ci.yml?branch=main&logo=github&label=ci&style=flat-square)](https://github.com/unloopedmido/shardwire/actions/workflows/ci.yml)

</div>

---

```bash
# from repository root
npm install
npm run docs:dev
```

---

## The Problem

Library READMEs cannot carry every guide, generated reference page, and troubleshooting flow. This app is the **canonical documentation surface** for Shardwire: concepts, tutorials, API tables, and changelog hubs.

---

## See It Work

```text
$ cd /path/to/shardwire
$ npm install
$ npm run docs:dev
# open the URL printed by Next.js (default http://localhost:3000)
```

---

## Install

This workspace package is **not published to npm**; it builds the public docs from a full monorepo checkout. `predev` / `prebuild` run reference generation against `packages/*` TypeScript. `next dev` and `serve` bind locally by default; these scripts do not add extra telemetry.

Work from the **monorepo root** so workspace dependencies resolve:

```bash
npm install
```

Then use root scripts (defined in the root `package.json`):

| Command                | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `npm run docs:dev`     | Development server with reference rebuild on start            |
| `npm run docs:build`   | Production build (static export configuration per Next setup) |
| `npm run docs:preview` | Serve the built `out/` directory                              |

<details>
<summary><b>Details</b> — package-local scripts</summary>

From `apps/website` you can also run `npm run dev`, `npm run build`, or `npm test` directly; prefer the root aliases when you want consistent paths from a single checkout.

Reference markdown is generated via `npm run reference:build` (wired into `predev` and `prebuild`).

</details>

---

## Getting Started

1. Install once at the repo root.
2. Run `npm run docs:dev`.
3. Edit content under the site’s content directories (see Fumadocs layout in this app) and TypeScript sources in `packages/*` for API changes.

---

## How It Works

Next.js hosts the UI; Fumadocs provides navigation, search, and MDX processing; local scripts generate structured reference data from the TypeScript packages so docs stay aligned with types.

<details>
<summary><b>Details</b> — contributing doc changes</summary>

- Prefer linking readers to **stable URLs** on `shardwire.js.org` from external README files.
- When you change public APIs, update guides and run `npm run docs:build` to catch generation failures before merging.

</details>

---

## FAQ

**Why `--webpack` in scripts?** The package scripts pin a bundler mode compatible with the current Next + toolchain mix; follow local `package.json` when upgrading Next.

**Where is the user-facing site?** Deployed separately from this README; source lives here in `apps/website`.

---

## Contributing

Use the main [GitHub repository](https://github.com/unloopedmido/shardwire). Doc-only PRs should still run `npm run docs:build` from the root when reference generation is involved.

## License

MIT — inherits project license; this package is not distributed standalone.
