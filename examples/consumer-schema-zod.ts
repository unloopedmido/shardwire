import { createShardwire } from "../src";

type Commands = {
  "ban-user": {
    request: { userId: string; reason?: string };
    response: { banned: true; userId: string; reason?: string };
  };
};

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? "dev-secret";

async function main(): Promise<void> {
  const wire = createShardwire<Commands, {}>({
    url: `ws://127.0.0.1:${port}/shardwire`,
    secret,
    secretId: "s0",
    clientName: "schema-consumer",
  });

  await wire.ready();

  const bad = await wire.send("ban-user", { userId: "x" });
  if (!bad.ok) {
    console.error("Invalid payload rejected:", bad.error.code, bad.error.message, bad.error.details);
  }

  const good = await wire.send("ban-user", {
    userId: "123456789012345678",
    reason: "spam",
  });
  if (good.ok) {
    console.log("Command result:", good.data);
  } else {
    console.error("Command failed:", good.error.code, good.error.message);
  }

  await wire.close();
}

void main();
