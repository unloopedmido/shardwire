# Shardwire + React (Vite)

A **browser app** process using **`@shardwire/react`** and a **Node bot** process using **`createBotBridge`**, matching the [minimal-bridge](../minimal-bridge) behavior (`!ping` / `/hello`) but with a small dashboard UI.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | Bot (`.env`) | Discord bot token |
| `SHARDWIRE_SECRET` | Bot (`.env`) | Shared bridge secret |
| `VITE_SHARDWIRE_SECRET` | Vite / browser (`.env`) | **Must match** `SHARDWIRE_SECRET` |
| `VITE_SHARDWIRE_URL` | Optional | Defaults to `ws://127.0.0.1:3001/shardwire` |
| `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID` | Optional | For `npm run register` (guild `/hello`) |

## Expected logs (healthy)

1. **Terminal A — `npm run bot`:** `bot bridge ready`
2. **Terminal B — `npm run dev`:** Vite dev server URL; open it in a browser. The page shows **Status: ready** and JSON **capabilities** when the app bridge connects.

## Setup

1. From the **monorepo root**: `npm install` and `npm run pkg:build` (builds `shardwire` and `@shardwire/react`).
2. From **`examples/react-vite-dashboard`**: `npm install`.
3. Copy `.env.example` to `.env`. Set **`SHARDWIRE_SECRET`** and the same value for **`VITE_SHARDWIRE_SECRET`**. Set **`DISCORD_TOKEN`**.
4. Optional: set **`DISCORD_APPLICATION_ID`** and **`DISCORD_GUILD_ID`**, then **`npm run register`** once for `/hello`.
5. Terminal A: **`npm run bot`**
6. Terminal B: **`npm run dev`** — open the printed local URL.

## If something fails

- **`ECONNREFUSED` / connection errors:** [Connection and authentication](https://shardwire.js.org/docs/troubleshooting#connection-and-auth-errors) — bot running, URL path `/shardwire`, **`VITE_SHARDWIRE_SECRET` === `SHARDWIRE_SECRET`**.
- **Strict startup / manifest:** [Strict startup failed](https://shardwire.js.org/docs/troubleshooting#strict-startup-failed) — bot intents must include `Guilds`, `GuildMessages`, `GuildMembers`, `MessageContent` for this example.
- **Vite pulls discord.js / zlib:** [Vite and zlib-sync](https://shardwire.js.org/docs/troubleshooting#vite-and-zlib-sync) — import app code only from **`shardwire/client`** and **`@shardwire/react`** (this example does).

Docs: [Getting started](https://shardwire.js.org/docs/getting-started/) · [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/).
