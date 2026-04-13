# API Surface

Use this file when you need the current public Shardwire contract.

## Root exports

- `createBotBridge(options: BotBridgeOptions): BotBridge`
- `connectBotBridge(options: AppBridgeOptions): AppBridge`
- Public types from [src/discord/types.ts](../../../../src/discord/types.ts)

## Bot bridge

`createBotBridge(...)` is token-first. The caller provides:

- `token`
- `intents`
- `server.port`
- optional `server.host`, `server.path`, `server.heartbeatMs`, `server.maxPayloadBytes`
- `server.secrets`

`server.secrets` supports:

- `"shared-secret"` for full access
- `{ id?, value, allow?: { events?: "*" | BotEventName[]; actions?: "*" | BotActionName[] } }` for scoped access

`BotBridge` methods:

- `ready()`
- `close()`
- `status() -> { ready, connectionCount }`

## App bridge

`connectBotBridge(...)` takes:

- `url`
- `secret`
- optional `secretId`
- optional `appName`
- optional reconnect config
- optional `requestTimeoutMs`

`AppBridge` methods:

- `ready()`
- `close()`
- `connected()`
- `connectionId()`
- `capabilities()`
- `on(eventName, handler, filter?)`
- `off(eventName, handler)`
- `actions.<builtInAction>(payload, options?)`

## Built-in events

- `ready`
- `interactionCreate`
- `messageCreate`
- `messageUpdate`
- `messageDelete`
- `guildMemberAdd`
- `guildMemberRemove`

Required intents:

- `ready`: none
- `interactionCreate`: `Guilds`
- `messageCreate`, `messageUpdate`, `messageDelete`: `GuildMessages`
- `guildMemberAdd`, `guildMemberRemove`: `GuildMembers`

Notes:

- `MessageContent` is needed if the app needs message text instead of metadata-only delivery.
- Event subscriptions are app-driven. The bot does not register events manually.
- The host only forwards events that at least one connected app subscribed to.

## Built-in actions

- `sendMessage`
- `editMessage`
- `deleteMessage`
- `replyToInteraction`
- `deferInteraction`
- `followUpInteraction`
- `banMember`
- `kickMember`
- `addMemberRole`
- `removeMemberRole`

All actions return `Promise<ActionResult<T>>`, not thrown success values.

## Key payload families

- Event payloads: `BotEventPayloadMap`
- Action payloads: `BotActionPayloadMap`
- Action results: `BotActionResultDataMap`
- JSON entity types:
  - `BridgeUser`
  - `BridgeMessage`
  - `BridgeDeletedMessage`
  - `BridgeInteraction`
  - `BridgeGuildMember`

These are normalized Shardwire payloads, not raw `discord.js` instances.

## Filters

`app.on(name, handler, filter?)` supports:

- `guildId`
- `channelId`
- `userId`
- `commandName`

Use filters to reduce traffic for high-volume events such as `messageCreate`.

## Capability rules

- Capabilities are negotiated during auth.
- Available events depend on enabled intents and secret scopes.
- Available actions depend on secret scopes.
- If the app subscribes to an unavailable event before `ready()`, `app.ready()` can reject with `BridgeCapabilityError`.
