<div align="center">

# Shardwire

### Keep the Discord gateway in one process and your product logic in another—without shipping your bot token to every client.

[![npm: shardwire](https://img.shields.io/npm/v/shardwire?label=shardwire&logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/shardwire)
[![npm: @shardwire/react](https://img.shields.io/npm/v/%40shardwire%2Freact?label=%40shardwire%2Freact&logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/@shardwire/react)
[![npm: create-shardwire](https://img.shields.io/npm/v/create-shardwire?label=create-shardwire&logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/create-shardwire)
[![License: MIT](https://img.shields.io/badge/license-MIT-326ce5?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/unloopedmido/shardwire/ci.yml?branch=main&logo=github&label=ci&style=flat-square)](https://github.com/unloopedmido/shardwire/actions/workflows/ci.yml)

<br />

[Documentation](https://shardwire.js.org/docs/) · [API reference](https://shardwire.js.org/docs/reference/) · [Issues](https://github.com/unloopedmido/shardwire/issues)

</div>

---

```bash
npm create shardwire@latest
```

---

## The Problem

Discord bots often grow until one long-lived process is doing everything: gateway traffic, business rules, admin dashboards, and automation. That coupling makes deployments brittle and pushes sensitive capabilities (and sometimes credentials) into places they should not live.

If you have already split “API server + worker” or “control plane + data plane,” the idea will feel familiar. **What Shardwire adds is a small, opinionated bridge:** a bot-side WebSocket server and a typed client so a separate app process can subscribe to events and send actions with a shared secret—not with your bot user’s full power in the browser.

---

## See It Work

Scaffold a project, then run the bot and app from the generated `README.md`:

```bash
npm create shardwire@latest
cd your-project
npm install
cp .env.example .env   # fill DISCORD_TOKEN, SHARDWIRE_SECRET, optional ids and SHARDWIRE_URL
npm run register       # register slash commands (once), if your template includes them
npm run bot            # terminal A: bot + bridge
npm run app            # terminal B: app client (Express Server) or see template for Vite
```

**Express Server** templates also serve **`GET /health`** on **`PORT`** (default **3000**). Adjust URLs and secrets if you change the default listen address.
The **React App** template instead uses **`SHARDWIRE_BROWSER_SECRET`** plus matching **`VITE_*`** values so the browser gets a scoped secret rather than a broad internal one.

---

## Install

Cloning only adds source; `npm install` pulls dependencies like any Node project. When you run a bot or scaffolded app, processes reach Discord and the bridge WebSocket you configure. Keep tokens and bridge secrets in `.env` or your host’s secret store (templates use names like `SHARDWIRE_SECRET` or `SHARDWIRE_BROWSER_SECRET`); never commit real values. To clean up, stop processes and delete the checkout; drop a published dependency from a project with `npm uninstall <name>`.

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

Published packages install on **Node.js 18+**. The runtime floor depends on which path you use: the **Express Server** template and any **Node** app process that calls **`connectBotBridge`** still require **Node.js 22+**, while the **React App** template follows Vite’s **`^20.19.0 || >=22.12.0`** support window.

<details>
<summary><b>Details</b> — work on this monorepo locally</summary>

Clone the repository, then from the repo root:

```bash
npm install
```

Useful root scripts:

| Script                                | Purpose                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build`                       | Build `shardwire`, `@shardwire/react`, and the docs site                      |
| `npm run verify`                      | Lint, tests, typecheck, and builds across published packages and the scaffold |
| `npm run docs:dev`                    | Next.js docs + reference dev server                                           |
| `npm run docs:build` / `docs:preview` | Static export build and local preview                                         |

Scaffold templates live under [`packages/create-shardwire/templates/`](packages/create-shardwire/templates/) if you need to read source without generating a project.

</details>

---

## Getting Started

1. **Skim concepts** — [How it works](https://shardwire.js.org/docs/concepts/how-it-works/) (bot vs app, secrets, capabilities).
2. **Scaffold** — `npm create shardwire@latest` (**Express Server** or **React App**). Template sources: [express-server](https://github.com/unloopedmido/shardwire/tree/main/packages/create-shardwire/templates/express-server), [react-vite](https://github.com/unloopedmido/shardwire/tree/main/packages/create-shardwire/templates/react-vite).
3. **Configure environment** — `.env` with Discord credentials and the secret layout your template expects: `SHARDWIRE_SECRET` for the Express/Node app path, or `SHARDWIRE_BROWSER_SECRET` plus matching `VITE_*` values for the browser dashboard path.
4. **Register commands** (if your template uses slash commands) — `npm run register` in the generated project.
5. **Run bot and app** — two processes in development; production layout is your choice (see [Keeping it alive](https://shardwire.js.org/docs/guides/keeping-it-alive/)).

---

## How It Works

The **bot process** owns the Discord gateway session and hosts a **bridge server**. The **app process** uses `shardwire/client` (or `@shardwire/react` in the browser) to connect over WebSocket, authenticate with the shared secret, and exchange typed events and actions.

<details>
<summary><b>Details</b> — repository layout</summary>

| Path                        | Role                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `packages/shardwire`        | Core bridge + Node client (`shardwire`, `shardwire/client`) |
| `packages/react`            | Optional React hooks for app-side UIs                       |
| `packages/create-shardwire` | Interactive project scaffold and templates                |
| `apps/website`              | Public documentation site (Fumadocs + Next.js)              |

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
