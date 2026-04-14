import { ChannelType } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { serializeChannel, serializeDeletedMessage } from '../src/discord/runtime/serializers';

describe('serializeChannel', () => {
	it('maps id, type, name, guildId, and parentId', () => {
		const fake = {
			id: 'ch-1',
			type: ChannelType.GuildText,
			name: 'support',
			guildId: 'guild-1',
			parentId: 'cat-1',
		};
		expect(serializeChannel(fake as never)).toEqual({
			id: 'ch-1',
			type: ChannelType.GuildText,
			name: 'support',
			guildId: 'guild-1',
			parentId: 'cat-1',
		});
	});
});

describe('serializeDeletedMessage channel metadata', () => {
	it('includes channelType and parentChannelId when channel is present', () => {
		const partial = {
			id: 'm1',
			channelId: 'th-1',
			guildId: 'g1',
			channel: { type: 11, parentId: 'parent-1' },
		};
		const out = serializeDeletedMessage(partial as never);
		expect(out.channelType).toBe(11);
		expect(out.parentChannelId).toBe('parent-1');
	});
});
