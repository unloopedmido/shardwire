# Shardwire API Surface (Current)

## Public entry points

```ts
import { createBotBridge, connectBotBridge } from "shardwire";
```

## Primary APIs

- `createBotBridge(options)` - starts bot-side bridge runtime/server.
- `connectBotBridge(options)` - app-side client connection to bridge.
- `BridgeCapabilityError` - capability/permission related error type.

## Built-in events (app subscriptions via `app.on`)

- `ready`
- `interactionCreate`
- `messageCreate`
- `messageUpdate`
- `messageDelete`
- `messageReactionAdd`
- `messageReactionRemove`
- `guildCreate`
- `guildDelete`
- `guildMemberAdd`
- `guildMemberRemove`
- `guildMemberUpdate`
- `threadCreate`
- `threadUpdate`
- `threadDelete`

## Subscription filters

- `guildId`
- `channelId`
- `userId`
- `commandName` (for `interactionCreate`)
- `customId` (for `interactionCreate`)
- `interactionKind` (for `interactionCreate`)

## Built-in actions (`app.actions.*`)

- `sendMessage`
- `editMessage`
- `deleteMessage`
- `replyToInteraction`
- `deferInteraction`
- `deferUpdateInteraction`
- `followUpInteraction`
- `editInteractionReply`
- `deleteInteractionReply`
- `updateInteraction`
- `showModal`
- `fetchMessage`
- `fetchMember`
- `banMember`
- `kickMember`
- `addMemberRole`
- `removeMemberRole`
- `addMessageReaction`
- `removeOwnMessageReaction`

## Action result shape

```ts
type ActionResult<T> =
  | { ok: true; requestId: string; ts: number; data: T }
  | { ok: false; requestId: string; ts: number; error: { code: string; message: string; details?: unknown } };
```

Always branch on `result.ok` before using `data`.

## Intent alignment notes

- `ready` and `interactionCreate`: no specific event intent requirement.
- `messageCreate`, `messageUpdate`, `messageDelete`: `GuildMessages`
- `messageReactionAdd`, `messageReactionRemove`: `GuildMessageReactions`
- `guildMemberAdd`, `guildMemberRemove`: `GuildMembers`

## Secret permissions model

Server accepts:
- Plain string secret for full access.
- Scoped secret object with `allow.events` and `allow.actions`.

App can inspect negotiated capabilities using:

```ts
const caps = app.capabilities();
```

Use this during startup and troubleshooting.
