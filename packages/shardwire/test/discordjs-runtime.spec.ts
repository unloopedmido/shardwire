import { describe, expect, it, vi } from 'vitest';
import { DiscordJsRuntimeAdapter } from '../src/discord/runtime/discordjs-adapter';
import type { DedupeCache } from '../src/utils/cache';

type Listener = (...args: unknown[]) => void;

function createRuntimeHarness() {
	const adapter = new DiscordJsRuntimeAdapter({
		token: 'fake-token',
		intents: ['Guilds', 'GuildMessages', 'GuildVoiceStates'],
	});

	const listeners = new Map<string, Set<Listener>>();
	const client = {
		on: vi.fn((event: string, listener: Listener) => {
			const current = listeners.get(event) ?? new Set<Listener>();
			current.add(listener);
			listeners.set(event, current);
		}),
		off: vi.fn((event: string, listener: Listener) => {
			listeners.get(event)?.delete(listener);
		}),
		once: vi.fn(),
		isReady: vi.fn(() => true),
		login: vi.fn(async () => 'ok'),
		removeAllListeners: vi.fn(),
		destroy: vi.fn(async () => undefined),
		shard: { ids: [7] },
		user: { id: 'bot-user' },
		channels: {
			fetch: vi.fn(),
		},
		guilds: {
			fetch: vi.fn(),
		},
		users: {
			fetch: vi.fn(),
		},
	};

	const state = adapter as unknown as {
		client: typeof client;
		readyPromise: Promise<void> | null;
		hasReady: boolean;
		interactionCache: DedupeCache<unknown>;
	};
	state.client = client;
	state.readyPromise = Promise.resolve();
	state.hasReady = true;

	function emit(event: string, ...args: unknown[]) {
		for (const listener of listeners.get(event) ?? []) {
			listener(...args);
		}
	}

	return { adapter, client, emit, state };
}

describe('DiscordJsRuntimeAdapter', () => {
	it('serializes messageCreate events with shard and channel metadata', () => {
		const { adapter, emit } = createRuntimeHarness();
		const seen: unknown[] = [];

		const unsubscribe = adapter.on('messageCreate', (payload) => {
			seen.push(payload);
		});

		emit('messageCreate', {
			id: 'msg-1',
			channelId: 'thread-1',
			guildId: 'guild-1',
			content: 'hello',
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			editedAt: null,
			author: {
				id: 'user-1',
				username: 'alice',
				discriminator: '0',
				globalName: 'Alice',
				bot: false,
				system: false,
				displayAvatarURL: () => 'https://cdn.example/avatar.png',
			},
			member: {
				id: 'user-1',
				guild: { id: 'guild-1' },
				user: {
					id: 'user-1',
					username: 'alice',
					discriminator: '0',
					bot: false,
					system: false,
					displayAvatarURL: () => 'https://cdn.example/avatar.png',
				},
				displayName: 'Alice',
				nickname: 'Ali',
				roles: { cache: new Map([['role-1', {}]]) },
				joinedAt: new Date('2024-01-01T00:00:00.000Z'),
				premiumSince: null,
				pending: false,
				communicationDisabledUntil: null,
			},
			attachments: new Map([
				[
					'att-1',
					{
						id: 'att-1',
						name: 'file.txt',
						url: 'https://cdn.example/file.txt',
						contentType: 'text/plain',
						size: 12,
					},
				],
			]),
			embeds: [],
			components: [{ toJSON: () => ({ type: 1, components: [] }) }],
			reference: { messageId: 'parent-1', channelId: 'thread-1', guildId: 'guild-1' },
			channel: { type: 11, parentId: 'forum-1' },
		});

		expect(seen).toEqual([
			{
				receivedAt: expect.any(Number),
				shardId: 7,
				message: {
					id: 'msg-1',
					channelId: 'thread-1',
					guildId: 'guild-1',
					author: {
						id: 'user-1',
						username: 'alice',
						discriminator: '0',
						globalName: 'Alice',
						avatarUrl: 'https://cdn.example/avatar.png',
						bot: false,
						system: false,
					},
					member: expect.objectContaining({
						id: 'user-1',
						guildId: 'guild-1',
						displayName: 'Alice',
						nickname: 'Ali',
						roles: ['role-1'],
					}),
					content: 'hello',
					createdAt: '2024-01-01T00:00:00.000Z',
					editedAt: null,
					attachments: [
						{
							id: 'att-1',
							name: 'file.txt',
							url: 'https://cdn.example/file.txt',
							contentType: 'text/plain',
							size: 12,
						},
					],
					embeds: [],
					components: [{ type: 1, components: [] }],
					reference: { messageId: 'parent-1', channelId: 'thread-1', guildId: 'guild-1' },
					channelType: 11,
					parentChannelId: 'forum-1',
				},
			},
		]);

		unsubscribe();
	});

	it('caches interactions and executes reply actions from the cached interaction', async () => {
		const { adapter, emit } = createRuntimeHarness();

		adapter.on('interactionCreate', () => undefined);

		const reply = vi.fn(async () => ({
			id: 'reply-1',
			channelId: 'channel-1',
			content: 'hello',
			createdAt: new Date('2024-01-02T00:00:00.000Z'),
			editedAt: null,
			attachments: new Map(),
			embeds: [],
			channel: { type: 0, parentId: null },
			author: {
				id: 'bot-user',
				username: 'bot',
				discriminator: '0',
				bot: true,
				system: false,
				displayAvatarURL: () => 'https://cdn.example/bot.png',
			},
		}));

		const interaction = {
			id: 'ix-1',
			applicationId: 'app-1',
			guildId: 'guild-1',
			channelId: 'channel-1',
			channel: { type: 0, parentId: 'parent-1', isDMBased: () => false },
			user: {
				id: 'user-1',
				username: 'alice',
				discriminator: '0',
				bot: false,
				system: false,
				displayAvatarURL: () => 'https://cdn.example/alice.png',
			},
			member: {
				id: 'user-1',
				guild: { id: 'guild-1' },
				user: {
					id: 'user-1',
					username: 'alice',
					discriminator: '0',
					bot: false,
					system: false,
					displayAvatarURL: () => 'https://cdn.example/alice.png',
				},
				roles: { cache: new Map<string, unknown>() },
			},
			message: {
				id: 'source-msg',
				channelId: 'channel-1',
				attachments: new Map(),
				embeds: [],
				channel: { type: 0, parentId: null },
			},
			customId: 'btn.accept',
			replied: false,
			deferred: false,
			reply,
			deferReply: vi.fn(),
			followUp: vi.fn(),
			editReply: vi.fn(),
			deleteReply: vi.fn(),
			isRepliable: () => true,
			isButton: () => true,
			isChatInputCommand: () => false,
			isContextMenuCommand: () => false,
			isStringSelectMenu: () => false,
			isUserSelectMenu: () => false,
			isRoleSelectMenu: () => false,
			isMentionableSelectMenu: () => false,
			isChannelSelectMenu: () => false,
			isModalSubmit: () => false,
			isMessageComponent: () => true,
		};

		emit('interactionCreate', interaction);

		const result = await adapter.executeAction('replyToInteraction', {
			interactionId: 'ix-1',
			content: 'hello',
			ephemeral: true,
		});

		expect(reply).toHaveBeenCalledWith({
			content: 'hello',
			fetchReply: true,
			flags: 64,
		});
		expect(result).toMatchObject({
			id: 'reply-1',
			channelId: 'channel-1',
			content: 'hello',
		});
	});

	it('serializes voiceStateUpdate events with timestamps', () => {
		const { adapter, emit } = createRuntimeHarness();
		const seen: unknown[] = [];

		adapter.on('voiceStateUpdate', (payload) => {
			seen.push(payload);
		});

		emit(
			'voiceStateUpdate',
			{
				guild: { id: 'guild-1' },
				id: 'user-1',
				channelId: null,
				sessionId: 'old-session',
				selfMute: false,
				selfDeaf: false,
				selfVideo: false,
				streaming: false,
				serverMute: false,
				serverDeaf: false,
				suppress: false,
				requestToSpeakTimestamp: null,
			},
			{
				guild: { id: 'guild-1' },
				id: 'user-1',
				channelId: 'voice-1',
				sessionId: 'new-session',
				selfMute: true,
				selfDeaf: false,
				selfVideo: true,
				streaming: true,
				serverMute: false,
				serverDeaf: true,
				suppress: false,
				requestToSpeakTimestamp: Date.parse('2024-01-03T00:00:00.000Z'),
			},
		);

		expect(seen).toEqual([
			{
				receivedAt: expect.any(Number),
				shardId: 7,
				oldState: {
					guildId: 'guild-1',
					userId: 'user-1',
					channelId: null,
					sessionId: 'old-session',
					selfMute: false,
					selfDeaf: false,
					selfVideo: false,
					selfStream: false,
					serverMute: false,
					serverDeaf: false,
					suppress: false,
					requestToSpeakTimestamp: null,
				},
				state: {
					guildId: 'guild-1',
					userId: 'user-1',
					channelId: 'voice-1',
					sessionId: 'new-session',
					selfMute: true,
					selfDeaf: false,
					selfVideo: true,
					selfStream: true,
					serverMute: false,
					serverDeaf: true,
					suppress: false,
					requestToSpeakTimestamp: '2024-01-03T00:00:00.000Z',
				},
			},
		]);
	});

	it('rejects invalid timeout durations before touching Discord state', async () => {
		const { adapter, client } = createRuntimeHarness();

		await expect(
			adapter.executeAction('timeoutMember', {
				guildId: 'guild-1',
				userId: 'user-1',
				durationMs: 0,
			}),
		).rejects.toMatchObject({
			code: 'INVALID_REQUEST',
		});
		expect(client.guilds.fetch).not.toHaveBeenCalled();
	});

	it('executes message, lookup, and moderation actions against mocked Discord resources', async () => {
		const { adapter, client } = createRuntimeHarness();

		const sentMessage = {
			id: 'msg-sent',
			channelId: 'channel-1',
			content: 'hello',
			createdAt: new Date('2024-02-01T00:00:00.000Z'),
			editedAt: null,
			attachments: new Map(),
			embeds: [],
			channel: { type: 0, parentId: null },
			author: {
				id: 'bot-user',
				username: 'bot',
				discriminator: '0',
				bot: true,
				system: false,
				displayAvatarURL: () => 'https://cdn.example/bot.png',
			},
			reactions: { cache: new Map<string, unknown>() },
			edit: vi.fn(async () => ({
				id: 'msg-sent',
				channelId: 'channel-1',
				content: 'edited',
				createdAt: new Date('2024-02-01T00:00:00.000Z'),
				editedAt: new Date('2024-02-01T00:01:00.000Z'),
				attachments: new Map(),
				embeds: [],
				channel: { type: 0, parentId: null },
				author: {
					id: 'bot-user',
					username: 'bot',
					discriminator: '0',
					bot: true,
					system: false,
					displayAvatarURL: () => 'https://cdn.example/bot.png',
				},
			})),
			delete: vi.fn(async () => undefined),
			pin: vi.fn(async () => undefined),
			unpin: vi.fn(async () => undefined),
			react: vi.fn(async () => undefined),
		};

		const reaction = {
			emoji: {
				identifier: '🔥',
				name: '🔥',
				toString: () => '🔥',
			},
			users: {
				remove: vi.fn(async () => undefined),
			},
		};
		sentMessage.reactions.cache.set('fire', reaction);

		const textChannel = {
			id: 'channel-1',
			type: 0,
			guildId: 'guild-1',
			parentId: 'parent-1',
			name: 'general',
			send: vi.fn(async () => sentMessage),
			messages: {
				fetch: vi.fn(async () => sentMessage),
			},
			bulkDelete: vi.fn(
				async () =>
					new Map([
						['old-1', {}],
						['old-2', {}],
					]),
			),
		};

		const dmChannel = {
			send: vi.fn(async () => ({
				...sentMessage,
				id: 'dm-1',
				channelId: 'dm-channel',
			})),
		};
		const user = {
			createDM: vi.fn(async () => dmChannel),
		};

		const guildMember = {
			id: 'user-1',
			guild: { id: 'guild-1' },
			user: {
				id: 'user-1',
				username: 'alice',
				discriminator: '0',
				bot: false,
				system: false,
				displayAvatarURL: () => 'https://cdn.example/alice.png',
			},
			roles: {
				cache: new Map([['role-1', {}]]),
				add: vi.fn(async () => undefined),
				remove: vi.fn(async () => undefined),
			},
			fetch: vi.fn(async () => guildMember),
			kick: vi.fn(async () => undefined),
			timeout: vi.fn(async () => undefined),
			voice: {
				setChannel: vi.fn(async () => undefined),
				setMute: vi.fn(async () => undefined),
				setDeaf: vi.fn(async () => undefined),
				setSuppressed: vi.fn(async () => undefined),
			},
			displayName: 'Alice',
			nickname: null,
			joinedAt: new Date('2024-02-01T00:00:00.000Z'),
			premiumSince: null,
			pending: false,
			communicationDisabledUntil: null,
		};

		const voiceState = {
			guild: { id: 'guild-1' },
			id: 'user-1',
			channelId: 'voice-1',
			sessionId: 'voice-session',
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			streaming: false,
			serverMute: true,
			serverDeaf: false,
			suppress: false,
			requestToSpeakTimestamp: null,
		};
		guildMember.fetch = vi.fn(async () => ({
			...guildMember,
			voice: { ...guildMember.voice, ...voiceState },
		}));

		const guild = {
			id: 'guild-1',
			name: 'Guild',
			icon: 'icon-hash',
			ownerId: 'owner-1',
			members: {
				fetch: vi.fn(async () => guildMember),
				ban: vi.fn(async () => undefined),
				unban: vi.fn(async () => undefined),
			},
			channels: {
				create: vi.fn(async ({ name }: { name: string }) => ({
					id: 'created-channel',
					type: 0,
					name,
					guildId: 'guild-1',
					parentId: null,
				})),
			},
		};

		const thread = {
			id: 'thread-1',
			type: 11,
			name: 'case-1',
			guildId: 'guild-1',
			parentId: 'channel-1',
			archived: true,
			locked: false,
			isThread: () => true,
			setArchived: vi.fn(async () => undefined),
		};

		const editableChannel = {
			id: 'editable-channel',
			type: 0,
			name: 'editable',
			guildId: 'guild-1',
			parentId: null,
			edit: vi.fn(async () => ({
				id: 'editable-channel',
				type: 0,
				name: 'renamed',
				guildId: 'guild-1',
				parentId: null,
			})),
			delete: vi.fn(async () => undefined),
		};

		client.channels.fetch.mockImplementation(async (channelId: string) => {
			switch (channelId) {
				case 'channel-1':
					return textChannel;
				case 'thread-1':
					return thread;
				case 'editable-channel':
					return editableChannel;
				default:
					return null;
			}
		});
		client.users.fetch.mockResolvedValue(user);
		client.guilds.fetch.mockResolvedValue(guild);

		const sendMessage = await adapter.executeAction('sendMessage', {
			channelId: 'channel-1',
			content: 'hello',
		});
		const sendDirectMessage = await adapter.executeAction('sendDirectMessage', {
			userId: 'user-1',
			content: 'dm',
		});
		const editMessage = await adapter.executeAction('editMessage', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
			content: 'edited',
		});
		const deleteMessage = await adapter.executeAction('deleteMessage', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
		});
		const pinMessage = await adapter.executeAction('pinMessage', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
			reason: 'pin',
		});
		const unpinMessage = await adapter.executeAction('unpinMessage', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
			reason: 'unpin',
		});
		const bulkDeleteMessages = await adapter.executeAction('bulkDeleteMessages', {
			channelId: 'channel-1',
			messageIds: ['old-1', 'old-2'],
		});
		const fetchMessage = await adapter.executeAction('fetchMessage', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
		});
		const fetchChannel = await adapter.executeAction('fetchChannel', { channelId: 'channel-1' });
		const fetchThread = await adapter.executeAction('fetchThread', { threadId: 'thread-1' });
		const fetchGuild = await adapter.executeAction('fetchGuild', { guildId: 'guild-1' });
		const fetchMember = await adapter.executeAction('fetchMember', {
			guildId: 'guild-1',
			userId: 'user-1',
		});
		const banMember = await adapter.executeAction('banMember', {
			guildId: 'guild-1',
			userId: 'user-1',
			reason: 'spam',
		});
		const unbanMember = await adapter.executeAction('unbanMember', {
			guildId: 'guild-1',
			userId: 'user-1',
			reason: 'appeal',
		});
		const kickMember = await adapter.executeAction('kickMember', {
			guildId: 'guild-1',
			userId: 'user-1',
			reason: 'kick',
		});
		const addMemberRole = await adapter.executeAction('addMemberRole', {
			guildId: 'guild-1',
			userId: 'user-1',
			roleId: 'role-2',
		});
		const removeMemberRole = await adapter.executeAction('removeMemberRole', {
			guildId: 'guild-1',
			userId: 'user-1',
			roleId: 'role-2',
		});
		const addReaction = await adapter.executeAction('addMessageReaction', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
			emoji: '🔥',
		});
		const removeReaction = await adapter.executeAction('removeOwnMessageReaction', {
			channelId: 'channel-1',
			messageId: 'msg-sent',
			emoji: '🔥',
		});
		const createChannel = await adapter.executeAction('createChannel', {
			guildId: 'guild-1',
			name: 'tickets',
		});
		const editChannel = await adapter.executeAction('editChannel', {
			channelId: 'editable-channel',
			name: 'renamed',
		});
		const deleteChannel = await adapter.executeAction('deleteChannel', {
			channelId: 'editable-channel',
		});
		const archiveThread = await adapter.executeAction('archiveThread', {
			threadId: 'thread-1',
		});
		const moveMemberVoice = await adapter.executeAction('moveMemberVoice', {
			guildId: 'guild-1',
			userId: 'user-1',
			channelId: 'voice-1',
		});
		const setMemberMute = await adapter.executeAction('setMemberMute', {
			guildId: 'guild-1',
			userId: 'user-1',
			mute: true,
		});
		const setMemberDeaf = await adapter.executeAction('setMemberDeaf', {
			guildId: 'guild-1',
			userId: 'user-1',
			deaf: true,
		});
		const setMemberSuppressed = await adapter.executeAction('setMemberSuppressed', {
			guildId: 'guild-1',
			userId: 'user-1',
			suppressed: true,
		});
		const removeMemberTimeout = await adapter.executeAction('removeMemberTimeout', {
			guildId: 'guild-1',
			userId: 'user-1',
		});

		expect(sendMessage.content).toBe('hello');
		expect(sendDirectMessage.channelId).toBe('dm-channel');
		expect(editMessage.content).toBe('edited');
		expect(deleteMessage).toEqual({ deleted: true, channelId: 'channel-1', messageId: 'msg-sent' });
		expect(pinMessage).toEqual({ pinned: true, channelId: 'channel-1', messageId: 'msg-sent' });
		expect(unpinMessage).toEqual({ pinned: false, channelId: 'channel-1', messageId: 'msg-sent' });
		expect(bulkDeleteMessages.deletedMessageIds).toEqual(['old-1', 'old-2']);
		expect(fetchMessage.id).toBe('msg-sent');
		expect(fetchChannel).toMatchObject({ id: 'channel-1', type: 0, guildId: 'guild-1', parentId: 'parent-1' });
		expect(fetchThread).toMatchObject({ id: 'thread-1', parentId: 'channel-1' });
		expect(fetchGuild).toMatchObject({ id: 'guild-1', name: 'Guild' });
		expect(fetchMember).toMatchObject({ id: 'user-1', guildId: 'guild-1' });
		expect(banMember).toEqual({ guildId: 'guild-1', userId: 'user-1' });
		expect(unbanMember).toEqual({ guildId: 'guild-1', userId: 'user-1' });
		expect(kickMember).toEqual({ guildId: 'guild-1', userId: 'user-1' });
		expect(addMemberRole.roles).toContain('role-1');
		expect(removeMemberRole.roles).toContain('role-1');
		expect(addReaction).toEqual({ messageId: 'msg-sent', channelId: 'channel-1', emoji: '🔥' });
		expect(removeReaction).toEqual({ messageId: 'msg-sent', channelId: 'channel-1', emoji: '🔥' });
		expect(createChannel).toMatchObject({ id: 'created-channel', name: 'tickets' });
		expect(editChannel).toMatchObject({ id: 'editable-channel', name: 'renamed' });
		expect(deleteChannel).toEqual({ deleted: true, channelId: 'editable-channel' });
		expect(archiveThread).toMatchObject({ id: 'thread-1', archived: true });
		expect(moveMemberVoice).toMatchObject({ userId: 'user-1', channelId: 'voice-1' });
		expect(setMemberMute).toMatchObject({ serverMute: true });
		expect(setMemberDeaf).toMatchObject({ serverMute: true });
		expect(setMemberSuppressed).toMatchObject({ serverMute: true });
		expect(removeMemberTimeout).toMatchObject({ id: 'user-1', guildId: 'guild-1' });
	});

	it('creates threads from messages and parent channels', async () => {
		const { adapter, client } = createRuntimeHarness();

		const startedThread = {
			id: 'thread-from-message',
			type: 11,
			name: 'from-message',
			guildId: 'guild-1',
			parentId: 'channel-1',
			archived: false,
			locked: false,
		};
		const createdThread = {
			id: 'thread-from-parent',
			type: 11,
			name: 'from-parent',
			guildId: 'guild-1',
			parentId: 'channel-1',
			archived: false,
			locked: false,
		};

		const parentChannel = {
			id: 'channel-1',
			isTextBased: () => true,
			messages: {
				fetch: vi.fn(async () => ({
					startThread: vi.fn(async () => startedThread),
				})),
			},
			threads: {
				create: vi.fn(async () => createdThread),
			},
		};

		client.channels.fetch.mockResolvedValue(parentChannel);

		const fromMessage = await adapter.executeAction('createThread', {
			parentChannelId: 'channel-1',
			messageId: 'msg-1',
			name: 'from-message',
		});
		const fromParent = await adapter.executeAction('createThread', {
			parentChannelId: 'channel-1',
			name: 'from-parent',
			type: 'private',
		});

		expect(fromMessage).toMatchObject({ id: 'thread-from-message', parentId: 'channel-1' });
		expect(fromParent).toMatchObject({ id: 'thread-from-parent', parentId: 'channel-1' });
	});
});
