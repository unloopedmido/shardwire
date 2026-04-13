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

## Quick Start

### 1) Start the bot bridge process

```ts
import { createBotBridge } from "shardwire";

const bridge = createBotBridge({
  token: process.env.DISCORD_TOKEN!,
  intents: ["Guilds", "GuildMessages", "GuildMessageReactions", "MessageContent", "GuildMembers"],
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
  },
});

await bridge.ready();
console.log("Bot bridge listening on ws://127.0.0.1:3001/shardwire");
```

### 2) Connect from your app process

```ts
import { connectBotBridge } from "shardwire";

const app = connectBotBridge({
  url: "ws://127.0.0.1:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  appName: "dashboard",
});

app.on("ready", ({ user }) => {
  console.log("Bot ready as", user.username);
});

app.on("messageCreate", ({ message }) => {
  console.log(message.channelId, message.content);
});

await app.ready();
```

### 3) Call bot actions from your app

```ts
const result = await app.actions.sendMessage({
  channelId: "123456789012345678",
  content: "Hello from app side",
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
}
```

### 4) Filter subscriptions when needed

```ts
app.on(
  "messageCreate",
  ({ message }) => {
    console.log("Only this channel:", message.content);
  },
  { channelId: "123456789012345678" },
);
```

## Built-In Events

Apps subscribe to events with `app.on(...)`. The bridge forwards only what each app subscribes to.

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

Supported filters:

- `guildId`
- `channelId`
- `userId`
- `commandName` (for `interactionCreate`)
- `customId` (for `interactionCreate`)
- `interactionKind` (for `interactionCreate`)

### Intent Notes

- `ready` and `interactionCreate`: no specific event intent requirement
- `messageCreate`, `messageUpdate`, `messageDelete`: `GuildMessages`
- `messageReactionAdd`, `messageReactionRemove`: `GuildMessageReactions`
- `guildCreate`, `guildDelete`, `threadCreate`, `threadUpdate`, `threadDelete`: `Guilds`
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

All actions return:

```ts
type ActionResult<T> =
  | { ok: true; requestId: string; ts: number; data: T }
  | { ok: false; requestId: string; ts: number; error: { code: string; message: string; details?: unknown } };
```

### Idempotency for safe retries

You can provide an `idempotencyKey` in action options to dedupe repeated requests on the same connection:

```ts
await app.actions.sendMessage(
  { channelId: "123456789012345678", content: "Hello once" },
  { idempotencyKey: "notify:order:123" },
);
```

### App-side action metrics

```ts
const app = connectBotBridge({
  url: "ws://127.0.0.1:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  metrics: {
    onActionComplete(meta) {
      console.log(meta.name, meta.durationMs, meta.ok, meta.errorCode);
    },
  },
});
```

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

## Run the Included Examples

In two terminals:

```bash
# terminal 1
DISCORD_TOKEN=your-token SHARDWIRE_SECRET=dev-secret npm run example:bot
```

```bash
# terminal 2
SHARDWIRE_SECRET=dev-secret npm run example:app
```

Examples:

- Bot bridge: `examples/bot-basic.ts`
- App client: `examples/app-basic.ts`

## Public API

```ts
import { createBotBridge, connectBotBridge } from "shardwire";
```

Main exports include:

- `createBotBridge(options)`
- `connectBotBridge(options)`
- `BridgeCapabilityError`
- bot/app option types
- normalized event payload types (for example `BridgeMessage`, `BridgeInteraction`, `BridgeGuildMember`)
- action payload and result types

## Security and Transport Notes

- Use `wss://` for non-loopback deployments.
- `ws://` is only accepted for loopback hosts (`127.0.0.1`, `localhost`, `::1`).
- Event availability depends on enabled intents and secret scope.

**Reporting vulnerabilities:** email [cored.developments@gmail.com](mailto:cored.developments@gmail.com) with enough detail to reproduce the issue (versions, config shape, and steps). Do not open a public issue for undisclosed security problems.

## Contributing

Issues and pull requests are welcome: [github.com/unloopedmido/shardwire](https://github.com/unloopedmido/shardwire).

## License

MIT - see [`LICENSE`](./LICENSE).
