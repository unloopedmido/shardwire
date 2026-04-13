import { GatewayIntentBits } from 'discord.js';
import type { BotActionName, BotEventName, BotIntentName } from './types';

export const BOT_EVENT_NAMES = [
	'ready',
	'interactionCreate',
	'messageCreate',
	'messageUpdate',
	'messageDelete',
	'messageBulkDelete',
	'messageReactionAdd',
	'messageReactionRemove',
	'guildCreate',
	'guildDelete',
	'guildMemberAdd',
	'guildMemberRemove',
	'guildMemberUpdate',
	'threadCreate',
	'threadUpdate',
	'threadDelete',
	'channelCreate',
	'channelUpdate',
	'channelDelete',
] as const satisfies readonly BotEventName[];

export const BOT_ACTION_NAMES = [
	'sendMessage',
	'editMessage',
	'deleteMessage',
	'replyToInteraction',
	'deferInteraction',
	'deferUpdateInteraction',
	'followUpInteraction',
	'editInteractionReply',
	'deleteInteractionReply',
	'updateInteraction',
	'showModal',
	'fetchMessage',
	'fetchMember',
	'banMember',
	'kickMember',
	'addMemberRole',
	'removeMemberRole',
	'addMessageReaction',
	'removeOwnMessageReaction',
	'timeoutMember',
	'removeMemberTimeout',
	'createChannel',
	'editChannel',
	'deleteChannel',
	'createThread',
	'archiveThread',
] as const satisfies readonly BotActionName[];

const DISCORD_GATEWAY_INTENT_ENTRIES = Object.entries(GatewayIntentBits).filter(
	(entry): entry is [BotIntentName, number] => typeof entry[1] === 'number',
);

export const BOT_INTENT_BITS: Record<BotIntentName, number> = Object.fromEntries(
	DISCORD_GATEWAY_INTENT_ENTRIES,
) as Record<BotIntentName, number>;

/** Gateway intents required for each built-in event (empty = none). */
export const EVENT_REQUIRED_INTENTS: Record<BotEventName, readonly BotIntentName[]> = {
	ready: [],
	interactionCreate: [],
	messageCreate: ['GuildMessages'],
	messageUpdate: ['GuildMessages'],
	messageDelete: ['GuildMessages'],
	messageBulkDelete: ['GuildMessages'],
	messageReactionAdd: ['GuildMessageReactions'],
	messageReactionRemove: ['GuildMessageReactions'],
	guildCreate: ['Guilds'],
	guildDelete: ['Guilds'],
	guildMemberAdd: ['GuildMembers'],
	guildMemberRemove: ['GuildMembers'],
	guildMemberUpdate: ['GuildMembers'],
	threadCreate: ['Guilds'],
	threadUpdate: ['Guilds'],
	threadDelete: ['Guilds'],
	channelCreate: ['Guilds'],
	channelUpdate: ['Guilds'],
	channelDelete: ['Guilds'],
};

/** Keys supported on `EventSubscriptionFilter` for `app.on(..., filter)`. */
export const SUBSCRIPTION_FILTER_KEYS = [
	'guildId',
	'channelId',
	'userId',
	'commandName',
	'customId',
	'interactionKind',
	'channelType',
	'parentChannelId',
	'threadId',
] as const;

export type SubscriptionFilterKey = (typeof SUBSCRIPTION_FILTER_KEYS)[number];

export function getAvailableEvents(intents: readonly BotIntentName[]): BotEventName[] {
	const enabled = new Set(intents);
	return BOT_EVENT_NAMES.filter((eventName) =>
		EVENT_REQUIRED_INTENTS[eventName].every((intent) => enabled.has(intent)),
	);
}
