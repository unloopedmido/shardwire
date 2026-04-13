import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createShardwire, fromZodSchema } from "../src";

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
      ping: {
        request: { value: string };
        response: { echoed: string };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["test-secret"] },
      name: "test-host",
    });

    host.onCommand("ping", ({ value }) => ({ echoed: value }));

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "test-secret",
      secretId: "s0",
      clientName: "test-consumer",
      requestTimeoutMs: 1500,
    });

    await consumer.ready();
    expect(consumer.connected()).toBe(true);
    expect(consumer.connectionId()).toBeTruthy();

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
      server: { port, secrets: ["event-secret"] },
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
      ping: {
        request: { value: string };
        response: { echoed: string };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["valid-secret"] },
    });

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "invalid-secret",
      requestTimeoutMs: 500,
    });

    const result = await consumer.send("ping", { value: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }

    await consumer.close();
    await host.close();
  });

  it("returns unauthorized when secret id is unknown", async () => {
    type Commands = {
      ping: {
        request: { value: string };
        response: { echoed: string };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["valid-secret"], primarySecretId: "s0" },
    });

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "valid-secret",
      secretId: "s1",
      requestTimeoutMs: 500,
    });

    const result = await consumer.send("ping", { value: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }

    await consumer.close();
    await host.close();
  });

  it("fails in-flight commands when transport closes", async () => {
    type Commands = {
      slow: {
        request: { value: string };
        response: { echoed: string };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["close-secret"] },
    });

    host.onCommand("slow", async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return { echoed: value };
    });

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "close-secret",
      requestTimeoutMs: 10000,
    });

    await consumer.ready();
    const pending = consumer.send("slow", { value: "x" });
    await consumer.close();

    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DISCONNECTED");
    }

    await host.close();
  });

  it("returns validation error details for invalid command payload", async () => {
    type Commands = {
      "ban-user": {
        request: { userId: string };
        response: { banned: true; userId: string };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["schema-secret"] },
      validation: {
        commands: {
          "ban-user": {
            request: fromZodSchema(
              z.object({
                userId: z.string().min(3),
              }),
            ),
          },
        },
      },
    });

    host.onCommand("ban-user", ({ userId }) => ({ banned: true, userId }));

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "schema-secret",
      secretId: "s0",
      requestTimeoutMs: 1000,
    });

    const result = await consumer.send("ban-user", { userId: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toEqual(
        expect.objectContaining({
          name: "ban-user",
          stage: "command.request",
          issues: expect.arrayContaining([
            expect.objectContaining({
              message: expect.any(String),
            }),
          ]),
        }),
      );
    }

    await consumer.close();
    await host.close();
  });
});
