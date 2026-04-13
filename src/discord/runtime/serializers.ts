import type { APIEmbed } from "discord-api-types/v10";
import type {
  AnySelectMenuInteraction,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  ModalSubmitInteraction,
  PartialGuildMember,
  PartialMessage,
  User,
} from "discord.js";
import type {
  BridgeDeletedMessage,
  BridgeGuildMember,
  BridgeInteraction,
  BridgeMessage,
  BridgeUser,
} from "../types";

function serializeEmbeds(message: Message | PartialMessage): APIEmbed[] {
  return message.embeds.map((embed) => embed.toJSON());
}

export function serializeUser(user: User): BridgeUser {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    ...(user.globalName !== undefined ? { globalName: user.globalName } : {}),
    avatarUrl: user.displayAvatarURL() || null,
    bot: user.bot,
    system: user.system ?? false,
  };
}

export function serializeGuildMember(member: GuildMember | PartialGuildMember): BridgeGuildMember {
  return {
    id: member.id,
    guildId: member.guild.id,
    ...("user" in member && member.user ? { user: serializeUser(member.user) } : {}),
    ...("displayName" in member && typeof member.displayName === "string" ? { displayName: member.displayName } : {}),
    ...("nickname" in member ? { nickname: member.nickname ?? null } : {}),
    roles: "roles" in member && "cache" in member.roles ? [...member.roles.cache.keys()] : [],
    ...("joinedAt" in member ? { joinedAt: member.joinedAt?.toISOString() ?? null } : {}),
    ...("premiumSince" in member ? { premiumSince: member.premiumSince?.toISOString() ?? null } : {}),
    ...("pending" in member && typeof member.pending === "boolean" ? { pending: member.pending } : {}),
    ...(
      "communicationDisabledUntil" in member
        ? { communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() ?? null }
        : {}
    ),
  };
}

export function serializeMessage(message: Message | PartialMessage): BridgeMessage {
  const reference = message.reference
    ? {
        ...(message.reference.messageId ? { messageId: message.reference.messageId } : {}),
        ...(message.reference.channelId ? { channelId: message.reference.channelId } : {}),
        ...(message.reference.guildId ? { guildId: message.reference.guildId } : {}),
      }
    : undefined;

  return {
    id: message.id,
    channelId: message.channelId,
    ...(message.guildId ? { guildId: message.guildId } : {}),
    ...("author" in message && message.author ? { author: serializeUser(message.author) } : {}),
    ...("member" in message && message.member ? { member: serializeGuildMember(message.member) } : {}),
    ...("content" in message && typeof message.content === "string" ? { content: message.content } : {}),
    ...("createdAt" in message ? { createdAt: message.createdAt.toISOString() } : {}),
    ...("editedAt" in message ? { editedAt: message.editedAt ? message.editedAt.toISOString() : null } : {}),
    attachments:
      "attachments" in message
        ? [...message.attachments.values()].map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            ...(attachment.contentType !== undefined ? { contentType: attachment.contentType } : {}),
            size: attachment.size,
          }))
        : [],
    embeds: serializeEmbeds(message),
    ...(reference ? { reference } : {}),
  };
}

export function serializeDeletedMessage(message: Message | PartialMessage): BridgeDeletedMessage {
  return {
    id: message.id,
    channelId: message.channelId,
    ...(message.guildId ? { guildId: message.guildId } : {}),
    deletedAt: new Date().toISOString(),
  };
}

function serializeChatInputOptions(interaction: ChatInputCommandInteraction): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (const option of interaction.options.data) {
    if (option.options && option.options.length > 0) {
      options[option.name] = option.options.map((child) => child.value);
      continue;
    }
    options[option.name] = option.value ?? null;
  }
  return options;
}

function serializeSelectMenu(interaction: AnySelectMenuInteraction): Pick<BridgeInteraction, "customId" | "values"> {
  return {
    customId: interaction.customId,
    values: [...interaction.values],
  };
}

function serializeModalFields(interaction: ModalSubmitInteraction): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const field of interaction.fields.fields.values()) {
    if ("value" in field && typeof field.value === "string") {
      fields[field.customId] = field.value;
      continue;
    }
    if ("values" in field && Array.isArray(field.values)) {
      fields[field.customId] = field.values.join(",");
    }
  }
  return fields;
}

function serializeInteractionMessage(interaction: Interaction): BridgeMessage | undefined {
  if ("message" in interaction && interaction.message) {
    return serializeMessage(interaction.message);
  }
  return undefined;
}

export function serializeInteraction(interaction: Interaction): BridgeInteraction {
  const base: BridgeInteraction = {
    id: interaction.id,
    applicationId: interaction.applicationId,
    token: interaction.token,
    kind: "unknown",
    ...(interaction.guildId ? { guildId: interaction.guildId } : {}),
    ...(interaction.channelId ? { channelId: interaction.channelId } : {}),
    user: serializeUser(interaction.user),
    ...(interaction.member && "guild" in interaction.member ? { member: serializeGuildMember(interaction.member) } : {}),
  };

  if (interaction.isChatInputCommand()) {
    return {
      ...base,
      kind: "chatInput",
      commandName: interaction.commandName,
      options: serializeChatInputOptions(interaction),
    };
  }
  if (interaction.isContextMenuCommand()) {
    return {
      ...base,
      kind: "contextMenu",
      commandName: interaction.commandName,
    };
  }
  if (interaction.isButton()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "button",
      customId: interaction.customId,
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isStringSelectMenu()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "stringSelect",
      ...serializeSelectMenu(interaction),
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isUserSelectMenu()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "userSelect",
      ...serializeSelectMenu(interaction),
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isRoleSelectMenu()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "roleSelect",
      ...serializeSelectMenu(interaction),
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isMentionableSelectMenu()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "mentionableSelect",
      ...serializeSelectMenu(interaction),
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isChannelSelectMenu()) {
    const message = serializeInteractionMessage(interaction);
    return {
      ...base,
      kind: "channelSelect",
      ...serializeSelectMenu(interaction),
      ...(message ? { message } : {}),
    };
  }
  if (interaction.isModalSubmit()) {
    return {
      ...base,
      kind: "modalSubmit",
      customId: interaction.customId,
      fields: serializeModalFields(interaction),
    };
  }
  return base;
}
