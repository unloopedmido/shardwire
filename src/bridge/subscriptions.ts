import type {
	BotEventName,
	BotEventPayloadMap,
	BridgeInteractionKind,
	EventSubscription,
	EventSubscriptionFilter,
} from '../discord/types';

interface NormalizedEventSubscriptionFilter {
	guildId?: string[];
	channelId?: string[];
	userId?: string[];
	commandName?: string[];
	customId?: string[];
	interactionKind?: BridgeInteractionKind[];
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
} {
	switch (name) {
		case 'ready':
			return {};
		case 'interactionCreate': {
			const interactionPayload = payload as BotEventPayloadMap['interactionCreate'];
			const ix = interactionPayload.interaction;
			return {
				...(ix.guildId ? { guildId: ix.guildId } : {}),
				...(ix.channelId ? { channelId: ix.channelId } : {}),
				userId: ix.user.id,
				...(ix.commandName ? { commandName: ix.commandName } : {}),
				...(ix.customId ? { customId: ix.customId } : {}),
				interactionKind: ix.kind,
			};
		}
		case 'messageCreate': {
			const messagePayload = payload as BotEventPayloadMap['messageCreate'];
			return {
				...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
				channelId: messagePayload.message.channelId,
				...(messagePayload.message.author ? { userId: messagePayload.message.author.id } : {}),
			};
		}
		case 'messageUpdate': {
			const messagePayload = payload as BotEventPayloadMap['messageUpdate'];
			return {
				...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
				channelId: messagePayload.message.channelId,
				...(messagePayload.message.author ? { userId: messagePayload.message.author.id } : {}),
			};
		}
		case 'messageDelete': {
			const messagePayload = payload as BotEventPayloadMap['messageDelete'];
			return {
				...(messagePayload.message.guildId ? { guildId: messagePayload.message.guildId } : {}),
				channelId: messagePayload.message.channelId,
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
		matchesKind(metadata.interactionKind, normalized.filter.interactionKind)
	);
}
