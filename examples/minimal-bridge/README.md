# Minimal Shardwire bridge

Two tiny scripts: a **bot** process (`createBotBridge`) and an **app** process (`connectBotBridge`). The app replies **`pong`** to **`!ping`** and responds to the **`/hello`** slash command (after you register it once).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `SHARDWIRE_SECRET` | Yes | Shared secret (must match bot and app) |
| `SHARDWIRE_URL` | No | App-side bridge URL (defaults to `ws://127.0.0.1:3001/shardwire` in `src/app.js`) |
| `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID` | For `/hello` | Used by `npm run register` only |

## Expected logs (healthy)

- **Terminal A — `npm run bot`:** `bot bridge ready`
- **Terminal B — `npm run app`:** `app bridge ready` then a line starting with `capabilities` (JSON-like object)

## Setup

1. From the **monorepo root**, run `npm install` and `npm run pkg:build` so `shardwire` is built.
2. From **`examples/minimal-bridge`**, run `npm install` to link the local `shardwire` package.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `SHARDWIRE_SECRET`.
4. For **`/hello`**, set **`DISCORD_APPLICATION_ID`** and **`DISCORD_GUILD_ID`**, then run **`npm run register`** once.
5. Terminal A: `npm run bot` — wait for `bot bridge ready`.
6. Terminal B: `npm run app` — wait for `app bridge ready`.

## If something fails

- **Connection refused / cannot connect:** [Connection and authentication](https://shardwire.js.org/docs/troubleshooting#connection-and-auth-errors) — bot must be running first; check URL and that **`SHARDWIRE_SECRET` matches** in both processes.
- **WebSocket / Node version:** [Node.js 22+ and WebSocket](https://shardwire.js.org/docs/troubleshooting#nodejs-below-22-connectbotbridge-requires-globalthiswebsocket)

Docs: [Getting started](https://shardwire.js.org/docs/getting-started/) · [First slash command](https://shardwire.js.org/docs/tutorial/first-interaction/) · [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/).

## Other official examples

- [React + Vite dashboard](../react-vite-dashboard/) — browser app with `@shardwire/react`
- [npm workspaces](../workspace-monorepo/) — `packages/bot` + `packages/app` with one root `.env`
