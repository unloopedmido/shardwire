<div align="center">

# React + Vite Shardwire dashboard example

### Browser UI (`@shardwire/react`) talking to a Node bot process through the Shardwire bridge.

[React package](https://www.npmjs.com/package/@shardwire/react) · [Docs](https://shardwire.js.org/docs/)

</div>

---

Clone the full repository, then install **in this folder**—dependencies resolve to `file:../../packages/shardwire` and `file:../../packages/react`. You will run **two processes** (Vite plus the bot/bridge). Remember that Vite exposes `VITE_*` variables to the browser bundle, so only put a bridge URL and secrets there that you intend to ship to clients; see the main docs on scopes and capabilities.

```bash
cd examples/react-vite-dashboard
npm install
```

---

## The Problem

Dashboards want live Discord-backed state, but the browser must not hold a bot token. This example shows **Vite + React** on the app side and **Node + discord.js** on the bot side, joined by Shardwire.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # includes VITE_* and bot-side variables
$ npm run register
$ npm run bot      # terminal A — bridge + Discord session
$ npm run dev      # terminal B — Vite on http://localhost:5173 (default)
```

Open the dev URL, confirm the UI reaches the bridge, then trigger the interaction implemented in the example sources.

---

## Install

```bash
git clone https://github.com/unloopedmido/shardwire.git
cd shardwire/examples/react-vite-dashboard
npm install
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — scripts</summary>

| Script                              | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `npm run bot`                       | Bot + bridge (`bot/bot.js`)          |
| `npm run dev`                       | Vite dev server for the React app    |
| `npm run build` / `npm run preview` | Production bundle and static preview |
| `npm run register`                  | Slash command registration           |

</details>

---

## Getting Started

1. Fill `.env` with Discord credentials and bridge settings; set `VITE_*` values for the client bundle.
2. Keep bot and Vite running concurrently during development.
3. Read [@shardwire/react README](https://github.com/unloopedmido/shardwire/tree/main/packages/react) and the site docs when extending hooks usage.

---

## How It Works

The bot process mirrors the minimal example: host the bridge next to discord.js. The Vite app wraps React in `ShardwireProvider` and uses hooks to observe connection state and send actions.

<details>
<summary><b>Details</b> — deployment note</summary>

Production hosting splits into **static UI** (CDN or static host) and **always-on bot** elsewhere. This example does not include TLS termination or reverse-proxy configuration—treat that as infrastructure you layer on.

</details>

---

## FAQ

**Why both `shardwire` and `@shardwire/react`?** React hooks depend on the core client types and behavior; install both as this `package.json` does.

---

## Contributing

Keep the example easy to skim; propose larger demos as separate examples or docs stories in the main repo.

## License

MIT — same as the parent project.
