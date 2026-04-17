<div align="center">

# `create-shardwire`

### Interactive scaffold for a Discord bot plus Shardwire app layout—so you skip copying folders by hand.

[![npm](https://img.shields.io/npm/v/create-shardwire?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/create-shardwire)
[![npm downloads](https://img.shields.io/npm/dm/create-shardwire?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/create-shardwire)
[![License: MIT](https://img.shields.io/npm/l/create-shardwire?style=flat-square&label=license)](https://github.com/unloopedmido/shardwire/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/create-shardwire?style=flat-square&logo=node.js&label=node)](https://nodejs.org/)

<br />

[npm](https://www.npmjs.com/package/create-shardwire) · [Docs — getting started](https://shardwire.js.org/docs/getting-started/) · [Scaffold changelog](https://shardwire.js.org/docs/changelog/create-shardwire/)

</div>

---

```bash
npm create shardwire@latest
```

---

## The Problem

Starting a split-process Discord project means repeating the same decisions: TypeScript vs JavaScript, Vite vs plain Node, where slash-command registration lives, and how `.env` is wired for **both** bot and app.

`create-shardwire` encodes those decisions as **maintained templates** so you get a running baseline and can focus on product code. If you have used `npm create vite` or `create-next-app`, the flow is the same idea with different defaults.

---

## See It Work

```text
$ npm create shardwire@latest
# follow prompts: project name, template (Express Server / React App), options
$ cd your-project
$ npm install
$ cp .env.example .env
# edit .env — Discord token, SHARDWIRE_SECRET, optional application/guild ids, SHARDWIRE_URL
$ npm run register
$ npm run bot    # one terminal
$ npm run app    # or npm run dev for Vite — second terminal
```

---

## Install

The CLI writes a **new directory** of source and config under the path you pick; it does not change global npm settings or files outside that folder. Dependency downloads are normal npm traffic. It does **not** mint Discord tokens—you add secrets to `.env` after scaffolding. Undo by deleting the folder; `npm uninstall -g create-shardwire` only applies if you installed the bin globally (most people use `npm create` without that).

The supported entry is **`npm create`**, which downloads this package on demand:

```bash
npm create shardwire@latest
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — CLI binary and development</summary>

Published **bin name:** `create-shardwire` (invoked indirectly through `npm create shardwire`).

To hack on the CLI inside the monorepo:

```bash
cd packages/create-shardwire
npm install
npm run build
node dist/cli.js
```

Templates live under `templates/` and are copied (with substitutions) during project generation.

</details>

---

## Getting Started

1. Run `npm create shardwire@latest`.
2. Open the generated `README.md` in your new project for template-specific scripts.
3. Continue from the main [Getting started](https://shardwire.js.org/docs/getting-started/) guide for Discord configuration and deployment notes.

---

## How It Works

The CLI asks a short set of questions, renders a **template** into a target directory, and writes a `package.json` wired to published `shardwire` / `@shardwire/react` versions (or workspace equivalents when you develop inside the Shardwire monorepo).

<details>
<summary><b>Details</b> — templates</summary>

| Template           | When to pick it                                                       |
| ------------------ | --------------------------------------------------------------------- |
| **Express Server** | Node bot + Express (`GET /health`) + bridge client in one app process |
| **React App**      | Vite + React UI (`@shardwire/react`) talking to the bridge            |

If a template name changes, trust the interactive prompt list over this table.

</details>

---

## FAQ

**Does this deploy my bot?** No. It only creates files. Hosting, systemd, Docker, or PaaS setup remains yours—see [Keeping it alive](https://shardwire.js.org/docs/guides/keeping-it-alive/).

**Can I update an existing repo with this?** The tool targets **new** directories; migrate manually or generate elsewhere and copy pieces.

---

## Contributing

Monorepo path: `packages/create-shardwire`. Run `npm run verify` before publishing or submitting substantial CLI changes.

## License

MIT.
