import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { createShardwire } from "../src";

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate dynamic port."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

describe("shardwire integration", () => {
  it("executes commands end-to-end", async () => {
    type Commands = {
      ping: { value: string };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secret: "test-secret" },
      name: "test-host",
    });

    host.onCommand("ping", ({ value }) => ({ echoed: value }));

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "test-secret",
      requestTimeoutMs: 1500,
    });

    const result = await consumer.send("ping", { value: "ok" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ echoed: "ok" });
    }

    await consumer.close();
    await host.close();
  });

  it("streams host events to consumer listeners", async () => {
    type Events = {
      "member-joined": { userId: string; guildId: string };
    };

    const port = await getFreePort();
    const host = createShardwire<{}, Events>({
      server: { port, secret: "event-secret" },
      name: "bot-host",
    });

    const consumer = createShardwire<{}, Events>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "event-secret",
    });

    const payloadPromise = new Promise<Events["member-joined"]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Event not received.")), 2000);
      const stop = consumer.on("member-joined", (payload) => {
        clearTimeout(timeout);
        stop();
        resolve(payload);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    host.emitEvent("member-joined", { userId: "123", guildId: "456" });

    const payload = await payloadPromise;
    expect(payload).toEqual({ userId: "123", guildId: "456" });

    await consumer.close();
    await host.close();
  });

  it("returns auth error when shared secret is invalid", async () => {
    type Commands = {
      ping: { value: string };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secret: "valid-secret" },
    });

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "invalid-secret",
      requestTimeoutMs: 500,
    });

    const result = await consumer.send("ping", { value: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AUTH_ERROR");
    }

    await consumer.close();
    await host.close();
  });
});
