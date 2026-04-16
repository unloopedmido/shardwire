<div align="center">

# Your Shardwire project (React + Vite)

### Vite-powered React UI talking to a Node bot through `@shardwire/react` and `shardwire`.

[![License: MIT](https://img.shields.io/badge/license-MIT-326ce5?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Shardwire docs](https://img.shields.io/badge/Shardwire-docs-6b46c1?style=flat-square)](https://shardwire.js.org/docs/)

<br />

[Documentation](https://shardwire.js.org/docs/) · [@shardwire/react on npm](https://www.npmjs.com/package/@shardwire/react)

</div>

---

You will run **Vite and the bot/bridge** together in development. Anything prefixed with `VITE_` is compiled into the browser bundle—only put a bridge URL and secrets there that you are willing to expose to clients, and read the Shardwire docs on secret scopes first. Stop processes and delete this directory to remove the project.

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
$ cp .env.example .env   # set bot-side vars and VITE_* client vars
$ npm run register
$ npm run bot      # terminal A — bridge + Discord
$ npm run dev      # terminal B — Vite (default http://localhost:5173)
```

---

## Install

```bash
npm install
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — scripts</summary>

| Script                              | What it runs      |
| ----------------------------------- | ----------------- |
| `npm run bot`                       | `tsx bot/bot.ts`  |
| `npm run dev` / `build` / `preview` | Vite lifecycle    |
| `npm run register`                  | `tsx register.ts` |

</details>

---

## Getting Started

1. Fill `.env` with Discord credentials, bridge secret, and `VITE_SHARDWIRE_URL` / related keys expected by `src/` (see comments in `.env.example`).
2. Run bot and Vite together during development.
3. Read [Keeping it alive](https://shardwire.js.org/docs/guides/keeping-it-alive/) before deploying to production hosts.

---

## How It Works

The bot process (`bot/bot.ts`) mirrors the minimal template: Discord.js + bridge. The Vite app wraps your React tree with `ShardwireProvider` and uses hooks from `@shardwire/react` to interact with the session.

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
