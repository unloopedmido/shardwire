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

async function waitFor(assertion: () => void, timeoutMs = 4000, intervalMs = 25): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Timed out while waiting for condition.");
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

  it("does not dedupe across different consumer connections", async () => {
    type Commands = {
      ping: {
        request: { value: string };
        response: { echoed: string; call: number };
      };
    };

    const port = await getFreePort();
    const host = createShardwire<Commands, {}>({
      server: { port, secrets: ["shared-secret"] },
    });

    let calls = 0;
    host.onCommand("ping", ({ value }) => {
      calls += 1;
      return { echoed: value, call: calls };
    });

    const consumerA = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
      secretId: "s0",
    });
    const consumerB = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
      secretId: "s0",
    });

    await Promise.all([consumerA.ready(), consumerB.ready()]);

    const requestId = "req-shared";
    const first = await consumerA.send("ping", { value: "a" }, { requestId });
    const second = await consumerB.send("ping", { value: "b" }, { requestId });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data.echoed).toBe("a");
      expect(second.data.echoed).toBe("b");
      expect(first.data.call).toBe(1);
      expect(second.data.call).toBe(2);
    }

    await consumerA.close();
    await consumerB.close();
    await host.close();
  });

  it("reconnects automatically and resumes command delivery", async () => {
    type Commands = {
      ping: {
        request: { value: string };
        response: { echoed: string };
      };
    };

    const port = await getFreePort();
    let host = createShardwire<Commands, {}>({
      server: { port, secrets: ["reconnect-secret"] },
    });
    host.onCommand("ping", ({ value }) => ({ echoed: value }));

    const consumer = createShardwire<Commands, {}>({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "reconnect-secret",
      reconnect: {
        enabled: true,
        initialDelayMs: 50,
        maxDelayMs: 100,
        jitter: false,
      },
      requestTimeoutMs: 1000,
    });

    let reconnectSignals = 0;
    const stop = consumer.onReconnecting(() => {
      reconnectSignals += 1;
    });

    await consumer.ready();
    await host.close();

    await waitFor(() => {
      expect(reconnectSignals).toBeGreaterThan(0);
    });

    host = createShardwire<Commands, {}>({
      server: { port, secrets: ["reconnect-secret"] },
    });
    host.onCommand("ping", ({ value }) => ({ echoed: value }));

    await waitFor(() => {
      expect(consumer.connected()).toBe(true);
    }, 5000);

    const result = await consumer.send("ping", { value: "ok" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ echoed: "ok" });
    }

    stop();
    await consumer.close();
    await host.close();
  });
});
