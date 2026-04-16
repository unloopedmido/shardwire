# Shardwire npm workspaces example

Two packages in one repo — **`packages/bot`** (Discord + bridge server) and **`packages/app`** (app process) — sharing a **single workspace root `.env`**. Use this when you want bot and app as separate deployable units without duplicating secrets across folders.

## Environment variables

All variables live in **`.env` at `examples/workspace-monorepo/.env`** (copy from `.env.example`).

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Discord bot token (bot package) |
| `SHARDWIRE_SECRET` | Shared secret (both packages) |
| `SHARDWIRE_URL` | Optional app-side bridge URL (defaults to `ws://127.0.0.1:3001/shardwire`) |
| `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID` | Optional — for `npm run register` (guild `/hello`) |

## Expected logs (healthy)

1. **Terminal A — `npm run bot`** (from `examples/workspace-monorepo`): `bot bridge ready`
2. **Terminal B — `npm run app`:** `app bridge ready` then a **capabilities** object

## Setup

1. From the **monorepo root**: `npm install` and `npm run pkg:build`.
2. From **`examples/workspace-monorepo`**: `npm install` (installs workspace packages and links local `shardwire`).
3. Copy `.env.example` to `.env` at the **workspace example root** and fill in secrets.
4. Optional: **`npm run register`** once if you configured application + guild IDs.
5. **`npm run bot`** in one terminal, **`npm run app`** in another.

## If something fails

- **Missing env:** Both scripts load the workspace **root** `.env` (three levels up from each `src/` file). Run **`npm run bot`** / **`npm run app`** from **`examples/workspace-monorepo`** so the shared `.env` path resolves.
- **Connection / auth:** [Troubleshooting → Connection and authentication](https://shardwire.js.org/docs/troubleshooting#connection-and-auth-errors)

Docs: [Getting started](https://shardwire.js.org/docs/getting-started/) · [How it works](https://shardwire.js.org/docs/concepts/how-it-works/).
