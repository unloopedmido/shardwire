import type {
	BotEventName,
	BotEventPayloadMap,
	BridgeInteractionKind,
	EventSubscription,
	EventSubscriptionFilter,
} from '../discord/types';

/** Guild thread channel types (Discord `ChannelType`). */
const THREAD_CHANNEL_TYPES = new Set([10, 11, 12]);

interface NormalizedEventSubscriptionFilter {
	guildId?: string[];
	channelId?: string[];
	userId?: string[];
	commandName?: string[];
	customId?: string[];
	interactionKind?: BridgeInteractionKind[];
	channelType?: number[];
	parentChannelId?: string[];
	threadId?: string[];
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
	const normalized = [...new Set(rawValues.filter((entry) => typeof entry === 'string' && entry.length > 0))].sort();
	return normalized.length > 0 ? normalized : undefined;
}

function normalizeNumberList(value: number | readonly number[] | undefined): number[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	const rawValues = Array.isArray(value) ? value : [value];
	const normalized = [
		...new Set(rawValues.filter((entry) => typeof entry === 'number' && Number.isFinite(entry))),
	].sort((a, b) => a - b);
	return normalized.length > 0 ? normalized : undefined;
}

function normalizeKindList(
	value: BridgeInteractionKind | readonly BridgeInteractionKind[] | undefined,
): BridgeInteractionKind[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	const rawValues = Array.isArray(value) ? value : [value];
	const normalized = [
		...new Set(rawValues.filter((entry): entry is BridgeInteractionKind => typeof entry === 'string')),
	].sort();
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
	const customIds = normalizeStringList(filter.customId);
	const interactionKinds = normalizeKindList(filter.interactionKind);
	const channelTypes = normalizeNumberList(filter.channelType);
	const parentChannelIds = normalizeStringList(filter.parentChannelId);
	const threadIds = normalizeStringList(filter.threadId);

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
	if (customIds) {
		normalized.customId = customIds;
	}
	if (interactionKinds) {
		normalized.interactionKind = interactionKinds;
	}
	if (channelTypes) {
		normalized.channelType = channelTypes;
	}
	if (parentChannelIds) {
		normalized.parentChannelId = parentChannelIds;
	}
	if (threadIds) {
		normalized.threadId = threadIds;
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

function matchesKind(value: BridgeInteractionKind | undefined, allowed: BridgeInteractionKind[] | undefined): boolean {
	if (!allowed) {
		return true;
	}
	if (!value) {
		return false;
	}
	return allowed.includes(value);
}

function matchesNumberField(value: number | undefined, allowed: number[] | undefined): boolean {
	if (!allowed) {
		return true;
	}
	if (value === undefined) {
		return false;
	}
	return allowed.includes(value);
}

function threadIdFromMessageLike(message: { channelId: string; channelType?: number }): string | undefined {
	if (message.channelType === undefined) {
		return undefined;
	}
	if (THREAD_CHANNEL_TYPES.has(message.channelType)) {
		return message.channelId;
	}
	return undefined;
}

function eventMetadata(
	name: BotEventName,
	payload: unknown,
): {
	guildId?: string;
	channelId?: string;
	userId?: string;
	commandName?: string;
	customId?: string;
	interactionKind?: BridgeInteractionKind;
	channelType?: number;
	parentChannelId?: string;
	threadId?: string;
} {
	switch (name) {
		case 'ready':
			return {};
		case 'interactionCreate': {
			const interactionPayload = payload as BotEventPayloadMap['interactionCreate'];
			const ix = interactionPayload.interaction;
			const threadId =
				ix.channelId && ix.channelType !== undefined && THREAD_CHANNEL_TYPES.has(ix.channelType)
					? ix.channelId
					: undefined;
			return {
				...(ix.guildId ? { guildId: ix.guildId } : {}),
				...(ix.channelId ? { channelId: ix.channelId } : {}),
				userId: ix.user.id,
				...(ix.commandName ? { commandName: ix.commandName } : {}),
				...(ix.customId ? { customId: ix.customId } : {}),
				interactionKind: ix.kind,
				...(ix.channelType !== undefined ? { channelType: ix.channelType } : {}),
				...(ix.parentChannelId ? { parentChannelId: ix.parentChannelId } : {}),
				...(threadId ? { threadId } : {}),
			};
		}
		case 'messageCreate': {
			const messagePayload = payload as BotEventPayloadMap['messageCreate'];
			const msg = messagePayload.message;
			const threadId = threadIdFromMessageLike(msg);
			return {
				...(msg.guildId ? { guildId: msg.guildId } : {}),
				channelId: msg.channelId,
				...(msg.author ? { userId: msg.author.id } : {}),
				...(msg.channelType !== undefined ? { channelType: msg.channelType } : {}),
				...(msg.parentChannelId ? { parentChannelId: msg.parentChannelId } : {}),
				...(threadId ? { threadId } : {}),
			};
		}
		case 'messageUpdate': {
			const messagePayload = payload as BotEventPayloadMap['messageUpdate'];
			const msg = messagePayload.message;
			const threadId = threadIdFromMessageLike(msg);
			return {
				...(msg.guildId ? { guildId: msg.guildId } : {}),
				channelId: msg.channelId,
				...(msg.author ? { userId: msg.author.id } : {}),
				...(msg.channelType !== undefined ? { channelType: msg.channelType } : {}),
				...(msg.parentChannelId ? { parentChannelId: msg.parentChannelId } : {}),
				...(threadId ? { threadId } : {}),
			};
		}
		case 'messageDelete': {
			const messagePayload = payload as BotEventPayloadMap['messageDelete'];
			const msg = messagePayload.message;
			const threadId = threadIdFromMessageLike(msg);
			return {
				...(msg.guildId ? { guildId: msg.guildId } : {}),
				channelId: msg.channelId,
				...(msg.channelType !== undefined ? { channelType: msg.channelType } : {}),
				...(msg.parentChannelId ? { parentChannelId: msg.parentChannelId } : {}),
				...(threadId ? { threadId } : {}),
			};
		}
		case 'messageBulkDelete': {
			const bulkPayload = payload as BotEventPayloadMap['messageBulkDelete'];
			const threadId =
				bulkPayload.channelType !== undefined && THREAD_CHANNEL_TYPES.has(bulkPayload.channelType)
					? bulkPayload.channelId
					: undefined;
			return {
				guildId: bulkPayload.guildId,
				channelId: bulkPayload.channelId,
				...(bulkPayload.channelType !== undefined ? { channelType: bulkPayload.channelType } : {}),
				...(bulkPayload.parentChannelId ? { parentChannelId: bulkPayload.parentChannelId } : {}),
				...(threadId ? { threadId } : {}),
			};
		}
		case 'messageReactionAdd': {
			const reactionPayload = payload as BotEventPayloadMap['messageReactionAdd'];
			return {
				...(reactionPayload.reaction.guildId ? { guildId: reactionPayload.reaction.guildId } : {}),
				channelId: reactionPayload.reaction.channelId,
				...(reactionPayload.reaction.user ? { userId: reactionPayload.reaction.user.id } : {}),
			};
		}
		case 'messageReactionRemove': {
			const reactionPayload = payload as BotEventPayloadMap['messageReactionRemove'];
			return {
				...(reactionPayload.reaction.guildId ? { guildId: reactionPayload.reaction.guildId } : {}),
				channelId: reactionPayload.reaction.channelId,
				...(reactionPayload.reaction.user ? { userId: reactionPayload.reaction.user.id } : {}),
			};
		}
		case 'guildMemberAdd': {
			const memberPayload = payload as BotEventPayloadMap['guildMemberAdd'];
			return {
				guildId: memberPayload.member.guildId,
				userId: memberPayload.member.id,
			};
		}
		case 'guildMemberRemove': {
			const memberPayload = payload as BotEventPayloadMap['guildMemberRemove'];
			return {
				guildId: memberPayload.member.guildId,
				userId: memberPayload.member.id,
			};
		}
		case 'guildMemberUpdate': {
			const memberPayload = payload as BotEventPayloadMap['guildMemberUpdate'];
			return {
				guildId: memberPayload.member.guildId,
				userId: memberPayload.member.id,
			};
		}
		case 'guildCreate':
		case 'guildDelete': {
			const guildPayload = payload as BotEventPayloadMap['guildCreate'];
			return {
				guildId: guildPayload.guild.id,
			};
		}
		case 'threadCreate':
		case 'threadUpdate':
		case 'threadDelete': {
			const threadPayload = payload as BotEventPayloadMap['threadCreate'];
			return {
				guildId: threadPayload.thread.guildId,
				...(threadPayload.thread.parentId
					? { channelId: threadPayload.thread.parentId }
					: { channelId: threadPayload.thread.id }),
				channelType: threadPayload.thread.type,
				...(threadPayload.thread.parentId ? { parentChannelId: threadPayload.thread.parentId } : {}),
				threadId: threadPayload.thread.id,
			};
		}
		case 'channelCreate':
		case 'channelUpdate':
		case 'channelDelete': {
			const channelPayload = payload as BotEventPayloadMap['channelCreate'];
			const ch = channelPayload.channel;
			return {
				...(ch.guildId ? { guildId: ch.guildId } : {}),
				channelId: ch.id,
				channelType: ch.type,
				...(ch.parentId ? { parentChannelId: ch.parentId } : {}),
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
		matchesField(metadata.commandName, normalized.filter.commandName) &&
		matchesField(metadata.customId, normalized.filter.customId) &&
		matchesKind(metadata.interactionKind, normalized.filter.interactionKind) &&
		matchesNumberField(metadata.channelType, normalized.filter.channelType) &&
		matchesField(metadata.parentChannelId, normalized.filter.parentChannelId) &&
		matchesField(metadata.threadId, normalized.filter.threadId)
	);
}
