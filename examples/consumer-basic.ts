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

async function main(): Promise<void> {
  const wire = createShardwire<Commands, Events>({
    url: `ws://127.0.0.1:${port}/shardwire`,
    secret,
    secretId: "s0",
    clientName: "example-consumer",
  });

  wire.onConnected(({ connectionId }) => {
    console.log("Connected with id:", connectionId);
  });

  wire.onDisconnected(({ reason, willReconnect }) => {
    console.log("Disconnected:", reason, "reconnect:", willReconnect);
  });

  wire.on("heartbeat", (payload) => {
    console.log("heartbeat:", payload.host, payload.at);
  });

  await wire.ready();

  const result = await wire.send("ping", { value: "hello" });
  if (result.ok) {
    console.log("Command result:", result.data.echoed, result.data.handledAt);
  } else {
    console.error("Command failed:", result.error.code, result.error.message);
  }

  setTimeout(async () => {
    await wire.close();
    process.exit(0);
  }, 12000);
}

void main();
