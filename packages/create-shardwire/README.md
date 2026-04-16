<div align="center">

# `create-shardwire`

### Interactive scaffold for a Discord bot plus Shardwire app layout—so you skip copying folders by hand.

[npm](https://www.npmjs.com/package/create-shardwire) · [Docs — getting started](https://shardwire.js.org/docs/getting-started/) · [Scaffold changelog](https://shardwire.js.org/docs/changelog/create-shardwire/)

</div>

---

> [!IMPORTANT]
> **What it touches:** creates a **new directory** with source files, `package.json`, and config templates on disk. It does not modify global npm settings or files outside the target path you choose.
>
> **Network:** uses npm to resolve template dependencies (normal package install traffic).
>
> **Secrets:** prompts may ask for names and versions; **Discord tokens are not generated here**. You add secrets to `.env` after the scaffold.
>
> **Undo:** delete the generated folder. **Uninstall the tool:** `npm uninstall -g create-shardwire` only if you installed globally (most users run via `npm create` without a global install).

```bash
npm create shardwire@latest
```

---

## The Problem

Starting a split-process Discord project means repeating the same decisions: workspace vs single package, TypeScript vs JavaScript, Vite vs plain Node, where slash-command registration lives, and how `.env` is wired for **both** bot and app.

`create-shardwire` encodes those decisions as **maintained templates** so you get a running baseline and can focus on product code. If you have used `npm create vite` or `create-next-app`, the flow is the same idea with different defaults.

---

## See It Work

```text
$ npm create shardwire@latest
# follow prompts: project name, template (minimal / react-vite / workspace), options
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

The CLI asks a short set of questions, renders a **template** into a target directory, and writes a `package.json` wired to published `shardwire` / `@shardwire/react` versions (or workspace equivalents when you develop inside this monorepo).

<details>
<summary><b>Details</b> — templates</summary>

| Template       | When to pick it                               |
| -------------- | --------------------------------------------- |
| **minimal**    | Smallest Node bot + Node app pair             |
| **react-vite** | Vite + React app UI talking to the bridge     |
| **workspace**  | npm workspaces splitting bot and app packages |

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
