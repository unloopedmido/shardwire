# Integration Patterns

Use this file for copy-paste setup patterns and common failure handling.

## Basic bot setup

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

Use a scoped secret when one app should see only part of the bridge:

```ts
server: {
  port: 3001,
  secrets: [
    {
      id: "dashboard",
      value: process.env.SHARDWIRE_SECRET!,
      allow: {
        events: ["ready", "messageCreate"],
        actions: ["sendMessage"],
      },
    },
  ],
}
```

## Basic app setup

```ts
import { connectBotBridge } from "shardwire";

const app = connectBotBridge({
  url: "wss://bot.example.com/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "dashboard",
  appName: "dashboard",
});

app.on("ready", ({ user }) => {
  console.log(user.username);
});

app.on("messageCreate", ({ message }) => {
  console.log(message.channelId, message.content);
});

await app.ready();
```

## Filtered subscriptions

Subscribe narrowly when the app only needs one guild, channel, user, or slash command:

```ts
app.on(
  "messageCreate",
  ({ message }) => {
    console.log(message.id);
  },
  { channelId: "123456789012345678" },
);

app.on(
  "interactionCreate",
  ({ interaction }) => {
    console.log(interaction.commandName);
  },
  { commandName: "deploy" },
);
```

## Action calls

```ts
const result = await app.actions.sendMessage({
  channelId: "123456789012345678",
  content: "hello",
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
  return;
}

console.log(result.data.id);
```

For interaction workflows, use the built-in methods:

- `replyToInteraction`
- `deferInteraction`
- `followUpInteraction`

For moderation workflows, use:

- `banMember`
- `kickMember`
- `addMemberRole`
- `removeMemberRole`

## Troubleshooting rules

- Connection opens but `ready()` rejects with `BridgeCapabilityError`:
  - the app subscribed to an event that is unavailable because of bot intents or secret scope
- Message events arrive without content:
  - add `MessageContent` to bot intents
- Action returns `FORBIDDEN`:
  - the action is outside the secret's allowed action list
- App cannot connect remotely over plain `ws://`:
  - use `wss://` for non-loopback connections
- App never receives an event:
  - confirm the app subscribed with `app.on(...)`
  - confirm the event is in `app.capabilities().events`
  - confirm the filter matches the payload actually being emitted
