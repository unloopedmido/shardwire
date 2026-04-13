# Example: App Integration (Command + Event)

Use this when a developer wants a web/dashboard action to trigger bot behavior and get realtime updates back.

## Scenario

- Command from consumer: `ban-user`
- Event from host: `member-joined`

## Host snippet (bot process)

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  client: discordClient,
  server: { port: 3001, secrets: [process.env.SHARDWIRE_SECRET!], primarySecretId: "s0" },
});

wire.onCommand("ban-user", async ({ userId }) => {
  await guild.members.ban(userId);
  return { banned: true };
});

wire.emitEvent("member-joined", { userId: "123", guildId: "456" });
```

## Consumer snippet (dashboard/backend)

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  url: "ws://bot-host:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "s0",
});

const result = await wire.send("ban-user", { userId: "123" });
if (!result.ok) console.error(result.error);

wire.on("member-joined", (payload) => {
  updateUI(payload);
});
```

## Checklist

- command/event names match on both sides
- payload shapes match the generic maps
- host and consumer share the same secret
- consumer URL uses correct host/port/path
