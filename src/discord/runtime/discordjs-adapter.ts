import type { APIAllowedMentions, APIEmbed, Snowflake } from "discord-api-types/v10";
import {
  Client,
  DiscordAPIError,
  Events,
  type GuildMember,
  type Interaction,
  type Message,
  type MessageReaction,
  MessageFlags,
  type PartialMessageReaction,
  type PartialUser,
  type PartialMessage,
  type PartialGuildMember,
  type User,
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
  serializeMessageReaction,
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

const INTERACTION_CACHE_TTL_MS = 15 * 60 * 1000;
const DISCORD_FORBIDDEN_CODES = new Set<number>([50001, 50013]);
const DISCORD_NOT_FOUND_CODES = new Set<number>([10003, 10004, 10007, 10008, 10011, 10062]);
const DISCORD_INVALID_REQUEST_CODES = new Set<number>([50035]);

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

function extractDiscordErrorDetails(error: unknown): { status?: number; code?: number; message?: string } {
  if (error instanceof DiscordAPIError) {
    return {
      ...(typeof error.status === "number" ? { status: error.status } : {}),
      ...(typeof error.code === "number" ? { code: error.code } : {}),
      message: error.message,
    };
  }
  if (error && typeof error === "object") {
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown };
    return {
      ...(typeof candidate.status === "number" ? { status: candidate.status } : {}),
      ...(typeof candidate.code === "number" ? { code: candidate.code } : {}),
      ...(typeof candidate.message === "string" ? { message: candidate.message } : {}),
    };
  }
  return {};
}

export function mapDiscordErrorToActionExecutionError(error: unknown): ActionExecutionError | null {
  const details = extractDiscordErrorDetails(error);
  const message = details.message ?? (error instanceof Error ? error.message : "Discord action failed.");

  if (
    details.status === 403 ||
    (details.code !== undefined && DISCORD_FORBIDDEN_CODES.has(details.code))
  ) {
    return new ActionExecutionError("FORBIDDEN", message);
  }
  if (
    details.status === 404 ||
    (details.code !== undefined && DISCORD_NOT_FOUND_CODES.has(details.code))
  ) {
    return new ActionExecutionError("NOT_FOUND", message);
  }
  if (
    details.status === 400 ||
    (details.code !== undefined && DISCORD_INVALID_REQUEST_CODES.has(details.code))
  ) {
    return new ActionExecutionError("INVALID_REQUEST", message);
  }
  return null;
}

export class DiscordJsRuntimeAdapter implements DiscordRuntimeAdapter {
  private readonly client: Client;
  private readonly logger;
  private readonly interactionCache = new DedupeCache<ReplyCapableInteraction>(INTERACTION_CACHE_TTL_MS);
  private readonly actionHandlers: {
    [K in BotActionName]: (payload: BotActionPayloadMap[K]) => Promise<BotActionResultDataMap[K]>;
  };
  private readyPromise: Promise<void> | null = null;
  private hasReady = false;

  constructor(private readonly options: DiscordRuntimeOptions) {
    const intentBits = options.intents.map((intent) => BOT_INTENT_BITS[intent]);
    this.logger = withLogger(options.logger);
    this.client = new Client({
      intents: intentBits,
    });
    this.client.once(Events.ClientReady, () => {
      this.hasReady = true;
    });
    this.actionHandlers = {
      sendMessage: (payload) => this.sendMessage(payload),
      editMessage: (payload) => this.editMessage(payload),
      deleteMessage: (payload) => this.deleteMessage(payload),
      replyToInteraction: (payload) => this.replyToInteraction(payload),
      deferInteraction: (payload) => this.deferInteraction(payload),
      followUpInteraction: (payload) => this.followUpInteraction(payload),
      banMember: (payload) => this.banMember(payload),
      kickMember: (payload) => this.kickMember(payload),
      addMemberRole: (payload) => this.addMemberRole(payload),
      removeMemberRole: (payload) => this.removeMemberRole(payload),
      addMessageReaction: (payload) => this.addMessageReaction(payload),
      removeOwnMessageReaction: (payload) => this.removeOwnMessageReaction(payload),
    };
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
        this.client.off(Events.ClientReady, onReady);
        this.client.off("error", onError);
      };

      this.client.once(Events.ClientReady, onReady);
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
        this.client.on(Events.ClientReady, listener);
        if (this.client.isReady() && this.client.user) {
          listener();
        }
        return () => {
          this.client.off(Events.ClientReady, listener);
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
        this.client.on(Events.InteractionCreate, listener);
        return () => {
          this.client.off(Events.InteractionCreate, listener);
        };
      }
      case "messageCreate": {
        const listener = (message: Message) => {
          handler({
            receivedAt: Date.now(),
            message: serializeMessage(message),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.MessageCreate, listener);
        return () => {
          this.client.off(Events.MessageCreate, listener);
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
        this.client.on(Events.MessageUpdate, listener);
        return () => {
          this.client.off(Events.MessageUpdate, listener);
        };
      }
      case "messageDelete": {
        const listener = (message: Message | PartialMessage) => {
          handler({
            receivedAt: Date.now(),
            message: serializeDeletedMessage(message),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.MessageDelete, listener);
        return () => {
          this.client.off(Events.MessageDelete, listener);
        };
      }
      case "messageReactionAdd": {
        const listener = (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
          handler({
            receivedAt: Date.now(),
            reaction: serializeMessageReaction(reaction, user),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.MessageReactionAdd, listener);
        return () => {
          this.client.off(Events.MessageReactionAdd, listener);
        };
      }
      case "messageReactionRemove": {
        const listener = (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
          handler({
            receivedAt: Date.now(),
            reaction: serializeMessageReaction(reaction, user),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.MessageReactionRemove, listener);
        return () => {
          this.client.off(Events.MessageReactionRemove, listener);
        };
      }
      case "guildMemberAdd": {
        const listener = (member: GuildMember) => {
          handler({
            receivedAt: Date.now(),
            member: serializeGuildMember(member),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.GuildMemberAdd, listener);
        return () => {
          this.client.off(Events.GuildMemberAdd, listener);
        };
      }
      case "guildMemberRemove": {
        const listener = (member: GuildMember | PartialGuildMember) => {
          handler({
            receivedAt: Date.now(),
            member: serializeGuildMember(member),
          } as BotEventPayloadMap[K]);
        };
        this.client.on(Events.GuildMemberRemove, listener);
        return () => {
          this.client.off(Events.GuildMemberRemove, listener);
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
    const handler = this.actionHandlers[name];
    try {
      return await handler(payload);
    } catch (error) {
      if (error instanceof ActionExecutionError) {
        throw error;
      }
      const mappedError = mapDiscordErrorToActionExecutionError(error);
      if (mappedError) {
        throw mappedError;
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

  private async addMessageReaction(payload: BotActionPayloadMap["addMessageReaction"]) {
    const channel = await this.fetchMessageChannel(payload.channelId);
    const message = await channel.messages.fetch(payload.messageId);
    await message.react(payload.emoji);
    return {
      messageId: payload.messageId,
      channelId: payload.channelId,
      emoji: payload.emoji,
    } as const;
  }

  private async removeOwnMessageReaction(payload: BotActionPayloadMap["removeOwnMessageReaction"]) {
    const channel = await this.fetchMessageChannel(payload.channelId);
    const message = await channel.messages.fetch(payload.messageId);
    const ownUserId = this.client.user?.id;
    if (!ownUserId) {
      throw new ActionExecutionError("INTERNAL_ERROR", "Bot user is not available.");
    }

    const reaction = [...message.reactions.cache.values()].find((candidate) => {
      return (
        candidate.emoji.identifier === payload.emoji ||
        candidate.emoji.name === payload.emoji ||
        candidate.emoji.toString() === payload.emoji
      );
    });
    if (!reaction) {
      throw new ActionExecutionError("NOT_FOUND", `Reaction "${payload.emoji}" was not found on message "${payload.messageId}".`);
    }

    await reaction.users.remove(ownUserId);
    return {
      messageId: payload.messageId,
      channelId: payload.channelId,
      emoji: payload.emoji,
    } as const;
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
