# Minimal Shardwire bridge

Two tiny scripts: a **bot** process (`createBotBridge`) and an **app** process (`connectBotBridge`) that logs `messageCreate` and replies **`pong`** to **`!ping`**.

## Setup

1. From the **monorepo root**, run `npm install` and `npm run pkg:build` so `shardwire` is built.
2. From **`examples/minimal-bridge`**, run `npm install` to link the local `shardwire` package.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `SHARDWIRE_SECRET`.
4. Terminal A: `npm run bot` — wait for `bot bridge ready`.
5. Terminal B: `npm run app` — wait for `app bridge ready`.

Walkthrough in the docs: [Tutorial](https://shardwire.js.org/docs/tutorial/lesson-0-overview/).
