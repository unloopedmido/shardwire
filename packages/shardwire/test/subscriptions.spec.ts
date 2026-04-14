import { describe, expect, it } from 'vitest';
import { matchesEventSubscription, normalizeEventSubscriptionFilter } from '../src/bridge/subscriptions';
import type { BotEventPayloadMap, EventSubscription } from '../src/discord/types';

function msgPayload(
	overrides: Partial<BotEventPayloadMap['messageCreate']['message']>,
): BotEventPayloadMap['messageCreate'] {
	return {
		receivedAt: 1,
		message: {
			id: 'm1',
			channelId: 'thread-1',
			guildId: 'g1',
			attachments: [],
			embeds: [],
			channelType: 11,
			parentChannelId: 'parent-1',
			...overrides,
		},
	};
}

describe('event subscription filters', () => {
	it('normalizes channelType, parentChannelId, and threadId lists', () => {
		expect(
			normalizeEventSubscriptionFilter({
				channelType: [11, 0],
				parentChannelId: ['a', 'b'],
				threadId: ['thread-1'],
			}),
		).toEqual({
			channelType: [0, 11],
			parentChannelId: ['a', 'b'],
			threadId: ['thread-1'],
		});
	});

	it('matches messageCreate by channelType', () => {
		const sub: EventSubscription<'messageCreate'> = { name: 'messageCreate', filter: { channelType: 11 } };
		expect(matchesEventSubscription(sub, msgPayload({}))).toBe(true);
		expect(matchesEventSubscription(sub, msgPayload({ channelType: 0 }))).toBe(false);
	});

	it('matches messageCreate by parentChannelId', () => {
		const sub: EventSubscription<'messageCreate'> = {
			name: 'messageCreate',
			filter: { parentChannelId: 'parent-1' },
		};
		expect(matchesEventSubscription(sub, msgPayload({}))).toBe(true);
		expect(matchesEventSubscription(sub, msgPayload({ parentChannelId: 'other' }))).toBe(false);
	});

	it('matches messageCreate by threadId for guild thread channel types', () => {
		const sub: EventSubscription<'messageCreate'> = { name: 'messageCreate', filter: { threadId: 'thread-1' } };
		expect(matchesEventSubscription(sub, msgPayload({ channelId: 'thread-1', channelType: 11 }))).toBe(true);
		expect(matchesEventSubscription(sub, msgPayload({ channelId: 'thread-2', channelType: 11 }))).toBe(false);
		expect(matchesEventSubscription(sub, msgPayload({ channelId: 'ch-text', channelType: 0 }))).toBe(false);
	});

	it('matches messageBulkDelete metadata', () => {
		const sub: EventSubscription<'messageBulkDelete'> = {
			name: 'messageBulkDelete',
			filter: { guildId: 'g1', channelType: 0 },
		};
		const payload: BotEventPayloadMap['messageBulkDelete'] = {
			receivedAt: 1,
			channelId: 'c1',
			guildId: 'g1',
			messageIds: ['a', 'b'],
			channelType: 0,
		};
		expect(matchesEventSubscription(sub, payload)).toBe(true);
	});

	it('matches channelCreate by channelType and parentChannelId', () => {
		const sub: EventSubscription<'channelCreate'> = {
			name: 'channelCreate',
			filter: { channelType: 0, parentChannelId: 'cat-1' },
		};
		const payload: BotEventPayloadMap['channelCreate'] = {
			receivedAt: 1,
			channel: { id: 'new-ch', type: 0, guildId: 'g1', parentId: 'cat-1' },
		};
		expect(matchesEventSubscription(sub, payload)).toBe(true);
	});

	it('matches messageDelete using threadId when channelType is a thread', () => {
		const sub: EventSubscription<'messageDelete'> = { name: 'messageDelete', filter: { threadId: 'th-x' } };
		const payload: BotEventPayloadMap['messageDelete'] = {
			receivedAt: 1,
			message: {
				id: 'm1',
				channelId: 'th-x',
				guildId: 'g1',
				deletedAt: new Date().toISOString(),
				channelType: 12,
				parentChannelId: 'p1',
			},
		};
		expect(matchesEventSubscription(sub, payload)).toBe(true);
	});

	it('matches threadDelete using threadId filter', () => {
		const sub: EventSubscription<'threadDelete'> = { name: 'threadDelete', filter: { threadId: 'th-9' } };
		const payload: BotEventPayloadMap['threadDelete'] = {
			receivedAt: 1,
			thread: { id: 'th-9', guildId: 'g1', parentId: 'p1', name: 't', type: 11 },
		};
		expect(matchesEventSubscription(sub, payload)).toBe(true);
	});

	it('matches interactionCreate using channelType and threadId', () => {
		const sub: EventSubscription<'interactionCreate'> = {
			name: 'interactionCreate',
			filter: { channelType: 11, threadId: 'th-1' },
		};
		const payload: BotEventPayloadMap['interactionCreate'] = {
			receivedAt: 1,
			interaction: {
				id: 'ix',
				applicationId: 'app',
				kind: 'button',
				channelId: 'th-1',
				channelType: 11,
				parentChannelId: 'forum-1',
				user: {
					id: 'u1',
					username: 'x',
					discriminator: '0',
					bot: false,
					system: false,
				},
				customId: 'btn',
			},
		};
		expect(matchesEventSubscription(sub, payload)).toBe(true);
	});
});
