import { z } from "zod";
import { createShardwire, fromZodSchema } from "../src";

type Commands = {
  "ban-user": {
    request: { userId: string; reason?: string };
    response: { banned: true; userId: string; reason?: string };
  };
};

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? "dev-secret";

const wire = createShardwire<Commands, {}>({
  name: "schema-host",
  server: {
    port,
    secrets: [secret],
    primarySecretId: "s0",
  },
  validation: {
    commands: {
      "ban-user": {
        request: fromZodSchema(
          z.object({
            userId: z.string().min(3),
            reason: z.string().min(2).max(200).optional(),
          }),
        ),
        response: fromZodSchema(
          z.object({
            banned: z.literal(true),
            userId: z.string().min(3),
            reason: z.string().min(2).max(200).optional(),
          }),
        ),
      },
    },
  },
});

wire.onCommand("ban-user", ({ userId, reason }) => {
  return {
    banned: true,
    userId,
    reason,
  };
});

console.log(`Schema host running at ws://127.0.0.1:${port}/shardwire`);
console.log("Press Ctrl+C to stop.");

process.on("SIGINT", async () => {
  await wire.close();
  process.exit(0);
});
