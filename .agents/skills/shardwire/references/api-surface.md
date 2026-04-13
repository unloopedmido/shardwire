# Shardwire API Surface (Current)

## Public entry points

```ts
import {
	connectBotBridge,
	createBotBridge,
	createThreadThenSendMessage,
	deferThenEditInteractionReply,
	getShardwireCatalog,
} from 'shardwire';
```

## Primary APIs

- `createBotBridge(options)` - starts bot-side bridge runtime/server.
- `connectBotBridge(options)` - app-side client connection to bridge.
- `getShardwireCatalog()` - static catalog of events, actions, and subscription filter keys.
- `deferThenEditInteractionReply`, `deferUpdateThenEditInteractionReply`, `createThreadThenSendMessage` - workflow helpers.
- `BridgeCapabilityError` - capability/permission related error type (optional `details`).

## Built-in events (app subscriptions via `app.on`)

- `ready`
- `interactionCreate`
- `messageCreate`
- `messageUpdate`
- `messageDelete`
- `messageBulkDelete`
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
- `channelCreate`
- `channelUpdate`
- `channelDelete`

## Subscription filters

- `guildId`
- `channelId`
- `userId`
- `commandName` (for `interactionCreate`)
- `customId` (for `interactionCreate`)
- `interactionKind` (for `interactionCreate`)
- `channelType`
- `parentChannelId`
- `threadId`

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
- `timeoutMember`
- `removeMemberTimeout`
- `createChannel`
- `editChannel`
- `deleteChannel`
- `createThread`
- `archiveThread`

## Action result shape

```ts
type ActionResult<T> =
	| { ok: true; requestId: string; ts: number; data: T }
	| { ok: false; requestId: string; ts: number; error: { code: string; message: string; details?: unknown } };
```

Always branch on `result.ok` before using `data`.

## Intent alignment notes

- `ready` and `interactionCreate`: no specific event intent requirement.
- `messageCreate`, `messageUpdate`, `messageDelete`, `messageBulkDelete`: `GuildMessages`
- `messageReactionAdd`, `messageReactionRemove`: `GuildMessageReactions`
- `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`: `GuildMembers`
- `guildCreate`, `guildDelete`, `threadCreate`, `threadUpdate`, `threadDelete`, `channelCreate`, `channelUpdate`, `channelDelete`: `Guilds`

## Secret permissions model

Server accepts:

- Plain string secret for full access.
- Scoped secret object with `allow.events` and `allow.actions`.

App can inspect negotiated capabilities using:

```ts
const caps = app.capabilities();
```

Use this during startup and troubleshooting.

## DX helpers on `AppBridge`

- `app.catalog()` — same surface as `getShardwireCatalog()`.
- `app.explainCapability({ kind: 'event' | 'action', name })` — built-in vs negotiated allow/deny.
- `app.preflight(desired?)` — diagnostics (`issues[]`); call before `app.on(...)` to validate planned `events` / `actions` only.
