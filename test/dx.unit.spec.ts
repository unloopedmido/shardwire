import { describe, expect, it } from 'vitest';
import type { BotEventName } from '../src/discord/types';
import { explainCapability } from '../src/dx/explain-capability';
import { buildPreflightReport } from '../src/dx/preflight';
import { getShardwireCatalog } from '../src/dx/shardwire-catalog';

describe('DX catalog', () => {
	it('getShardwireCatalog lists events with intents, actions, and subscription filter keys', () => {
		const cat = getShardwireCatalog();
		expect(cat.actions).toContain('sendMessage');
		expect(cat.events.some((e) => e.name === 'messageCreate')).toBe(true);
		const msgCreate = cat.events.find((e) => e.name === 'messageCreate');
		expect(msgCreate?.requiredIntents).toEqual(['GuildMessages']);
		expect(cat.subscriptionFilters).toContain('guildId');
		expect(cat.subscriptionFilters).toContain('threadId');
	});
});

describe('explainCapability', () => {
	it('returns unknown_name for invalid names', () => {
		expect(
			explainCapability(
				true,
				{ events: ['ready'], actions: [] },
				{ kind: 'event', name: 'notAnEvent' as BotEventName },
			),
		).toMatchObject({ known: false, reasonCode: 'unknown_name' });
	});

	it('returns not_negotiated when disconnected', () => {
		expect(explainCapability(false, null, { kind: 'event', name: 'ready' })).toMatchObject({
			known: true,
			reasonCode: 'not_negotiated',
			requiredIntents: [],
		});
	});

	it('returns allowed when negotiated', () => {
		expect(
			explainCapability(
				true,
				{ events: ['messageCreate'], actions: ['sendMessage'] },
				{ kind: 'action', name: 'sendMessage' },
			),
		).toMatchObject({ known: true, allowedByBridge: true, reasonCode: 'allowed' });
	});

	it('returns denied_by_bridge when action missing from capabilities', () => {
		expect(
			explainCapability(true, { events: ['ready'], actions: ['sendMessage'] }, { kind: 'action', name: 'banMember' }),
		).toMatchObject({ known: true, allowedByBridge: false, reasonCode: 'denied_by_bridge' });
	});
});

describe('buildPreflightReport', () => {
	it('flags desired events not in negotiated capabilities', () => {
		const report = buildPreflightReport({
			connected: true,
			capabilities: { events: ['ready'], actions: [] },
			appUrl: 'wss://example.com/shardwire',
			desired: { events: ['messageCreate'] },
		});
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'desired_event_not_allowed')).toBe(true);
	});

	it('warns on loopback ws://', () => {
		const report = buildPreflightReport({
			connected: false,
			capabilities: null,
			appUrl: 'ws://127.0.0.1:3000/shardwire',
		});
		expect(report.issues.some((i) => i.code === 'insecure_transport_local')).toBe(true);
		expect(report.issues.some((i) => i.code === 'not_connected')).toBe(true);
	});
});
