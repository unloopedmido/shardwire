# Example: Token-Only Host Setup

Use this when the developer does not already have an instantiated `discord.js` client.

## Host snippet

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  token: process.env.DISCORD_BOT_TOKEN!,
  server: {
    port: 3001,
    secret: process.env.SHARDWIRE_SECRET!,
  },
});

wire.onCommand("ban-user", async ({ userId }) => {
  // Execute bot-side action
  return { banned: true, userId };
});
```

## Notes

- Shardwire owns Discord client lifecycle in token-only mode.
- Keep `DISCORD_BOT_TOKEN` and `SHARDWIRE_SECRET` in env vars.
- Pair with a consumer snippet using matching `secret` and URL.
