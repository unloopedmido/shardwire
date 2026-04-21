<div align="center">

# Your Shardwire project (React App)

### Vite-powered React UI talking to a Node bot through `@shardwire/react` and `shardwire`.

[![License: MIT](https://img.shields.io/badge/license-MIT-326ce5?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%E2%89%A520.19%20%7C%20%E2%89%A522.12-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Shardwire docs](https://img.shields.io/badge/Shardwire-docs-6b46c1?style=flat-square)](https://shardwire.js.org/docs/)

<br />

[Documentation](https://shardwire.js.org/docs/) · [@shardwire/react on npm](https://www.npmjs.com/package/@shardwire/react)

</div>

---

You will run **Vite and the bot/bridge** together in development. Anything prefixed with `VITE_` is compiled into the browser bundle, so this template uses a dedicated **browser-scoped** bridge secret instead of reusing a broad server-side secret. Stop processes and delete this directory to remove the project.

```bash
npm install
cp .env.example .env
```

---

## The Problem

You need a **browser dashboard** that reacts to Discord-backed events without ever embedding a bot token in the frontend. This template wires **Vite + React** to the same bridge your bot hosts.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # set DISCORD_TOKEN + the browser-scoped VITE_* secret values
$ npm run bot      # terminal A — bridge + Discord
$ npm run dev      # terminal B — Vite (default http://localhost:5173)
```

---

## Install

```bash
npm install
```

Requires **Node.js `^20.19.0 || >=22.12.0`** (matches Vite 8).

<details>
<summary><b>Details</b> — scripts</summary>

| Script                              | What it runs                                                                |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `npm run bot`                       | `tsx bot/bot.ts`                                                            |
| `npm run dev` / `build` / `preview` | Vite lifecycle                                                              |
| `npm run register`                  | Optional guild slash-command helper if you add an interaction example later |

</details>

---

## Getting Started

1. Fill `.env` with `DISCORD_TOKEN`, a dedicated `SHARDWIRE_BROWSER_SECRET`, and the matching `VITE_*` values expected by `src/` (see `.env.example`).
2. Run bot and Vite together during development.
3. Read [Keeping it alive](https://shardwire.js.org/docs/guides/keeping-it-alive/) before deploying to production hosts.

---

## How It Works

The bot process (`bot/bot.ts`) hosts the bridge with a scoped secret id of **`browser`** derived from the shared manifest. The Vite app wraps your React tree with `ShardwireProvider`, passes the same secret id, and uses hooks from `@shardwire/react` to interact with the session.

<details>
<summary><b>Details</b> — production split</summary>

Ship the **static build** (`npm run build`) to a CDN or static host and keep the **bot** on an always-on server. Terminate TLS at your edge or reverse proxy; the template intentionally stays local-first.

</details>

---

## FAQ

**Why both `shardwire` and `@shardwire/react`?** Core protocol + React bindings; both are first-class dependencies of this template.

---

## Contributing

Template changes belong in the upstream [`create-shardwire` package](https://github.com/unloopedmido/shardwire/tree/main/packages/create-shardwire).

## License

MIT — include or replace `LICENSE` according to how you publish your own project.
