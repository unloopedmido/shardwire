import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { connectBotBridge } from "../src";
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

describe("discord-first bridge integration", () => {
  it("delivers only subscribed events and keeps ready sticky", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages", "GuildMembers"],
        server: {
          port,
          secrets: ["shared-secret"],
        },
      },
      runtime,
    );

    await bot.ready();
    runtime.emit("ready", {
      receivedAt: Date.now(),
      user: {
        id: "bot-user",
        username: "bot",
        discriminator: "0",
        bot: true,
        system: false,
      },
    });

    const appA = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
    });
    const appB = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
    });

    const readyEvents: string[] = [];
    const messageEventsA: string[] = [];
    const memberEventsB: string[] = [];

    appA.on("ready", ({ user }) => {
      readyEvents.push(user.id);
    });
    appA.on("messageCreate", ({ message }) => {
      messageEventsA.push(message.id);
    });
    appB.on("guildMemberAdd", ({ member }) => {
      memberEventsB.push(member.id);
    });

    await Promise.all([appA.ready(), appB.ready()]);

    await waitFor(() => {
      expect(readyEvents).toEqual(["bot-user"]);
    });

    runtime.emit("messageCreate", {
      receivedAt: Date.now(),
      message: {
        id: "msg-1",
        channelId: "channel-1",
        content: "hello",
        attachments: [],
        embeds: [],
      },
    });
    runtime.emit("guildMemberAdd", {
      receivedAt: Date.now(),
      member: {
        id: "member-1",
        guildId: "guild-1",
        roles: [],
      },
    });

    await waitFor(() => {
      expect(messageEventsA).toEqual(["msg-1"]);
      expect(memberEventsB).toEqual(["member-1"]);
    });

    await appA.close();
    await appB.close();
    await bot.close();
  });

  it("round-trips built-in actions through the app actions API", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages", "GuildMembers"],
        server: {
          port,
          secrets: ["shared-secret"],
        },
      },
      runtime,
    );

    runtime.setActionHandler("sendMessage", async ({ channelId, content }) => ({
      id: "msg-1",
      channelId,
      content,
      attachments: [],
      embeds: [],
    }));
    runtime.setActionHandler("banMember", async ({ guildId, userId }) => ({
      guildId,
      userId,
    }));
    runtime.setActionHandler("addMemberRole", async ({ guildId, userId, roleId }) => ({
      id: userId,
      guildId,
      roles: [roleId],
    }));

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
    });

    await Promise.all([bot.ready(), app.ready()]);

    const sent = await app.actions.sendMessage({
      channelId: "channel-1",
      content: "hello",
    });
    const banned = await app.actions.banMember({
      guildId: "guild-1",
      userId: "user-1",
    });
    const roleAdded = await app.actions.addMemberRole({
      guildId: "guild-1",
      userId: "user-1",
      roleId: "role-1",
    });

    expect(sent.ok).toBe(true);
    expect(banned.ok).toBe(true);
    expect(roleAdded.ok).toBe(true);

    if (sent.ok) {
      expect(sent.data.content).toBe("hello");
    }
    if (banned.ok) {
      expect(banned.data).toEqual({ guildId: "guild-1", userId: "user-1" });
    }
    if (roleAdded.ok) {
      expect(roleAdded.data.roles).toEqual(["role-1"]);
    }

    await app.close();
    await bot.close();
  });

  it("supports filtered event subscriptions", async () => {
    const port = await getFreePort();
    const runtime = new FakeDiscordRuntime();
    const bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages"],
        server: {
          port,
          secrets: ["shared-secret"],
        },
      },
      runtime,
    );

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
    });

    const channelOneMessages: string[] = [];
    const channelTwoMessages: string[] = [];

    app.on(
      "messageCreate",
      ({ message }) => {
        channelOneMessages.push(message.id);
      },
      { channelId: "channel-1" },
    );
    app.on(
      "messageCreate",
      ({ message }) => {
        channelTwoMessages.push(message.id);
      },
      { channelId: "channel-2" },
    );

    await Promise.all([bot.ready(), app.ready()]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    runtime.emit("messageCreate", {
      receivedAt: Date.now(),
      message: {
        id: "msg-1",
        channelId: "channel-1",
        content: "one",
        attachments: [],
        embeds: [],
      },
    });
    runtime.emit("messageCreate", {
      receivedAt: Date.now(),
      message: {
        id: "msg-2",
        channelId: "channel-2",
        content: "two",
        attachments: [],
        embeds: [],
      },
    });
    runtime.emit("messageCreate", {
      receivedAt: Date.now(),
      message: {
        id: "msg-3",
        channelId: "channel-3",
        content: "three",
        attachments: [],
        embeds: [],
      },
    });

    await waitFor(() => {
      expect(channelOneMessages).toEqual(["msg-1"]);
      expect(channelTwoMessages).toEqual(["msg-2"]);
    });

    await app.close();
    await bot.close();
  });

  it("reconnects, restores subscriptions, and resumes action delivery", async () => {
    const port = await getFreePort();
    let runtime = new FakeDiscordRuntime();
    let bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages"],
        server: {
          port,
          secrets: ["shared-secret"],
        },
      },
      runtime,
    );

    runtime.setActionHandler("sendMessage", async ({ channelId, content }) => ({
      id: "msg-1",
      channelId,
      content,
      attachments: [],
      embeds: [],
    }));

    const app = connectBotBridge({
      url: `ws://127.0.0.1:${port}/shardwire`,
      secret: "shared-secret",
      reconnect: {
        enabled: true,
        initialDelayMs: 50,
        maxDelayMs: 100,
        jitter: false,
      },
    });

    const receivedMessages: string[] = [];
    app.on("messageCreate", ({ message }) => {
      receivedMessages.push(message.id);
    });

    await Promise.all([bot.ready(), app.ready()]);

    await bot.close();

    runtime = new FakeDiscordRuntime();
    bot = createBotBridgeWithRuntime(
      {
        token: "fake-token",
        intents: ["Guilds", "GuildMessages"],
        server: {
          port,
          secrets: ["shared-secret"],
        },
      },
      runtime,
    );

    runtime.setActionHandler("sendMessage", async ({ channelId, content }) => ({
      id: "msg-2",
      channelId,
      content,
      attachments: [],
      embeds: [],
    }));

    await bot.ready();
    await waitFor(() => {
      expect(app.connected()).toBe(true);
    }, 5000);

    runtime.emit("messageCreate", {
      receivedAt: Date.now(),
      message: {
        id: "msg-reconnected",
        channelId: "channel-1",
        content: "back",
        attachments: [],
        embeds: [],
      },
    });

    await waitFor(() => {
      expect(receivedMessages).toContain("msg-reconnected");
    });

    const result = await app.actions.sendMessage({
      channelId: "channel-1",
      content: "after reconnect",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("msg-2");
    }

    await app.close();
    await bot.close();
  });
});
