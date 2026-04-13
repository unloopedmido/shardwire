import { createBotBridge } from "../src";

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? "dev-secret";
const token = process.env.DISCORD_TOKEN as string;

if (!token) {
  throw new Error("DISCORD_TOKEN is required.");
}

async function main(): Promise<void> {
  const bridge = createBotBridge({
    token,
    intents: ["Guilds", "GuildMessages", "GuildMessageReactions", "MessageContent", "GuildMembers"],
    server: {
      port,
      secrets: [secret],
    },
  });

  await bridge.ready();
  console.log(`Bot bridge listening at ws://127.0.0.1:${port}/shardwire`);
  console.log("Press Ctrl+C to stop.");

  process.on("SIGINT", async () => {
    await bridge.close();
    process.exit(0);
  });
}

void main();
