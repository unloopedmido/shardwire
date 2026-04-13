---
name: shardwire
description: "Discord-first integration guide for the Shardwire npm package. Use when Codex needs to wire a Discord bot and a web/backend app with `createBotBridge(...)` and `connectBotBridge(...)`, choose intents, configure shared or scoped secrets, subscribe to built-in Discord events, call built-in bot actions, add event filters, or troubleshoot capability/auth/reconnect issues."
---

# Shardwire

Use this skill for the current Shardwire package only. Ground answers in the Discord-first API, not the pre-rewrite generic websocket bridge.

## Workflow

1. Classify the request:
   - bot host
   - app consumer
   - both sides
   - troubleshooting
2. Gather only the missing inputs:
   - bot token
   - required intents
   - bridge server port, host, or path
   - app URL and secret
   - events the app needs
   - built-in actions the app needs
   - whether secret scoping is required
3. Prefer the current root API:
   - bot: `createBotBridge({ token, intents, server })`
   - app: `connectBotBridge({ url, secret, secretId?, appName? })`
   - event subscription: `app.on(name, handler, filter?)`
   - action calls: `app.actions.<builtInAction>(payload)`
4. Keep examples Discord-first:
   - never propose `createShardwire(...)`
   - never ask the user to design `CommandMap` or `EventMap`
   - use built-in event names and built-in actions first
   - use Shardwire JSON payload types, not raw `discord.js` objects
5. Cover the likely failure surfaces:
   - event availability depends on intents
   - capabilities can be narrowed by secret scopes
   - remote actions return `ActionResult`, so show the failure branch when relevant
   - non-loopback app connections should use `wss://`

## Current Source Anchors

- Public exports: [src/index.ts](../../../src/index.ts)
- Public types: [src/discord/types.ts](../../../src/discord/types.ts)
- Event catalog and intent gating: [src/discord/catalog.ts](../../../src/discord/catalog.ts)
- Bot example: [examples/bot-basic.ts](../../../examples/bot-basic.ts)
- App example: [examples/app-basic.ts](../../../examples/app-basic.ts)

## References

- Read [references/api-surface.md](references/api-surface.md) for the current public API, built-in events, built-in actions, secret scopes, and filter keys.
- Read [references/integration-patterns.md](references/integration-patterns.md) for copy-paste bot/app setup, filtered subscriptions, action calls, and troubleshooting patterns.

## Response Rules

- Start with the shortest correct architecture recommendation.
- Prefer one complete bot snippet and one complete app snippet over fragmented fragments.
- Use event filters when the app only needs a subset of traffic.
- When the user asks about permissions, show scoped secrets rather than custom action registries.
- If the user asks for unsupported Discord surface, say it is not built in yet and do not invent APIs.
