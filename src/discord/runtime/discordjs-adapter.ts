import type { APIAllowedMentions, APIEmbed, Snowflake } from "discord-api-types/v10";
import {
  Client,
  type GuildMember,
  type Interaction,
  type Message,
  MessageFlags,
  type PartialMessage,
  type PartialGuildMember,
} from "discord.js";
import { BOT_INTENT_BITS } from "../catalog";
import type {
  BotActionName,
  BotActionPayloadMap,
  BotActionResultDataMap,
  BotEventName,
  BotEventPayloadMap,
  BridgeMessageInput,
  Unsubscribe,
} from "../types";
import { withLogger } from "../../utils/logger";
import { DedupeCache } from "../../utils/cache";
import { ActionExecutionError, type DiscordRuntimeAdapter, type DiscordRuntimeOptions } from "./adapter";
import {
  serializeDeletedMessage,
  serializeGuildMember,
  serializeInteraction,
  serializeMessage,
  serializeUser,
} from "./serializers";

type ReplyCapableInteraction = Interaction & {
  replied: boolean;
  deferred: boolean;
  reply(options: unknown): Promise<unknown>;
  deferReply(options?: unknown): Promise<unknown>;
  followUp(options: unknown): Promise<unknown>;
};

interface SendCapableChannel {
  send(options: BridgeMessageInput): Promise<Message>;
}

interface MessageManageableChannel extends SendCapableChannel {
  messages: {
    fetch(messageId: Snowflake): Promise<Message | PartialMessage>;
  };
}

function isSendCapableChannel(channel: unknown): channel is SendCapableChannel {
  return Boolean(channel && typeof (channel as { send?: unknown }).send === "function");
}

function isMessageManageableChannel(channel: unknown): channel is MessageManageableChannel {
  if (!isSendCapableChannel(channel)) {
    return false;
  }
  const messages = (channel as { messages?: { fetch?: unknown } }).messages;
  return Boolean(messages && typeof messages.fetch === "function");
}

function toSendOptions(input: BridgeMessageInput): {
  content?: string;
  embeds?: APIEmbed[];
  allowedMentions?: APIAllowedMentions;
} {
  return {
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.embeds !== undefined ? { embeds: input.embeds } : {}),
    ...(input.allowedMentions !== undefined ? { allowedMentions: input.allowedMentions } : {}),
  };
}

export class DiscordJsRuntimeAdapter implements DiscordRuntimeAdapter {
  private readonly client: Client;
  private readonly logger;
  private readonly interactionCache = new DedupeCache<ReplyCapableInteraction>(15 * 60 * 1000);
  private readyPromise: Promise<void> | null = null;
  private hasReady = false;

  constructor(private readonly options: DiscordRuntimeOptions) {
    const intentBits = options.intents.map((intent) => BOT_INTENT_BITS[intent]);
    this.logger = withLogger(options.logger);
    this.client = new Client({
      intents: intentBits,
    });
    this.client.once("ready", () => {
      this.hasReady = true;
    });
  }

  isReady(): boolean {
    return this.hasReady && this.client.isReady();
  }

  ready(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }
    if (this.isReady()) {
      return Promise.resolve();
    }
    this.readyPromise = new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        this.hasReady = true;
        resolve();
      };
      const onError = (error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const cleanup = () => {
        this.client.off("ready", onReady);
        this.client.off("error", onError);
      };

      this.client.once("ready", onReady);
      this.client.once("error", onError);
      void this.client.login(this.options.token).catch((error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
    return this.readyPromise;
  }

  async close(): Promise<void> {
    this.client.removeAllListeners();
    await this.client.destroy();
    this.readyPromise = null;
    this.hasReady = false;
  }

  on<K extends BotEventName>(name: K, handler: (payload: BotEventPayloadMap[K]) => void): Unsubscribe {
    switch (name) {
      case "ready": {
        const listener = () => {
          if (!this.client.user) {
            return;
          }
          handler({
            receivedAt: Date.now(),
            user: serializeUser(this.client.user),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("ready", listener);
        if (this.client.isReady() && this.client.user) {
          listener();
        }
        return () => {
          this.client.off("ready", listener);
        };
      }
      case "interactionCreate": {
        const listener = (interaction: Interaction) => {
          if (isReplyCapableInteraction(interaction)) {
            this.interactionCache.set(interaction.id, interaction);
          }
          handler({
            receivedAt: Date.now(),
            interaction: serializeInteraction(interaction),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("interactionCreate", listener);
        return () => {
          this.client.off("interactionCreate", listener);
        };
      }
      case "messageCreate": {
        const listener = (message: Message) => {
          handler({
            receivedAt: Date.now(),
            message: serializeMessage(message),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("messageCreate", listener);
        return () => {
          this.client.off("messageCreate", listener);
        };
      }
      case "messageUpdate": {
        const listener = (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
          handler({
            receivedAt: Date.now(),
            oldMessage: serializeMessage(oldMessage),
            message: serializeMessage(newMessage),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("messageUpdate", listener);
        return () => {
          this.client.off("messageUpdate", listener);
        };
      }
      case "messageDelete": {
        const listener = (message: Message | PartialMessage) => {
          handler({
            receivedAt: Date.now(),
            message: serializeDeletedMessage(message),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("messageDelete", listener);
        return () => {
          this.client.off("messageDelete", listener);
        };
      }
      case "guildMemberAdd": {
        const listener = (member: GuildMember) => {
          handler({
            receivedAt: Date.now(),
            member: serializeGuildMember(member),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("guildMemberAdd", listener);
        return () => {
          this.client.off("guildMemberAdd", listener);
        };
      }
      case "guildMemberRemove": {
        const listener = (member: GuildMember | PartialGuildMember) => {
          handler({
            receivedAt: Date.now(),
            member: serializeGuildMember(member),
          } as BotEventPayloadMap[K]);
        };
        this.client.on("guildMemberRemove", listener);
        return () => {
          this.client.off("guildMemberRemove", listener);
        };
      }
      default:
        return () => undefined;
    }
  }

  async executeAction<K extends BotActionName>(
    name: K,
    payload: BotActionPayloadMap[K],
  ): Promise<BotActionResultDataMap[K]> {
    await this.ready();
    try {
      switch (name) {
        case "sendMessage":
          return (await this.sendMessage(payload as BotActionPayloadMap["sendMessage"])) as BotActionResultDataMap[K];
        case "editMessage":
          return (await this.editMessage(payload as BotActionPayloadMap["editMessage"])) as BotActionResultDataMap[K];
        case "deleteMessage":
          return (await this.deleteMessage(payload as BotActionPayloadMap["deleteMessage"])) as BotActionResultDataMap[K];
        case "replyToInteraction":
          return (await this.replyToInteraction(payload as BotActionPayloadMap["replyToInteraction"])) as BotActionResultDataMap[K];
        case "deferInteraction":
          return (await this.deferInteraction(payload as BotActionPayloadMap["deferInteraction"])) as BotActionResultDataMap[K];
        case "followUpInteraction":
          return (await this.followUpInteraction(payload as BotActionPayloadMap["followUpInteraction"])) as BotActionResultDataMap[K];
        case "banMember":
          return (await this.banMember(payload as BotActionPayloadMap["banMember"])) as BotActionResultDataMap[K];
        case "kickMember":
          return (await this.kickMember(payload as BotActionPayloadMap["kickMember"])) as BotActionResultDataMap[K];
        case "addMemberRole":
          return (await this.addMemberRole(payload as BotActionPayloadMap["addMemberRole"])) as BotActionResultDataMap[K];
        case "removeMemberRole":
          return (await this.removeMemberRole(payload as BotActionPayloadMap["removeMemberRole"])) as BotActionResultDataMap[K];
        default:
          throw new ActionExecutionError("INVALID_REQUEST", `Unsupported action "${String(name)}".`);
      }
    } catch (error) {
      if (error instanceof ActionExecutionError) {
        throw error;
      }
      this.logger.error("Discord action execution failed.", { action: name, error: String(error) });
      throw new ActionExecutionError("INTERNAL_ERROR", error instanceof Error ? error.message : "Discord action failed.");
    }
  }

  private async fetchSendableChannel(channelId: Snowflake): Promise<SendCapableChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (!isSendCapableChannel(channel)) {
      throw new ActionExecutionError("NOT_FOUND", `Channel "${channelId}" cannot send messages.`);
    }
    return channel;
  }

  private async fetchMessageChannel(channelId: Snowflake): Promise<MessageManageableChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (!isMessageManageableChannel(channel)) {
      throw new ActionExecutionError("NOT_FOUND", `Channel "${channelId}" does not support message operations.`);
    }
    return channel;
  }

  private getInteraction(interactionId: Snowflake): ReplyCapableInteraction {
    const interaction = this.interactionCache.get(interactionId);
    if (!interaction) {
      throw new ActionExecutionError("NOT_FOUND", `Interaction "${interactionId}" is no longer available.`);
    }
    return interaction;
  }

  private async sendMessage(payload: BotActionPayloadMap["sendMessage"]) {
    const channel = await this.fetchSendableChannel(payload.channelId);
    const message = await channel.send(toSendOptions(payload));
    return serializeMessage(message);
  }

  private async editMessage(payload: BotActionPayloadMap["editMessage"]) {
    const channel = await this.fetchMessageChannel(payload.channelId);
    const message = await channel.messages.fetch(payload.messageId);
    const edited = await message.edit(toSendOptions(payload));
    return serializeMessage(edited);
  }

  private async deleteMessage(payload: BotActionPayloadMap["deleteMessage"]) {
    const channel = await this.fetchMessageChannel(payload.channelId);
    const message = await channel.messages.fetch(payload.messageId);
    await message.delete();
    return {
      deleted: true,
      channelId: payload.channelId,
      messageId: payload.messageId,
    } as const;
  }

  private async replyToInteraction(payload: BotActionPayloadMap["replyToInteraction"]) {
    const interaction = this.getInteraction(payload.interactionId);
    if (interaction.replied || interaction.deferred) {
      throw new ActionExecutionError("INVALID_REQUEST", `Interaction "${payload.interactionId}" has already been acknowledged.`);
    }
    const reply = await interaction.reply({
      ...toSendOptions(payload),
      fetchReply: true,
      ...(payload.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    });
    return serializeMessage(reply as Message);
  }

  private async deferInteraction(payload: BotActionPayloadMap["deferInteraction"]) {
    const interaction = this.getInteraction(payload.interactionId);
    if (interaction.replied) {
      throw new ActionExecutionError("INVALID_REQUEST", `Interaction "${payload.interactionId}" has already been replied to.`);
    }
    if (!interaction.deferred) {
      await interaction.deferReply({
        ...(payload.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
      });
    }
    return {
      deferred: true,
      interactionId: payload.interactionId,
    } as const;
  }

  private async followUpInteraction(payload: BotActionPayloadMap["followUpInteraction"]) {
    const interaction = this.getInteraction(payload.interactionId);
    if (!interaction.replied && !interaction.deferred) {
      throw new ActionExecutionError("INVALID_REQUEST", `Interaction "${payload.interactionId}" has not been acknowledged yet.`);
    }
    const followUp = await interaction.followUp({
      ...toSendOptions(payload),
      ...(payload.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    });
    return serializeMessage(followUp as Message);
  }

  private async banMember(payload: BotActionPayloadMap["banMember"]) {
    const guild = await this.client.guilds.fetch(payload.guildId);
    await guild.members.ban(payload.userId, {
      ...(payload.reason ? { reason: payload.reason } : {}),
      ...(payload.deleteMessageSeconds !== undefined ? { deleteMessageSeconds: payload.deleteMessageSeconds } : {}),
    });
    return {
      guildId: payload.guildId,
      userId: payload.userId,
    };
  }

  private async kickMember(payload: BotActionPayloadMap["kickMember"]) {
    const guild = await this.client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.userId);
    await member.kick(payload.reason);
    return {
      guildId: payload.guildId,
      userId: payload.userId,
    };
  }

  private async addMemberRole(payload: BotActionPayloadMap["addMemberRole"]) {
    const guild = await this.client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.userId);
    await member.roles.add(payload.roleId, payload.reason);
    const refreshed = await member.fetch();
    return serializeGuildMember(refreshed);
  }

  private async removeMemberRole(payload: BotActionPayloadMap["removeMemberRole"]) {
    const guild = await this.client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.userId);
    await member.roles.remove(payload.roleId, payload.reason);
    const refreshed = await member.fetch();
    return serializeGuildMember(refreshed);
  }
}

export function createDiscordJsRuntimeAdapter(options: DiscordRuntimeOptions): DiscordRuntimeAdapter {
  return new DiscordJsRuntimeAdapter(options);
}

function isReplyCapableInteraction(interaction: Interaction): interaction is ReplyCapableInteraction {
  return (
    interaction.isRepliable() &&
    typeof (interaction as { reply?: unknown }).reply === "function" &&
    typeof (interaction as { deferReply?: unknown }).deferReply === "function" &&
    typeof (interaction as { followUp?: unknown }).followUp === "function"
  );
}
