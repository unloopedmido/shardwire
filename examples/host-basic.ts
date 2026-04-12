import { createShardwire } from "../src";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const PORT = Number(process.env.SHARDWIRE_PORT ?? 3001);
const SECRET = process.env.SHARDWIRE_SECRET ?? "local-dev-secret";

const wire = createShardwire<Commands, Events>({
  server: {
    port: PORT,
    secret: SECRET,
  },
  name: "example-host",
});

wire.onCommand("ban-user", async ({ userId }) => {
  console.log(`[host] banning user ${userId}`);
  return { banned: true, userId };
});

let emitted = 0;
const interval = setInterval(() => {
  emitted += 1;
  wire.emitEvent("member-joined", {
    userId: `user-${emitted}`,
    guildId: "guild-1",
  });
  console.log("[host] emitted member-joined event", emitted);
}, 4000);

console.log(`[host] shardwire listening on ws://localhost:${PORT}/shardwire`);
console.log(`[host] secret: ${SECRET}`);

const shutdown = async () => {
  clearInterval(interval);
  await wire.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
