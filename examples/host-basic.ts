import { createShardwire } from "../src";

type Commands = {
  ping: {
    request: { value: string };
    response: { echoed: string; handledAt: string };
  };
};

type Events = {
  heartbeat: { host: string; at: string };
};

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? "dev-secret";

const wire = createShardwire<Commands, Events>({
  name: "example-host",
  server: {
    port,
    secrets: [secret],
    primarySecretId: "s0",
  },
});

wire.onCommand("ping", ({ value }) => {
  return {
    echoed: value,
    handledAt: new Date().toISOString(),
  };
});

const interval = setInterval(() => {
  wire.emitEvent("heartbeat", {
    host: "example-host",
    at: new Date().toISOString(),
  });
}, 5000);

console.log(`Shardwire host running at ws://127.0.0.1:${port}/shardwire`);
console.log("Press Ctrl+C to stop.");

process.on("SIGINT", async () => {
  clearInterval(interval);
  await wire.close();
  process.exit(0);
});
