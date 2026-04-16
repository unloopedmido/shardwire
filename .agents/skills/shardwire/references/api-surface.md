# Shardwire API Surface (Current)

Website reference: `https://shardwire.js.org/`
Error reference: `https://shardwire.js.org/docs/operations/troubleshooting/`

## Public entry points

```ts
import {
	connectBotBridge,
	createBotBridge,
	createThreadThenSendMessage,
	deferThenEditInteractionReply,
	defineShardwireApp,
	diagnoseShardwireApp,
	formatShardwireDiagnosis,
	generateSecretScope,
	getShardwireCatalog,
	type FormatShardwireDiagnosisOptions,
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
- `formatShardwireDiagnosis(report, options?)` - stable, human-readable string from a diagnosis report (strict-startup errors, CI preflight, deploy logs). Options include **`title`**, **`omitScopeSummary`**, etc. (`FormatShardwireDiagnosisOptions`).
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
- `messageReactionRemoveAll`
- `messageReactionRemoveEmoji`
- `guildCreate`
- `guildDelete`
- `guildUpdate`
- `guildMemberAdd`
- `guildMemberRemove`
- `guildMemberUpdate`
- `threadCreate`
- `threadUpdate`
- `threadDelete`
- `channelCreate`
- `channelUpdate`
- `channelDelete`
- `typingStart`
- `webhooksUpdate`
- `voiceStateUpdate`

## Subscription filters

- `guildId`
- `channelId`
- `userId`
- `messageId`
- `interactionId`
- `commandName` (for `interactionCreate`)
- `customId` (for `interactionCreate`)
- `interactionKind` (for `interactionCreate`)
- `emoji`
- `channelType`
- `parentChannelId`
- `threadId`
- `voiceChannelId`

## Built-in actions (`app.actions.*`)

- `sendMessage`
- `sendDirectMessage`
- `editMessage`
- `deleteMessage`
- `pinMessage`
- `unpinMessage`
- `bulkDeleteMessages`
- `replyToInteraction`
- `deferInteraction`
- `deferUpdateInteraction`
- `followUpInteraction`
- `editInteractionReply`
- `deleteInteractionReply`
- `updateInteraction`
- `showModal`
- `fetchMessage`
- `fetchChannel`
- `fetchThread`
- `fetchGuild`
- `fetchMember`
- `banMember`
- `unbanMember`
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
- `messageReactionAdd`, `messageReactionRemove`, `messageReactionRemoveAll`, `messageReactionRemoveEmoji`: `GuildMessageReactions`
- `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`: `GuildMembers`
- `guildCreate`, `guildDelete`, `guildUpdate`, `threadCreate`, `threadUpdate`, `threadDelete`, `channelCreate`, `channelUpdate`, `channelDelete`: `Guilds`
- `typingStart`: `GuildMessageTyping`
- `webhooksUpdate`: `GuildWebhooks`
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

## React app processes (`@shardwire/react`)

Optional workspace package for dashboards and controllers (v1.9.0+). **Does not** declare `react` as a dependency of core `shardwire` — install `react`, `shardwire`, and `@shardwire/react`.

- `useShardwireBridge(options, ready?)` — connect on mount, `await ready(...)`, close on unmount; memoize `options` when stable.
- `useShardwireCapabilities(app, isReady)` — negotiated caps when connected.
- `useShardwireEvent(app, event, handler, filter?, enabled?)` — subscription with a stable handler ref.

Repo entry: `packages/react/README.md`. For app-specific RPC or shared state beside Shardwire, see **Concepts → Custom domain contracts**.

## Error links convention

Many runtime/config errors include:

`See: https://shardwire.js.org/docs/operations/troubleshooting/#<anchor>`

When this appears, route users to the exact anchor and provide concise remediation.
