<div align="center">

# Workspace Shardwire example

### npm workspaces split into `packages/bot` and `packages/app` with shared tooling—closer to how larger teams lay out repos.

[How it works](https://shardwire.js.org/docs/concepts/how-it-works/)

</div>

---

This folder is its **own** npm workspace (`packages/bot`, `packages/app`). Run the commands below from **this example’s root** after cloning the full Shardwire repo so `file:` links to `packages/shardwire` resolve. Copy `.env.example` to `.env` here and fill Discord + bridge values before running.

```bash
cd examples/workspace-monorepo
npm install
```

---

## The Problem

Single-folder demos hide how you **split packages**, share TypeScript config, and run two entrypoints with workspace scripts. This layout mirrors a small production monorepo while staying small enough to read in one sitting.

---

## See It Work

```text
$ npm install
$ cp .env.example .env
# edit .env — DISCORD_TOKEN, SHARDWIRE_SECRET, optional application/guild ids
$ npm run register
$ npm run bot    # terminal A — delegates to bot workspace
$ npm run app    # terminal B — delegates to app workspace
```

---

## Install

```bash
git clone https://github.com/unloopedmido/shardwire.git
cd shardwire/examples/workspace-monorepo
npm install
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — scripts map to workspaces</summary>

Root `package.json` scripts forward into named workspaces:

| Script             | Delegates to                               |
| ------------------ | ------------------------------------------ |
| `npm run bot`      | `@example/shardwire-workspace-bot` `start` |
| `npm run app`      | `@example/shardwire-workspace-app` `start` |
| `npm run register` | bot workspace `register`                   |

Open each workspace’s `package.json` for exact command definitions.

</details>

---

## Getting Started

1. Install at the example root so nested workspaces link correctly.
2. Copy `.env.example` to `.env` at the example root (both workspaces load from the same file layout used in the sources).
3. Compare structure with the **workspace** template produced by `npm create shardwire@latest`.

---

## How It Works

The bot workspace owns Discord + bridge startup. The app workspace runs a Node client that connects to the bridge URL exposed by the bot. Shared types and versions flow through normal workspace dependency edges.

<details>
<summary><b>Details</b> — adapting</summary>

- Replace example scope names (`@example/...`) when you fork into a private repository.
- Point `shardwire` to npm semver ranges instead of `file:` once you leave the Shardwire development tree.

</details>

---

## FAQ

**Do I need npm workspaces for Shardwire?** No—this is one layout option. Single-package examples exist under `examples/minimal-bridge`.

---

## Contributing

Structural changes should preserve clarity for readers navigating two packages; discuss larger renames in a PR description.

## License

MIT — same as the parent project.
