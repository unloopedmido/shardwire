# Shardwire API Surface (Current)

Website reference: `https://unloopedmido.github.io/shardwire/`
Error reference: `https://unloopedmido.github.io/shardwire/docs/operations/troubleshooting/`

## Public entry points

```ts
import {
	connectBotBridge,
	createBotBridge,
	createThreadThenSendMessage,
	deferThenEditInteractionReply,
	defineShardwireApp,
	diagnoseShardwireApp,
	generateSecretScope,
	getShardwireCatalog,
} from 'shardwire';
```

If user-facing guidance is needed, link directly to website pages instead of repo-local markdown.

## Primary APIs

- `createBotBridge(options)` - starts bot-side bridge runtime/server.
- `connectBotBridge(options)` - app-side client connection to bridge.
- `getShardwireCatalog()` - static catalog of events, actions, and subscription filter keys.
- `defineShardwireApp(definition)` - small manifest: **`events`**, **`actions`**, optional **`filters`**, optional **`name`** (default `shardwire-app`); not for transport/secrets/intents/startup policy.
- `generateSecretScope(manifest)` - minimum `SecretPermissions` lists for scoped secrets.
- `diagnoseShardwireApp(manifest, negotiated, options?)` - manifest vs negotiation; filter **errors**: `unsupported_filter_key`, `filter_key_absent_from_event_metadata` (bridge metadata never includes that key for the event — not “low match” heuristics); `unused_negotiated_*` **warnings** only; **`expectedScope`** opt-in for **`scope_broader_than_expected`** errors.
- `deferThenEditInteractionReply`, `deferUpdateThenEditInteractionReply`, `createThreadThenSendMessage` - workflow helpers.
- `BridgeCapabilityError` - capability/permission related error type (optional `details`).
- `ShardwireStrictStartupError` - thrown from `app.ready({ strict: true, ... })` with `report` payload.

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
- `voiceStateUpdate`

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
- `voiceChannelId`

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
- `moveMemberVoice`
- `setMemberMute`
- `setMemberDeaf`
- `setMemberSuppressed`

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
- `voiceStateUpdate`: `GuildVoiceStates`

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

## Error links convention

Many runtime/config errors include:

`See: https://unloopedmido.github.io/shardwire/docs/operations/troubleshooting/#<anchor>`

When this appears, route users to the exact anchor and provide concise remediation.
