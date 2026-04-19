import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { connectBotBridge, createThreadThenSendMessage, deferThenEditInteractionReply } from '../src';
import { createBotBridgeWithRuntime } from '../src/bot';
import { FakeDiscordRuntime } from './helpers/fake-runtime';

async function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				reject(new Error('Failed to allocate dynamic port.'));
				return;
			}
			const { port } = address;
			server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(port);
			});
		});
		server.on('error', reject);
	});
}

async function waitFor(assertion: () => void, timeoutMs = 4000, intervalMs = 25): Promise<void> {
	const start = Date.now();
	let lastError: unknown;
	while (Date.now() - start < timeoutMs) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}
	throw lastError instanceof Error ? lastError : new Error('Timed out while waiting for condition.');
}

describe('discord-first bridge integration', () => {
	it('close resolves after the socket has already been closed remotely', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);
		await bot.close();
		await waitFor(() => {
			expect(app.connected()).toBe(false);
		});

		const closeResult = await Promise.race([
			app.close().then(() => 'closed'),
			new Promise<'timed-out'>((resolve) => setTimeout(() => resolve('timed-out'), 500)),
		]);

		expect(closeResult).toBe('closed');
	});

	it('delivers only subscribed events and keeps ready sticky', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		await bot.ready();
		runtime.emit('ready', {
			receivedAt: Date.now(),
			user: {
				id: 'bot-user',
				username: 'bot',
				discriminator: '0',
				bot: true,
				system: false,
			},
		});

		const appA = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});
		const appB = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		const readyEvents: string[] = [];
		const messageEventsA: string[] = [];
		const memberEventsB: string[] = [];

		appA.on('ready', ({ user }) => {
			readyEvents.push(user.id);
		});
		appA.on('messageCreate', ({ message }) => {
			messageEventsA.push(message.id);
		});
		appB.on('guildMemberAdd', ({ member }) => {
			memberEventsB.push(member.id);
		});

		await Promise.all([appA.ready(), appB.ready()]);

		await waitFor(() => {
			expect(readyEvents).toEqual(['bot-user']);
		});

		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'msg-1',
				channelId: 'channel-1',
				content: 'hello',
				attachments: [],
				embeds: [],
			},
		});
		runtime.emit('guildMemberAdd', {
			receivedAt: Date.now(),
			member: {
				id: 'member-1',
				guildId: 'guild-1',
				roles: [],
			},
		});

		await waitFor(() => {
			expect(messageEventsA).toEqual(['msg-1']);
			expect(memberEventsB).toEqual(['member-1']);
		});

		await appA.close();
		await appB.close();
		await bot.close();
	});

	it('round-trips built-in actions through the app actions API', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => ({
			id: 'msg-1',
			channelId,
			content,
			attachments: [],
			embeds: [],
		}));
		runtime.setActionHandler('banMember', async ({ guildId, userId }) => ({
			guildId,
			userId,
		}));
		runtime.setActionHandler('addMemberRole', async ({ guildId, userId, roleId }) => ({
			id: userId,
			guildId,
			roles: [roleId],
		}));
		runtime.setActionHandler('addMessageReaction', async ({ channelId, messageId, emoji }) => ({
			channelId,
			messageId,
			emoji,
		}));
		runtime.setActionHandler('removeOwnMessageReaction', async ({ channelId, messageId, emoji }) => ({
			channelId,
			messageId,
			emoji,
		}));

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);

		const sent = await app.actions.sendMessage({
			channelId: 'channel-1',
			content: 'hello',
		});
		const banned = await app.actions.banMember({
			guildId: 'guild-1',
			userId: 'user-1',
		});
		const roleAdded = await app.actions.addMemberRole({
			guildId: 'guild-1',
			userId: 'user-1',
			roleId: 'role-1',
		});
		const reactionAdded = await app.actions.addMessageReaction({
			channelId: 'channel-1',
			messageId: 'msg-1',
			emoji: '🔥',
		});
		const reactionRemoved = await app.actions.removeOwnMessageReaction({
			channelId: 'channel-1',
			messageId: 'msg-1',
			emoji: '🔥',
		});

		expect(sent.ok).toBe(true);
		expect(banned.ok).toBe(true);
		expect(roleAdded.ok).toBe(true);
		expect(reactionAdded.ok).toBe(true);
		expect(reactionRemoved.ok).toBe(true);

		if (sent.ok) {
			expect(sent.data.content).toBe('hello');
		}
		if (banned.ok) {
			expect(banned.data).toEqual({ guildId: 'guild-1', userId: 'user-1' });
		}
		if (roleAdded.ok) {
			expect(roleAdded.data.roles).toEqual(['role-1']);
		}
		if (reactionAdded.ok) {
			expect(reactionAdded.data).toEqual({
				channelId: 'channel-1',
				messageId: 'msg-1',
				emoji: '🔥',
			});
		}
		if (reactionRemoved.ok) {
			expect(reactionRemoved.data).toEqual({
				channelId: 'channel-1',
				messageId: 'msg-1',
				emoji: '🔥',
			});
		}

		await app.close();
		await bot.close();
	});

	it('supports filtered event subscriptions', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		const channelOneMessages: string[] = [];
		const channelTwoMessages: string[] = [];

		app.on(
			'messageCreate',
			({ message }) => {
				channelOneMessages.push(message.id);
			},
			{ channelId: 'channel-1' },
		);
		app.on(
			'messageCreate',
			({ message }) => {
				channelTwoMessages.push(message.id);
			},
			{ channelId: 'channel-2' },
		);

		await Promise.all([bot.ready(), app.ready()]);
		await new Promise((resolve) => setTimeout(resolve, 50));

		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'msg-1',
				channelId: 'channel-1',
				content: 'one',
				attachments: [],
				embeds: [],
			},
		});
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'msg-2',
				channelId: 'channel-2',
				content: 'two',
				attachments: [],
				embeds: [],
			},
		});
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'msg-3',
				channelId: 'channel-3',
				content: 'three',
				attachments: [],
				embeds: [],
			},
		});

		await waitFor(() => {
			expect(channelOneMessages).toEqual(['msg-1']);
			expect(channelTwoMessages).toEqual(['msg-2']);
		});

		await app.close();
		await bot.close();
	});

	it('reconnects, restores subscriptions, and resumes action delivery', async () => {
		const port = await getFreePort();
		let runtime = new FakeDiscordRuntime();
		let bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => ({
			id: 'msg-1',
			channelId,
			content,
			attachments: [],
			embeds: [],
		}));

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
			reconnect: {
				enabled: true,
				initialDelayMs: 50,
				maxDelayMs: 100,
				jitter: false,
			},
		});

		const receivedMessages: string[] = [];
		app.on('messageCreate', ({ message }) => {
			receivedMessages.push(message.id);
		});

		await Promise.all([bot.ready(), app.ready()]);

		await bot.close();

		runtime = new FakeDiscordRuntime();
		bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => ({
			id: 'msg-2',
			channelId,
			content,
			attachments: [],
			embeds: [],
		}));

		await bot.ready();
		await waitFor(() => {
			expect(app.connected()).toBe(true);
		}, 5000);

		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'msg-reconnected',
				channelId: 'channel-1',
				content: 'back',
				attachments: [],
				embeds: [],
			},
		});

		await waitFor(() => {
			expect(receivedMessages).toContain('msg-reconnected');
		});

		const result = await app.actions.sendMessage({
			channelId: 'channel-1',
			content: 'after reconnect',
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('msg-2');
		}

		await app.close();
		await bot.close();
	});

	it('filters messageCreate by channelType and threadId', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		const threadTypeHits: string[] = [];
		const threadIdHits: string[] = [];

		app.on(
			'messageCreate',
			({ message }) => {
				threadTypeHits.push(message.id);
			},
			{ channelType: 11 },
		);
		app.on(
			'messageCreate',
			({ message }) => {
				threadIdHits.push(message.id);
			},
			{ threadId: 'thread-a' },
		);

		await Promise.all([bot.ready(), app.ready()]);
		await new Promise((resolve) => setTimeout(resolve, 50));

		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'm-guild-text',
				channelId: 'ch-text',
				guildId: 'guild-1',
				channelType: 0,
				attachments: [],
				embeds: [],
			},
		});
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'm-thread',
				channelId: 'thread-a',
				guildId: 'guild-1',
				channelType: 11,
				parentChannelId: 'forum-1',
				attachments: [],
				embeds: [],
			},
		});

		await waitFor(() => {
			expect(threadTypeHits).toEqual(['m-thread']);
			expect(threadIdHits).toEqual(['m-thread']);
		});

		await app.close();
		await bot.close();
	});

	it('supports interactionCreate filtering by customId and interactionKind', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		const hits: string[] = [];
		app.on(
			'interactionCreate',
			({ interaction }) => {
				hits.push(interaction.id);
			},
			{ customId: 'btn.accept', interactionKind: 'button' },
		);

		await Promise.all([bot.ready(), app.ready()]);
		await new Promise((resolve) => setTimeout(resolve, 50));

		runtime.emit('interactionCreate', {
			receivedAt: Date.now(),
			interaction: {
				id: 'i1',
				applicationId: 'app',
				kind: 'button',
				user: {
					id: 'u1',
					username: 'tester',
					discriminator: '0',
					bot: false,
					system: false,
				},
				customId: 'btn.accept',
			},
		});
		runtime.emit('interactionCreate', {
			receivedAt: Date.now(),
			interaction: {
				id: 'i2',
				applicationId: 'app',
				kind: 'button',
				user: {
					id: 'u1',
					username: 'tester',
					discriminator: '0',
					bot: false,
					system: false,
				},
				customId: 'btn.reject',
			},
		});

		await waitFor(() => {
			expect(hits).toEqual(['i1']);
		});

		await app.close();
		await bot.close();
	});

	it('deduplicates action requests when idempotencyKey is provided', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		let calls = 0;
		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => {
			calls += 1;
			return {
				id: 'msg-idempotent',
				channelId,
				content,
				attachments: [],
				embeds: [],
			};
		});

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);

		const first = await app.actions.sendMessage(
			{ channelId: 'channel-1', content: 'hello' },
			{ idempotencyKey: 'msg:channel-1:hello' },
		);
		const second = await app.actions.sendMessage(
			{ channelId: 'channel-1', content: 'hello' },
			{ idempotencyKey: 'msg:channel-1:hello' },
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(calls).toBe(1);

		await app.close();
		await bot.close();
	});

	it('deduplicates idempotency keys across connections when server uses secret scope', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
					idempotencyScope: 'secret',
				},
			},
			runtime,
		);

		let calls = 0;
		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => {
			calls += 1;
			return {
				id: 'msg-cross',
				channelId,
				content,
				attachments: [],
				embeds: [],
			};
		});

		const appA = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});
		const appB = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), appA.ready(), appB.ready()]);

		const first = await appA.actions.sendMessage(
			{ channelId: 'channel-1', content: 'hello' },
			{ idempotencyKey: 'cross-conn' },
		);
		const second = await appB.actions.sendMessage(
			{ channelId: 'channel-1', content: 'hello' },
			{ idempotencyKey: 'cross-conn' },
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(calls).toBe(1);

		await appA.close();
		await appB.close();
		await bot.close();
	});

	it('fails queued actions when concurrency is saturated past queue timeout', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: {
					port,
					secrets: ['shared-secret'],
					maxConcurrentActions: 1,
					actionQueueTimeoutMs: 80,
				},
			},
			runtime,
		);

		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => {
			await new Promise((resolve) => setTimeout(resolve, 250));
			return {
				id: 'msg-slow',
				channelId,
				content,
				attachments: [],
				embeds: [],
			};
		});

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);

		const [a, b] = await Promise.all([
			app.actions.sendMessage({ channelId: 'c1', content: 'a' }),
			app.actions.sendMessage({ channelId: 'c1', content: 'b' }),
		]);

		const okCount = [a, b].filter((r) => r.ok).length;
		const failCount = [a, b].filter((r) => !r.ok).length;
		expect(okCount).toBe(1);
		expect(failCount).toBe(1);
		const failed = !a.ok ? a : b;
		if (!failed.ok) {
			expect(failed.error.code).toBe('SERVICE_UNAVAILABLE');
			expect(failed.error.message).toMatch(/ACTION_QUEUE_TIMEOUT|queue/i);
		}

		await app.close();
		await bot.close();
	});

	it('round-trips interaction helpers and read actions', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		runtime.setActionHandler('deferInteraction', async ({ interactionId }) => ({
			deferred: true,
			interactionId,
		}));
		runtime.setActionHandler('replyToInteraction', async ({ content }) => ({
			id: 'reply-1',
			channelId: 'ch-1',
			content: content ?? 'ok',
			attachments: [],
			embeds: [],
		}));
		runtime.setActionHandler('showModal', async ({ interactionId: id }) => ({
			shown: true,
			interactionId: id,
		}));
		runtime.setActionHandler('fetchMessage', async ({ channelId, messageId }) => ({
			id: messageId,
			channelId,
			content: 'fetched',
			attachments: [],
			embeds: [],
		}));
		runtime.setActionHandler('fetchMember', async ({ guildId, userId }) => ({
			id: userId,
			guildId,
			roles: ['role-1'],
		}));
		runtime.setActionHandler('fetchVoiceState', async ({ guildId, userId }) => ({
			guildId,
			userId,
			channelId: 'voice-1',
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			selfStream: false,
			serverMute: false,
			serverDeaf: false,
			suppress: false,
		}));

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);

		const deferResult = await app.actions.deferInteraction({ interactionId: 'int-1' });
		const replyResult = await app.actions.replyToInteraction({
			interactionId: 'int-1',
			content: 'hello',
		});
		const modalResult = await app.actions.showModal({
			interactionId: 'int-1',
			title: 'Title',
			customId: 'modal-1',
			components: [],
		});
		const msgResult = await app.actions.fetchMessage({ channelId: 'ch-1', messageId: 'm-1' });
		const memberResult = await app.actions.fetchMember({ guildId: 'g-1', userId: 'u-1' });
		const voiceStateResult = await app.actions.fetchVoiceState({ guildId: 'g-1', userId: 'u-1' });

		expect(deferResult.ok).toBe(true);
		expect(replyResult.ok).toBe(true);
		expect(modalResult.ok).toBe(true);
		expect(msgResult.ok).toBe(true);
		expect(memberResult.ok).toBe(true);
		expect(voiceStateResult.ok).toBe(true);
		if (deferResult.ok) {
			expect(deferResult.data.interactionId).toBe('int-1');
		}
		if (msgResult.ok) {
			expect(msgResult.data.content).toBe('fetched');
		}
		if (memberResult.ok) {
			expect(memberResult.data.roles).toEqual(['role-1']);
		}
		if (voiceStateResult.ok) {
			expect(voiceStateResult.data.channelId).toBe('voice-1');
		}

		await app.close();
		await bot.close();
	});

	it('round-trips channel, thread, timeout, and voice actions', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
				server: {
					port,
					secrets: ['shared-secret'],
				},
			},
			runtime,
		);

		runtime.setActionHandler('timeoutMember', async ({ guildId, userId }) => ({
			guildId,
			userId,
		}));
		runtime.setActionHandler('removeMemberTimeout', async ({ guildId, userId }) => ({
			id: userId,
			guildId,
			roles: [],
		}));
		runtime.setActionHandler('createChannel', async ({ guildId, name }) => ({
			id: 'ch-new',
			type: 0,
			guildId,
			name,
		}));
		runtime.setActionHandler('editChannel', async ({ channelId }) => ({
			id: channelId,
			type: 0,
			name: 'edited',
		}));
		runtime.setActionHandler('deleteChannel', async ({ channelId }) => ({
			deleted: true as const,
			channelId,
		}));
		runtime.setActionHandler('createThread', async ({ parentChannelId, name }) => ({
			id: 'th-1',
			guildId: 'guild-1',
			parentId: parentChannelId,
			name,
			type: 11,
		}));
		runtime.setActionHandler('archiveThread', async ({ threadId }) => ({
			id: threadId,
			guildId: 'guild-1',
			parentId: 'parent-1',
			name: 't',
			type: 11,
			archived: true,
		}));
		runtime.setActionHandler('moveMemberVoice', async ({ guildId, userId, channelId }) => ({
			guildId,
			userId,
			channelId: channelId ?? null,
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			selfStream: false,
			serverMute: false,
			serverDeaf: false,
			suppress: false,
		}));
		runtime.setActionHandler('setMemberMute', async ({ guildId, userId, mute }) => ({
			guildId,
			userId,
			channelId: 'voice-1',
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			selfStream: false,
			serverMute: mute,
			serverDeaf: false,
			suppress: false,
		}));
		runtime.setActionHandler('setMemberDeaf', async ({ guildId, userId, deaf }) => ({
			guildId,
			userId,
			channelId: 'voice-1',
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			selfStream: false,
			serverMute: false,
			serverDeaf: deaf,
			suppress: false,
		}));
		runtime.setActionHandler('setMemberSuppressed', async ({ guildId, userId, suppressed }) => ({
			guildId,
			userId,
			channelId: 'stage-1',
			selfMute: false,
			selfDeaf: false,
			selfVideo: false,
			selfStream: false,
			serverMute: false,
			serverDeaf: false,
			suppress: suppressed,
		}));

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});

		await Promise.all([bot.ready(), app.ready()]);

		const timeoutRes = await app.actions.timeoutMember({
			guildId: 'guild-1',
			userId: 'user-1',
			durationMs: 60_000,
		});
		const clearTimeoutRes = await app.actions.removeMemberTimeout({ guildId: 'guild-1', userId: 'user-1' });
		const createCh = await app.actions.createChannel({ guildId: 'guild-1', name: 'tickets' });
		const editCh = await app.actions.editChannel({ channelId: 'ch-1', name: 'edited' });
		const delCh = await app.actions.deleteChannel({ channelId: 'ch-1' });
		const createTh = await app.actions.createThread({ parentChannelId: 'ch-parent', name: 'case-1' });
		const archTh = await app.actions.archiveThread({ threadId: 'th-1' });
		const moveVoice = await app.actions.moveMemberVoice({
			guildId: 'guild-1',
			userId: 'user-1',
			channelId: 'voice-1',
		});
		const muteVoice = await app.actions.setMemberMute({
			guildId: 'guild-1',
			userId: 'user-1',
			mute: true,
		});
		const deafVoice = await app.actions.setMemberDeaf({
			guildId: 'guild-1',
			userId: 'user-1',
			deaf: true,
		});
		const suppressVoice = await app.actions.setMemberSuppressed({
			guildId: 'guild-1',
			userId: 'user-1',
			suppressed: true,
		});

		expect(timeoutRes.ok).toBe(true);
		expect(clearTimeoutRes.ok).toBe(true);
		expect(createCh.ok).toBe(true);
		expect(editCh.ok).toBe(true);
		expect(delCh.ok).toBe(true);
		expect(createTh.ok).toBe(true);
		expect(archTh.ok).toBe(true);
		expect(moveVoice.ok).toBe(true);
		expect(muteVoice.ok).toBe(true);
		expect(deafVoice.ok).toBe(true);
		expect(suppressVoice.ok).toBe(true);
		if (delCh.ok) {
			expect(delCh.data).toEqual({ deleted: true, channelId: 'ch-1' });
		}
		if (createTh.ok) {
			expect(createTh.data.id).toBe('th-1');
		}
		if (muteVoice.ok) {
			expect(muteVoice.data.serverMute).toBe(true);
		}
		if (deafVoice.ok) {
			expect(deafVoice.data.serverDeaf).toBe(true);
		}
		if (suppressVoice.ok) {
			expect(suppressVoice.data.suppress).toBe(true);
		}

		await app.close();
		await bot.close();
	});

	it('closes connections that exceed maxPayloadBytes', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds'],
				server: {
					port,
					secrets: ['shared-secret'],
					maxPayloadBytes: 1024,
				},
			},
			runtime,
		);

		await bot.ready();

		await new Promise<void>((resolve, reject) => {
			const ws = new WebSocket(`ws://127.0.0.1:${port}/shardwire`);
			const timer = setTimeout(() => {
				ws.terminate();
				reject(new Error('Timed out waiting for close on oversized payload.'));
			}, 4000);
			ws.once('open', () => {
				const padding = 'z'.repeat(3000);
				ws.send(
					JSON.stringify({
						v: 2,
						type: 'auth.hello',
						ts: Date.now(),
						payload: { secret: 'shared-secret', appName: 'big', padding },
					}),
				);
			});
			ws.once('close', () => {
				clearTimeout(timer);
				resolve();
			});
			ws.once('error', () => {
				clearTimeout(timer);
				resolve();
			});
		});

		await bot.close();
	});

	it('workflow helpers chain defer + editInteractionReply and createThread + sendMessage', async () => {
		const port = await getFreePort();
		const runtime = new FakeDiscordRuntime();
		const bot = createBotBridgeWithRuntime(
			{
				token: 'fake-token',
				intents: ['Guilds', 'GuildMessages'],
				server: { port, secrets: ['shared-secret'] },
			},
			runtime,
		);
		runtime.setActionHandler('deferInteraction', async ({ interactionId }) => ({
			deferred: true as const,
			interactionId,
		}));
		runtime.setActionHandler('editInteractionReply', async ({ content }) => ({
			id: 'reply-1',
			channelId: 'c1',
			content: content ?? 'ok',
			attachments: [],
			embeds: [],
		}));
		runtime.setActionHandler('createThread', async ({ parentChannelId, name }) => ({
			id: 'thread-new',
			guildId: 'g1',
			parentId: parentChannelId,
			name,
			type: 11,
		}));
		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => ({
			id: 'msg-in-thread',
			channelId,
			content: content ?? '',
			attachments: [],
			embeds: [],
		}));

		const app = connectBotBridge({
			url: `ws://127.0.0.1:${port}/shardwire`,
			secret: 'shared-secret',
		});
		await Promise.all([bot.ready(), app.ready()]);

		const deferEdit = await deferThenEditInteractionReply(app, {
			interactionId: 'ix-1',
			defer: { ephemeral: true },
			edit: { content: 'done' },
		});
		expect(deferEdit.ok).toBe(true);
		if (deferEdit.ok) {
			expect(deferEdit.data.content).toBe('done');
		}

		const ct = await createThreadThenSendMessage(app, {
			thread: { parentChannelId: 'parent-1', name: 't' },
			message: { content: 'first' },
		});
		expect(ct.threadResult.ok).toBe(true);
		expect(ct.messageResult.ok).toBe(true);
		if (ct.messageResult.ok) {
			expect(ct.messageResult.data.channelId).toBe('thread-new');
		}

		await app.close();
		await bot.close();
	});
});
