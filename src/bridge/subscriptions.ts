import type {
  BotEventName,
  BotEventPayloadMap,
  EventSubscription,
  EventSubscriptionFilter,
} from "../discord/types";

interface NormalizedEventSubscriptionFilter {
  guildId?: string[];
  channelId?: string[];
  userId?: string[];
  commandName?: string[];
}

export interface NormalizedEventSubscription<K extends BotEventName = BotEventName> {
  name: K;
  filter?: NormalizedEventSubscriptionFilter;
}

function normalizeStringList(value: string | readonly string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = [...new Set(rawValues.filter((entry) => typeof entry === "string" && entry.length > 0))].sort();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeEventSubscriptionFilter(
  filter?: EventSubscriptionFilter,
): NormalizedEventSubscriptionFilter | undefined {
  if (!filter) {
    return undefined;
  }
  const normalized: NormalizedEventSubscriptionFilter = {};
  const guildIds = normalizeStringList(filter.guildId);
  const channelIds = normalizeStringList(filter.channelId);
  const userIds = normalizeStringList(filter.userId);
  const commandNames = normalizeStringList(filter.commandName);

  if (guildIds) {
    normalized.guildId = guildIds;
  }
  if (channelIds) {
    normalized.channelId = channelIds;
  }
  if (userIds) {
    normalized.userId = userIds;
  }
  if (commandNames) {
    normalized.commandName = commandNames;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeEventSubscription<K extends BotEventName>(
  subscription: EventSubscription<K>,
): NormalizedEventSubscription<K> {
  const normalizedFilter = normalizeEventSubscriptionFilter(subscription.filter);
  return {
    name: subscription.name,
    ...(normalizedFilter ? { filter: normalizedFilter } : {}),
  };
}

export function serializeEventSubscription(subscription: EventSubscription): string {
  return JSON.stringify(normalizeEventSubscription(subscription));
}

function matchesField(value: string | undefined, allowed: string[] | undefined): boolean {
  if (!allowed) {
    return true;
  }
  if (!value) {
    return false;
  }
  return allowed.includes(value);
}

function eventMetadata(name: BotEventName, payload: unknown): {
  guildId?: string;
  channelId?: string;
  userId?: string;
  commandName?: string;
} {
  switch (name) {
    case "ready":
      return {};
    case "interactionCreate": {
      const interactionPayload = payload as BotEventPayloadMap["interactionCreate"];
      return {
        ...(interactionPayload.interaction.guildId ? { guildId: interactionPayload.interaction.guildId } : {}),
        ...(interactionPayload.interaction.channelId ? { channelId: interactionPayload.interaction.channelId } : {}),
        userId: interactionPayload.interaction.user.id,
        ...(interactionPayload.interaction.commandName ? { commandName: interactionPayload.interaction.commandName } : {}),
      };
    }
    case "messageCreate": {
      const messagePayload = payload as BotEventPayloadMap["messageCreate"];
      return {
        ...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
        channelId: messagePayload.message.channelId,
        ...(messagePayload.message.author ? { userId: messagePayload.message.author.id } : {}),
      };
    }
    case "messageUpdate": {
      const messagePayload = payload as BotEventPayloadMap["messageUpdate"];
      return {
        ...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
        channelId: messagePayload.message.channelId,
        ...(messagePayload.message.author ? { userId: messagePayload.message.author.id } : {}),
      };
    }
    case "messageDelete": {
      const messagePayload = payload as BotEventPayloadMap["messageDelete"];
      return {
        ...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
        channelId: messagePayload.message.channelId,
      };
    }
    case "guildMemberAdd": {
      const memberPayload = payload as BotEventPayloadMap["guildMemberAdd"];
      return {
        guildId: memberPayload.member.guildId,
        userId: memberPayload.member.id,
      };
    }
    case "guildMemberRemove": {
      const memberPayload = payload as BotEventPayloadMap["guildMemberRemove"];
      return {
        guildId: memberPayload.member.guildId,
        userId: memberPayload.member.id,
      };
    }
    default:
      return {};
  }
}

export function matchesEventSubscription(subscription: EventSubscription, payload: unknown): boolean {
  const normalized = normalizeEventSubscription(subscription);
  if (!normalized.filter) {
    return true;
  }

  const metadata = eventMetadata(normalized.name, payload);
  return (
    matchesField(metadata.guildId, normalized.filter.guildId) &&
    matchesField(metadata.channelId, normalized.filter.channelId) &&
    matchesField(metadata.userId, normalized.filter.userId) &&
    matchesField(metadata.commandName, normalized.filter.commandName)
  );
}
