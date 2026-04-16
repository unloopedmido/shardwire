<div align="center">

# Your Shardwire project (workspace)

### npm workspaces with separate `packages/bot` and `packages/app` trees sharing one Shardwire dependency graph.

[Documentation](https://shardwire.js.org/docs/) · [How it works](https://shardwire.js.org/docs/concepts/how-it-works/)

</div>

---

> [!IMPORTANT]
> **Install location:** always run `npm install` from this **repository root** so workspace links resolve.
>
> **Secrets:** use the root `.env.example` → `.env` flow (or the split your team prefers) before starting either workspace.
>
> **Cleanup:** stop processes; remove the directory to delete the scaffold output.

```bash
npm install
cp .env.example .env
```

---

## The Problem

As soon as a real product appears, you usually split **bot** code from **app** code. This template starts you in that layout with npm workspaces instead of flattening everything into one package.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # configure shared env values used by both packages
$ npm run register
$ npm run bot    # terminal A — bot workspace entrypoint
$ npm run app    # terminal B — app workspace entrypoint
```

---

## Install

```bash
npm install
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — root scripts</summary>

Root `package.json` forwards into each workspace:

| Script             | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `npm run bot`      | Starts the bot package (`tsx packages/bot/src/bot.ts`) |
| `npm run app`      | Starts the app package (`tsx packages/app/src/app.ts`) |
| `npm run register` | Registers slash commands from the bot package          |

Open each workspace `package.json` for package names and fine-grained scripts.

</details>

---

## Getting Started

1. Configure `.env` at the root (see `.env.example` comments).
2. Use `npm run register` after changing Discord command definitions.
3. Compare with single-package templates if you ever want to collapse layout for a smaller experiment.

---

## How It Works

`packages/bot` hosts Discord + the bridge. `packages/app` runs the client connector. Shared TypeScript configuration and dependency versions live at the workspace root so upgrades touch one lockfile.

<details>
<summary><b>Details</b> — evolving the layout</summary>

- Rename workspace packages to match your org scope (`@your-scope/bot`, etc.).
- Add more workspaces (workers, cron) by extending the root `workspaces` array and wiring scripts explicitly—npm does not infer process topology for you.

</details>

---

## FAQ

**Is npm workspaces required for Shardwire?** No—it is an organizational choice. The minimal template stays single-package on purpose.

---

## Contributing

Upstream template source: [`create-shardwire` templates directory](https://github.com/unloopedmido/shardwire/tree/main/packages/create-shardwire/templates).

## License

MIT — set your own `LICENSE` when you publish independently.
