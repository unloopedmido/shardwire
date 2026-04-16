# Minimal Shardwire bridge

Two tiny scripts: a **bot** process (`createBotBridge`) and an **app** process (`connectBotBridge`). The app replies **`pong`** to **`!ping`** and responds to the **`/hello`** slash command (after you register it once).

## Setup

1. From the **monorepo root**, run `npm install` and `npm run pkg:build` so `shardwire` is built.
2. From **`examples/minimal-bridge`**, run `npm install` to link the local `shardwire` package.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `SHARDWIRE_SECRET`.
4. For **`/hello`**, set **`DISCORD_APPLICATION_ID`** and **`DISCORD_GUILD_ID`**, then run **`npm run register`** once.
5. Terminal A: `npm run bot` — wait for `bot bridge ready`.
6. Terminal B: `npm run app` — wait for `app bridge ready`.

Docs: [Getting started](https://shardwire.js.org/docs/getting-started/) · [First slash command](https://shardwire.js.org/docs/tutorial/first-interaction/).
