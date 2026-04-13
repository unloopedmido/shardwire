# Shardwire

Discord events and bot actions, streamed to your app over a single WebSocket bridge.

Shardwire runs your bot connection, listens to Discord, and exposes a clean app-facing API for:

- subscribing to Discord events
- replying to interactions
- sending and editing messages
- moderation actions like ban, kick, and role changes

It is designed for one common setup:

> your Discord bot lives in one process, while your web app, backend, or worker lives somewhere else

## Why Shardwire

- **Discord-first**: no generic command bus or event map setup
- **Token-first**: start the bot bridge with `token`, `intents`, and `server`
- **App-friendly payloads**: normalized JSON, not live `discord.js` objects
- **Built-in actions**: call `app.actions.sendMessage(...)`, `app.actions.replyToInteraction(...)`, and more
- **Scoped secrets**: optionally limit which apps can subscribe to which events or invoke which actions

## Install

```bash
npm install shardwire
```

## Quick Start

### 1. Start the bot bridge

```ts
import { createBotBridge } from "shardwire";

const bridge = createBotBridge({
  token: process.env.DISCORD_TOKEN!,
  intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
  },
});

await bridge.ready();
```

### 2. Connect from your app

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

### 2.5 Filter subscriptions when you need less noise

```ts
app.on(
  "messageCreate",
  ({ message }) => {
    console.log("Only channel 123:", message.content);
  },
  { channelId: "123456789012345678" },
);
```

### 3. Call built-in bot actions

```ts
const result = await app.actions.sendMessage({
  channelId: "123456789012345678",
  content: "Hello from the app side",
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
}
```

## Built-In Events

Shardwire currently exposes these bot-side events:

- `ready`
- `interactionCreate`
- `messageCreate`
- `messageUpdate`
- `messageDelete`
- `guildMemberAdd`
- `guildMemberRemove`

Subscriptions are app-driven. The bot bridge does not need per-event setup. Your app subscribes by calling `app.on(...)`, and the host only forwards the events that app is listening to.

Optional filters can narrow delivery by:

- `guildId`
- `channelId`
- `userId`
- `commandName` for `interactionCreate`

## Built-In Actions

`app.actions.*` currently includes:

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

Every action returns an `ActionResult<T>`:

```ts
type ActionResult<T> =
  | { ok: true; requestId: string; ts: number; data: T }
  | { ok: false; requestId: string; ts: number; error: { code: string; message: string; details?: unknown } };
```

## Secret Scopes

Use a plain string secret for full access:

```ts
server: {
  port: 3001,
  secrets: ["full-access-secret"],
}
```

Or scope a secret to specific events and actions:

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

On the app side, you can inspect what the connection is allowed to do:

```ts
const capabilities = app.capabilities();
console.log(capabilities.events, capabilities.actions);
```

## Public API

```ts
import { createBotBridge, connectBotBridge } from "shardwire";
```

Main exports:

- `createBotBridge(options)`
- `connectBotBridge(options)`
- `BridgeCapabilityError`
- bot/app option types
- normalized event payload types like `BridgeMessage`, `BridgeInteraction`, and `BridgeGuildMember`
- action payload/result types

## Notes

- Non-loopback app connections should use `wss://`
- `discord.js` is used internally by the default runtime, but apps interact with Shardwire through Shardwire's own JSON payloads
- Event availability depends on the intents you enable for the bot bridge

## Examples

- Bot: [examples/bot-basic.ts](/home/looped/dev/packages/shardwire/examples/bot-basic.ts)
- App: [examples/app-basic.ts](/home/looped/dev/packages/shardwire/examples/app-basic.ts)
