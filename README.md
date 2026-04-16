<div align="center">

# Shardwire

### Keep the Discord gateway in one process and your product logic in another—without shipping your bot token to every client.

[Documentation](https://shardwire.js.org/docs/) · [API reference](https://shardwire.js.org/docs/reference/) · [Issues](https://github.com/unloopedmido/shardwire/issues)

</div>

---

> [!IMPORTANT]
> **What touches your machine:** cloning this repo only adds source. Running examples or the docs app installs npm dependencies under each workspace. Published packages (`shardwire`, `@shardwire/react`, `create-shardwire`) are installed from npm like any other dependency.
>
> **Network:** a running bot talks to Discord; the app connects to the bridge over WebSocket. `create-shardwire` may fetch package metadata during install (normal npm behavior).
>
> **Secrets:** you configure Discord tokens, application IDs, and a shared bridge secret in `.env` (or your host’s secret store)—examples use names like `SHARDWIRE_SECRET`; never commit real tokens.
>
> **Reversibility:** stop processes and remove the clone. Uninstall published packages with `npm uninstall <name>` in the project that added them.

```bash
npm create shardwire@latest
```

---

## The Problem

Discord bots often grow until one long-lived process is doing everything: gateway traffic, business rules, admin dashboards, and automation. That coupling makes deployments brittle and pushes sensitive capabilities (and sometimes credentials) into places they should not live.

If you have already split “API server + worker” or “control plane + data plane,” the idea will feel familiar. **What Shardwire adds is a small, opinionated bridge:** a bot-side WebSocket server and a typed client so a separate app process can subscribe to events and send actions with a shared secret—not with your bot user’s full power in the browser.

---

## See It Work

From the monorepo root after install:

```text
$ cd examples/minimal-bridge
$ npm install
$ cp .env.example .env   # fill DISCORD_TOKEN, SHARDWIRE_SECRET, optional ids and SHARDWIRE_URL
$ npm run register       # register slash commands (once)
$ npm run bot            # terminal A: bot + bridge
$ npm run app            # terminal B: app client
```

You should see the app connect to the bridge and handle traffic defined in the example sources. Adjust URLs and secrets if you change the default listen address.

---

## Install

**Start a new project (recommended):**

```bash
npm create shardwire@latest
```

**Use the libraries in an existing Node or bundler project:**

```bash
npm install shardwire
# optional dashboards / React controllers
npm install @shardwire/react
```

Requires **Node.js 22+** (see `engines` in each package).

<details>
<summary><b>Details</b> — work on this monorepo locally</summary>

Clone the repository, then from the repo root:

```bash
npm install
```

Useful root scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Build `shardwire`, `@shardwire/react`, and the docs site |
| `npm run verify` | Lint, tests, typecheck, and builds across published packages and the scaffold |
| `npm run docs:dev` | Next.js docs + reference dev server |
| `npm run docs:build` / `docs:preview` | Static export build and local preview |

Examples under `examples/` use `file:` dependencies back to `packages/*` so you can iterate without publishing.

</details>

---

## Getting Started

1. **Skim concepts** — [How it works](https://shardwire.js.org/docs/concepts/how-it-works/) (bot vs app, secrets, capabilities).
2. **Scaffold or copy an example** — `npm create shardwire@latest` or pick `examples/minimal-bridge`, `examples/react-vite-dashboard`, or `examples/workspace-monorepo`.
3. **Configure environment** — `.env` with Discord credentials and a shared bridge secret (for example `SHARDWIRE_SECRET`) that matches on both sides.
4. **Register commands** (if your template uses slash commands) — `npm run register` in the template or example.
5. **Run bot and app** — two processes in development; production layout is your choice (see [Keeping it alive](https://shardwire.js.org/docs/guides/keeping-it-alive/)).

---

## How It Works

The **bot process** owns the Discord gateway session and hosts a **bridge server**. The **app process** uses `shardwire/client` (or `@shardwire/react` in the browser) to connect over WebSocket, authenticate with the shared secret, and exchange typed events and actions.

<details>
<summary><b>Details</b> — repository layout</summary>

| Path | Role |
| --- | --- |
| `packages/shardwire` | Core bridge + Node client (`shardwire`, `shardwire/client`) |
| `packages/react` | Optional React hooks for app-side UIs |
| `packages/create-shardwire` | Interactive project scaffold |
| `apps/website` | Public documentation site (Fumadocs + Next.js) |
| `examples/*` | Runnable references wired to local `file:` packages |

Source of truth for APIs and guides is the published documentation, not this file alone.

</details>

---

## Reference

- [Getting started](https://shardwire.js.org/docs/getting-started/)
- [Tutorial — first interaction](https://shardwire.js.org/docs/tutorial/first-interaction/)
- [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/)
- [Changelog hub](https://shardwire.js.org/docs/changelog/)

<details>
<summary><b>Details</b> — license and contributing</summary>

This monorepo is **MIT** licensed (`LICENSE` at the root; `packages/shardwire` ships its own copy for npm).

Contributions: open an issue or PR on [GitHub](https://github.com/unloopedmido/shardwire). Run `npm run verify` before submitting substantive changes.

</details>

---

## FAQ

**Do I have to use React?** No. `@shardwire/react` is optional; Node-only apps use `shardwire` and `shardwire/client`.

**Can the app run in the browser?** Yes for the client side of the bridge; the bot must stay on a server you control. Read the docs for secret handling and deployment constraints.

**Where is the changelog?** [Documentation changelog hub](https://shardwire.js.org/docs/changelog/) with per-package sections.

---

## Contributing

See the expanded Contributing note in **Reference → Details**, and use `npm run verify` from the repo root.

## License

MIT — see `LICENSE`.
