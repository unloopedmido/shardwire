import { createShardwire } from "../src";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const URL = process.env.SHARDWIRE_URL ?? "ws://localhost:3001/shardwire";
const SECRET = process.env.SHARDWIRE_SECRET ?? "local-dev-secret";

const wire = createShardwire<Commands, Events>({
  url: URL,
  secret: SECRET,
});

wire.on("member-joined", (data, meta) => {
  console.log("[consumer] member-joined event", data, meta);
});

const run = async () => {
  console.log(`[consumer] connecting to ${URL}`);
  const result = await wire.send("ban-user", { userId: "123" });
  console.log("[consumer] command result", result);
};

void run();

const shutdown = async () => {
  await wire.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
