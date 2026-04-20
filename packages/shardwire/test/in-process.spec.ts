import { describe, expect, it } from 'vitest';
import { defineShardwireApp, ShardwireStrictStartupError } from '../src';
import { createInProcessAppBridge } from '../src/app/in-process';
import { ActionExecutionError, type DiscordRuntimeAdapter } from '../src/discord/runtime/adapter';
import type { BotActionName, BotActionPayloadMap, BotActionResultDataMap } from '../src/discord/types';
import { FakeDiscordRuntime } from './helpers/fake-runtime';

describe('in-process app bridge', () => {
	const baseCapabilities = {
		events: ['messageCreate', 'ready'] as const,
		actions: ['sendMessage', 'runRaw'] as const,
	};

	it('connects, reports capabilities, and executes actions', async () => {
		const runtime = new FakeDiscordRuntime();
		runtime.setActionHandler('sendMessage', async ({ channelId, content }) => ({
			id: 'm1',
			channelId,
			content,
			attachments: [],
			embeds: [],
		}));
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: [...baseCapabilities.events], actions: [...baseCapabilities.actions] },
		});

		await app.ready();
		expect(app.connected()).toBe(true);
		expect(app.connectionId()).toMatch(/^inproc-/);
		expect(app.capabilities()).toEqual({
			events: ['messageCreate', 'ready'],
			actions: ['sendMessage', 'runRaw'],
		});

		const result = await app.actions.sendMessage({
			channelId: 'c1',
			content: 'hello',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe('m1');
		}
		await app.close();
	});

	it('returns FORBIDDEN when action is outside negotiated capabilities', async () => {
		const runtime = new FakeDiscordRuntime();
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['ready'], actions: [] },
		});
		await app.ready();

		const result = await app.actions.sendMessage({
			channelId: 'c1',
			content: 'x',
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('FORBIDDEN');
		}
		await app.close();
	});

	it('maps ActionExecutionError details and timeout failures', async () => {
		const runtime = new FakeDiscordRuntime();
		runtime.setActionHandler('sendMessage', async () => {
			throw new ActionExecutionError('NOT_FOUND', 'missing');
		});
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['ready'], actions: ['sendMessage'] },
		});
		await app.ready();

		const notFound = await app.actions.sendMessage({
			channelId: 'c1',
			content: 'x',
		});
		expect(notFound.ok).toBe(false);
		if (!notFound.ok) {
			expect(notFound.error.code).toBe('NOT_FOUND');
		}

		runtime.setActionHandler(
			'sendMessage',
			() =>
				new Promise(() => {
					// no-op
				}),
		);
		const timedOut = await app.actions.sendMessage(
			{
				channelId: 'c1',
				content: 'x',
			},
			{ timeoutMs: 1 },
		);
		expect(timedOut.ok).toBe(false);
		if (!timedOut.ok) {
			expect(timedOut.error.code).toBe('TIMEOUT');
		}
		await app.close();
	});

	it('supports raw helper by delegating to runRaw action', async () => {
		const runtime = new FakeDiscordRuntime();
		runtime.setActionHandler('runRaw', async ({ method, args }) => ({
			method,
			args: args ?? [],
		}));
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['ready'], actions: ['runRaw'] },
		});
		await app.ready();

		const result = await app.raw('guilds.fetch', ['g1']);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({ method: 'guilds.fetch', args: ['g1'] });
		}
		await app.close();
	});

	it('dispatches filtered subscriptions and removes handlers with off/unsubscribe', async () => {
		const runtime = new FakeDiscordRuntime();
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['messageCreate'], actions: [] },
		});
		await app.ready();

		const seen: string[] = [];
		const handler = ({ message }: { message: { id: string } }) => {
			seen.push(message.id);
		};
		const unsub = app.on('messageCreate', handler as never, { channelId: 'c1' });
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'm1',
				channelId: 'c1',
				content: 'hello',
				attachments: [],
				embeds: [],
			},
		});
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'm2',
				channelId: 'c2',
				content: 'ignore',
				attachments: [],
				embeds: [],
			},
		});
		expect(seen).toEqual(['m1']);

		app.off('messageCreate', handler as never);
		runtime.emit('messageCreate', {
			receivedAt: Date.now(),
			message: {
				id: 'm3',
				channelId: 'c1',
				content: 'ignore',
				attachments: [],
				embeds: [],
			},
		});
		expect(seen).toEqual(['m1']);

		const second = app.on('messageCreate', handler as never);
		unsub();
		second();
		await app.close();
	});

	it('enforces strict-ready manifest requirements and exposes diagnosis failures', async () => {
		const runtime = new FakeDiscordRuntime();
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['messageCreate'], actions: [] },
		});

		await expect(app.ready({ strict: true })).rejects.toThrow(/manifest/i);

		const manifest = defineShardwireApp({
			events: ['ready'],
			actions: [],
		});
		await expect(app.ready({ strict: true, manifest })).rejects.toBeInstanceOf(ShardwireStrictStartupError);
		await app.close();
	});

	it('reports preflight failures when runtime startup fails', async () => {
		const failingRuntime: DiscordRuntimeAdapter = {
			async ready() {
				throw new Error('boom');
			},
			async close() {},
			isReady() {
				return false;
			},
			on() {
				return () => undefined;
			},
			async executeAction<K extends BotActionName>(
				name: K,
				payload: BotActionPayloadMap[K],
			): Promise<BotActionResultDataMap[K]> {
				void name;
				void payload;
				throw new Error('unused');
			},
			getClient() {
				return null;
			},
		};
		const app = createInProcessAppBridge({
			runtime: failingRuntime,
			capabilities: { events: ['ready'], actions: [] },
		});
		const report = await app.preflight();
		expect(report.ok).toBe(false);
		expect(report.connected).toBe(false);
	});

	it('covers lifecycle helpers, strict success, and handler edge paths', async () => {
		const runtime = new FakeDiscordRuntime();
		runtime.setActionHandler('runRaw', async () => ({ ok: true }));
		const app = createInProcessAppBridge({
			runtime,
			capabilities: { events: ['ready', 'messageCreate'], actions: ['runRaw'] },
		});

		app.off('ready', (() => undefined) as never);
		const h1 = (() => undefined) as never;
		const h2 = (() => undefined) as never;
		const unsub1 = app.on('ready', h1);
		const unsub2 = app.on('ready', h2);
		const strictManifest = defineShardwireApp({
			events: ['ready'],
			actions: ['runRaw'],
		});
		await app.ready({
			strict: true,
			manifest: strictManifest,
			botIntents: ['Guilds'],
		});
		expect(app.catalog().actions).toContain('runRaw');
		expect(app.explainCapability({ kind: 'action', name: 'runRaw' }).known).toBe(true);
		const successPreflight = await app.preflight({ actions: ['runRaw'], events: ['ready'] });
		expect(successPreflight.connected).toBe(true);

		unsub1();
		unsub1();
		unsub2();
		const missingUnsub = app.on('messageCreate', (() => undefined) as never);
		missingUnsub();
		app.off('messageCreate', (() => undefined) as never);

		expect(() => app.on('guildDelete', (() => undefined) as never)).toThrow(/not available/i);
		await app.close();

		const afterClose = await app.raw('guilds.fetch', ['x']);
		expect(afterClose.ok).toBe(false);
		if (!afterClose.ok) {
			expect(afterClose.error.code).toBe('DISCONNECTED');
		}
		await expect(app.ready()).rejects.toThrow(/closed/i);
	});
});
