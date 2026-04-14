# Shardwire

[![npm version](https://img.shields.io/npm/v/shardwire)](https://www.npmjs.com/package/shardwire)
[![npm downloads](https://img.shields.io/npm/dm/shardwire)](https://www.npmjs.com/package/shardwire)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.18-339933)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Discord-first bridge for streaming bot events to external apps and executing bot actions over one WebSocket connection.

Shardwire is built for a common architecture: your Discord bot runs in one process, while your web app, backend API, worker, or dashboard runs in another.

## Why Shardwire

- **Discord-first API**: no generic command bus wiring required.
- **App-friendly payloads**: receive normalized JSON payloads instead of live `discord.js` objects.
- **Built-in actions**: send messages, reply to interactions, moderate members, and more from your app process.
- **Scoped permissions**: restrict each app secret to specific events and actions.
- **Capability-aware runtime**: apps can inspect what they are allowed to subscribe to and invoke.

## Requirements

- Node.js `>=18.18`
- A Discord bot token (`DISCORD_TOKEN`)
- At least one shared bridge secret (`SHARDWIRE_SECRET`)
- Discord gateway intents that match the events you want

## Install

```bash
npm install shardwire
```

## Documentation

- [Deployment (TLS, nginx, limits, shutdown)](./docs/deployment.md)
- [Troubleshooting (auth, capabilities, action errors)](./docs/troubleshooting.md)
- [Patterns (moderation, interactions, multi-secret)](./docs/patterns.md)
- [Community pain points research (web app ↔ Discord bot bridging)](./docs/community-pain-points.md)

## Quick Start

### 1) Start the bot bridge process

```ts
import { createBotBridge } from 'shardwire';

const bridge = createBotBridge({
	token: process.env.DISCORD_TOKEN!,
	intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions', 'MessageContent', 'GuildMembers'],
	server: {
		port: 3001,
		secrets: [process.env.SHARDWIRE_SECRET!],
	},
});

await bridge.ready();
console.log('Bot bridge listening on ws://127.0.0.1:3001/shardwire');
```

### 2) Connect from your app process

```ts
import { connectBotBridge } from 'shardwire';

const app = connectBotBridge({
	url: 'ws://127.0.0.1:3001/shardwire',
	secret: process.env.SHARDWIRE_SECRET!,
	appName: 'dashboard',
});

app.on('ready', ({ user }) => {
	console.log('Bot ready as', user.username);
});

app.on('messageCreate', ({ message }) => {
	console.log(message.channelId, message.content);
});

await app.ready();
```

### 3) Call bot actions from your app

```ts
const result = await app.actions.sendMessage({
	channelId: '123456789012345678',
	content: 'Hello from app side',
});

if (!result.ok) {
	console.error(result.error.code, result.error.message);
}
```

### 4) Filter subscriptions when needed

```ts
app.on(
	'messageCreate',
	({ message }) => {
		console.log('Only this channel:', message.content);
	},
	{ channelId: '123456789012345678' },
);
```

## Startup lifecycle

- **`createBotBridge(...)`** starts the WebSocket server immediately; `await bridge.ready()` resolves when the Discord client has finished its initial `ready` handshake (same timing you would expect from a normal bot login).
- **Register `app.on(...)` handlers before `await app.ready()`** so subscriptions are known when the app authenticates. `ready()` connects, completes auth, negotiates capabilities from intents + secret scope, then throws `BridgeCapabilityError` if any registered handler targets an event the app is not allowed to receive. To probe connectivity and negotiated caps first (and validate a planned surface with `desired`), use **`await app.preflight(desired)`** before registering handlers.
- **Sticky `ready`**: if the bot was already ready before the app connected, the bridge replays the latest `ready` payload to matching subscriptions after auth.

## Built-In Events

Apps subscribe to events with `app.on(...)`. The bridge forwards only what each app subscribes to.

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

Supported filters:

- `guildId`
- `channelId`
- `userId`
- `commandName` (for `interactionCreate`)
- `customId` (for `interactionCreate`)
- `interactionKind` (for `interactionCreate`)
- `channelType` (Discord `ChannelType` when present on the payload, for example `messageCreate` / `messageBulkDelete`)
- `parentChannelId` (category parent, forum/text parent for threads, or thread parent when serialized)
- `threadId` (guild thread channels only: matches thread channel ids)

### Intent Notes

- `ready` and `interactionCreate`: no specific event intent requirement
- `messageCreate`, `messageUpdate`, `messageDelete`, `messageBulkDelete`: `GuildMessages`
- `messageReactionAdd`, `messageReactionRemove`: `GuildMessageReactions`
- `guildCreate`, `guildDelete`, `threadCreate`, `threadUpdate`, `threadDelete`, `channelCreate`, `channelUpdate`, `channelDelete`: `Guilds`
- `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`: `GuildMembers`

## Built-In Actions

`app.actions.*` includes:

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

All actions return:

```ts
type ActionResult<T> =
	| { ok: true; requestId: string; ts: number; data: T }
	| { ok: false; requestId: string; ts: number; error: { code: string; message: string; details?: unknown } };
```

### Idempotency for safe retries

You can provide an `idempotencyKey` in action options so repeated calls return the first result while the server-side entry is still valid (default TTL **120s**).

- **Default scope (`connection`)**: dedupe is per WebSocket connection (a reconnect is a new connection and does not replay prior keys).
- **Optional scope (`secret`)**: set `server.idempotencyScope: "secret"` on the bot bridge to dedupe by configured secret id across connections (useful when the app reconnects and retries the same logical operation).

```ts
await app.actions.sendMessage(
	{ channelId: '123456789012345678', content: 'Hello once' },
	{ idempotencyKey: 'notify:order:123' },
);
```

Tune limits on the bot bridge when needed:

```ts
server: {
  port: 3001,
  secrets: [process.env.SHARDWIRE_SECRET!],
  maxPayloadBytes: 65536, // per-frame JSON limit (default 65536)
  idempotencyScope: "secret",
  idempotencyTtlMs: 120_000,
},
```

### App-side action metrics

```ts
const app = connectBotBridge({
	url: 'ws://127.0.0.1:3001/shardwire',
	secret: process.env.SHARDWIRE_SECRET!,
	metrics: {
		onActionComplete(meta) {
			console.log(meta.name, meta.durationMs, meta.ok, meta.errorCode, meta.discordStatus, meta.retryAfterMs);
		},
	},
});
```

On Discord **429** responses, failed actions surface `SERVICE_UNAVAILABLE` with `details.retryAfterMs` (when Discord provides `retry_after`) and the metrics hook receives `retryAfterMs` / `discordStatus` for backoff and dashboards.

## Secret Scopes

Use a plain string secret for full event/action access:

```ts
server: {
  port: 3001,
  secrets: ["full-access-secret"],
}
```

Use a scoped secret to limit what an app can do:

```ts
server: {
  port: 3001,
  secrets: [
    {
      id: "dashboard",
      value: process.env.SHARDWIRE_SECRET!,
      allow: {
        events: ["ready", "messageCreate"],
        actions: ["sendMessage", "replyToInteraction"],
      },
    },
  ],
}
```

Inspect negotiated capabilities in the app:

```ts
const capabilities = app.capabilities();
console.log(capabilities.events, capabilities.actions);
```

### Discovery, preflight, and workflow helpers

- **`app.catalog()`** — static list of built-in events (with required gateway intents), actions, and subscription filter keys (no connection required).
- **`getShardwireCatalog()`** — same data without an `AppBridge` instance.
- **`app.explainCapability({ kind: 'event' | 'action', name })`** — whether a name is built-in and, after connect, whether the negotiated bridge allows it.
- **`app.preflight(desired?)`** — awaits auth, returns `issues[]` (errors/warnings) for transport hints, `desired` vs negotiated caps, and subscription/capability mismatches. Prefer calling **before** `app.on(...)` if you want to validate `desired.events` / `desired.actions` without registering handlers yet.
- **Workflows** — `deferThenEditInteractionReply`, `deferUpdateThenEditInteractionReply`, `createThreadThenSendMessage` chain common action sequences.

`FORBIDDEN` results for actions outside negotiated capabilities include `error.details.reasonCode === 'action_not_in_capabilities'`. `BridgeCapabilityError` from `ready()` / `on()` may include `details.requiredIntents` for disallowed event subscriptions.

## Run the Included Examples

### Minimal (single shared secret)

```bash
# terminal 1
DISCORD_TOKEN=your-token SHARDWIRE_SECRET=dev-secret npm run example:bot
```

```bash
# terminal 2
SHARDWIRE_SECRET=dev-secret npm run example:app
```

- Bot bridge: [`examples/bot-basic.ts`](./examples/bot-basic.ts)
- App client: [`examples/app-basic.ts`](./examples/app-basic.ts)

### Production-style (scoped secrets + moderation + interactions)

Use **two different** secret strings (bridge rejects duplicate values across scoped entries).

```bash
# terminal 1 — bot with dashboard + moderation scopes
DISCORD_TOKEN=your-token \
  SHARDWIRE_SECRET_DASHBOARD=dashboard-secret \
  SHARDWIRE_SECRET_MODERATION=moderation-secret \
  npm run example:bot:prod
```

```bash
# terminal 2 — delete messages that contain the demo trigger (optional channel filter)
SHARDWIRE_SECRET_MODERATION=moderation-secret \
  MOD_ALERT_CHANNEL_ID=123456789012345678 \
  npm run example:app:moderation
```

```bash
# terminal 3 — defer + edit reply for `customId: shardwire.demo.btn` buttons
SHARDWIRE_SECRET_MODERATION=moderation-secret \
  npm run example:app:interaction
```

- [`examples/bot-production.ts`](./examples/bot-production.ts)
- [`examples/app-moderation.ts`](./examples/app-moderation.ts)
- [`examples/app-interaction.ts`](./examples/app-interaction.ts)

## Public API

```ts
import {
	connectBotBridge,
	createBotBridge,
	createThreadThenSendMessage,
	deferThenEditInteractionReply,
	getShardwireCatalog,
} from 'shardwire';
```

Main exports include:

- `createBotBridge(options)`
- `connectBotBridge(options)`
- `getShardwireCatalog()`
- `deferThenEditInteractionReply`, `deferUpdateThenEditInteractionReply`, `createThreadThenSendMessage`
- `BridgeCapabilityError`
- bot/app option types
- normalized event payload types (for example `BridgeMessage`, `BridgeInteraction`, `BridgeGuildMember`)
- action payload and result types

## Security and Transport Notes

- Use `wss://` for non-loopback deployments.
- `ws://` is only accepted for loopback hosts (`127.0.0.1`, `localhost`, `::1`).
- Event availability depends on enabled intents and secret scope.

**Reporting vulnerabilities:** email [cored.developments@gmail.com](mailto:cored.developments@gmail.com) with enough detail to reproduce the issue (versions, config shape, and steps). Do not open a public issue for undisclosed security problems.

**Rotating bridge secrets without downtime:** configure **two** entries in `server.secrets` (old + new values), roll the app env to the new secret, then remove the old entry on the next deploy. Scoped secrets should keep **distinct** `id` values so apps can pin `secretId` during rotation.

## Contributing

Issues and pull requests are welcome: [github.com/unloopedmido/shardwire](https://github.com/unloopedmido/shardwire).

## License

MIT - see [`LICENSE`](./LICENSE).
