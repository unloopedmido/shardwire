import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { BridgeCapabilityError, connectBotBridge, createBotBridge } from "../src";
import { createBotBridgeWithRuntime } from "../src/bot";
import { authenticateSecret } from "../src/bridge/transport/server";
import { serializeInteraction } from "../src/discord/runtime/serializers";
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

  it("rejects duplicate secret values even when ids differ", () => {
    expect(() =>
      createBotBridge({
        token: "fake-token",
        intents: ["Guilds"],
        server: {
          port: 3001,
          secrets: [
            {
              id: "full-access",
              value: "shared-secret",
            },
            {
              id: "limited-access",
              value: "shared-secret",
              allow: {
                events: ["ready"],
              },
            },
          ],
        },
      }),
    ).toThrow(/duplicate secret value/i);
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

  it("keeps interactionCreate available without Guilds intent", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["GuildMessages"],
        server: {
          port,
          secrets: [
            {
              id: "interactions",
              value: "secret",
              allow: {
                events: ["interactionCreate"],
                actions: [],
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
      secretId: "interactions",
    });

    await Promise.all([bot.ready(), app.ready()]);

    expect(app.capabilities()).toEqual({
      events: ["interactionCreate"],
      actions: [],
    });

    await app.close();
    await bot.close();
  });

  it("gates reaction events behind GuildMessageReactions intent", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["GuildMessages"],
        server: {
          port,
          secrets: [
            {
              id: "reactions",
              value: "secret",
              allow: {
                events: ["messageReactionAdd"],
                actions: [],
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
      secretId: "reactions",
    });

    app.on("messageReactionAdd", () => undefined);

    await bot.ready();
    await expect(app.ready()).rejects.toBeInstanceOf(BridgeCapabilityError);

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

  it("rejects ambiguous value-only auth matches as a runtime backstop", () => {
    const authResult = authenticateSecret(
      {
        secret: "shared-secret",
      },
      [
        {
          id: "full",
          value: "shared-secret",
          scope: {
            events: "*",
            actions: "*",
          },
        },
        {
          id: "limited",
          value: "shared-secret",
          scope: {
            events: new Set(["ready"]),
            actions: new Set(["sendMessage"]),
          },
        },
      ],
      () => ({
        events: ["ready"],
        actions: ["sendMessage"],
      }),
    );

    expect(authResult).toEqual({
      ok: false,
      reason: "ambiguous_secret",
    });
  });

  it("does not expose the Discord interaction token in serialized payloads", () => {
    const serialized = serializeInteraction({
      id: "interaction-1",
      applicationId: "app-1",
      token: "discord-interaction-token",
      guildId: "guild-1",
      channelId: "channel-1",
      user: {
        id: "user-1",
        username: "tester",
        discriminator: "0",
        globalName: null,
        displayAvatarURL: () => "https://example.com/avatar.png",
        bot: false,
        system: false,
      },
      member: null,
      isChatInputCommand: () => false,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isUserSelectMenu: () => false,
      isRoleSelectMenu: () => false,
      isMentionableSelectMenu: () => false,
      isChannelSelectMenu: () => false,
      isModalSubmit: () => false,
    } as never);

    expect(serialized).not.toHaveProperty("token");
    expect(serialized).toMatchObject({
      id: "interaction-1",
      applicationId: "app-1",
      guildId: "guild-1",
      channelId: "channel-1",
      kind: "unknown",
      user: {
        id: "user-1",
        username: "tester",
      },
    });
  });
});
