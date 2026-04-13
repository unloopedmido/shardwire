import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { BridgeCapabilityError, connectBotBridge, createBotBridge } from "../src";
import { createBotBridgeWithRuntime } from "../src/bot";
import { FakeDiscordRuntime } from "./helpers/fake-runtime";

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

describe("discord-first bridge validation", () => {
  it("throws for invalid bot bridge config", () => {
    expect(() =>
      createBotBridge({
        token: "",
        intents: [],
        server: {
          port: 0,
          secrets: [""],
        },
      }),
    ).toThrow(/token|intent|port|secret/i);
  });

  it("throws for invalid app bridge config", () => {
    expect(() =>
      connectBotBridge({
        url: "http://example.com",
        secret: "",
      } as never),
    ).toThrow(/url|secret/i);
  });

  it("negotiates capabilities from intents and scoped secrets", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages"],
        server: {
          port,
          secrets: [
            {
              id: "scoped",
              value: "secret",
              allow: {
                events: ["messageCreate"],
                actions: ["sendMessage"],
              },
            },
          ],
        },
      },
      runtime,
    );

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "secret",
      secretId: "scoped",
    });

    await Promise.all([bot.ready(), app.ready()]);

    expect(app.capabilities()).toEqual({
      events: ["messageCreate"],
      actions: ["sendMessage"],
    });

    await app.close();
    await bot.close();
  });

  it("rejects unsupported event subscriptions predictably", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds"],
        server: {
          port,
          secrets: [
            {
              id: "limited",
              value: "secret",
              allow: {
                events: ["ready"],
              },
            },
          ],
        },
      },
      runtime,
    );

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "secret",
      secretId: "limited",
    });

    app.on("messageCreate", () => undefined);

    await bot.ready();
    await expect(app.ready()).rejects.toBeInstanceOf(BridgeCapabilityError);

    await app.close();
    await bot.close();
  });

  it("returns FORBIDDEN for actions outside secret scope", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds"],
        server: {
          port,
          secrets: [
            {
              id: "limited",
              value: "secret",
              allow: {
                actions: ["sendMessage"],
              },
            },
          ],
        },
      },
      runtime,
    );

    runtime.setActionHandler("sendMessage", async () => ({
      id: "m1",
      channelId: "c1",
      content: "ok",
      attachments: [],
      embeds: [],
    }));

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "secret",
      secretId: "limited",
    });

    await Promise.all([bot.ready(), app.ready()]);
    const result = await app.actions.deleteMessage({
      channelId: "c1",
      messageId: "m1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }

    await app.close();
    await bot.close();
  });
});
