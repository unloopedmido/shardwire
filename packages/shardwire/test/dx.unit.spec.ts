import { describe, expect, it } from 'vitest';
import type { BotEventName, ShardwireSubscriptionFilterKey } from '../src/discord/types';
import { defineShardwireApp, generateSecretScope } from '../src/dx/app-manifest';
import { diagnoseShardwireApp } from '../src/dx/diagnose-app';
import { formatShardwireDiagnosis } from '../src/dx/format-diagnosis';
import { explainCapability } from '../src/dx/explain-capability';
import { buildPreflightReport } from '../src/dx/preflight';
import { getShardwireCatalog } from '../src/dx/shardwire-catalog';

describe('DX catalog', () => {
	it('getShardwireCatalog lists events with intents, actions, and subscription filter keys', () => {
		const cat = getShardwireCatalog();
		expect(cat.actions).toContain('sendMessage');
		expect(cat.events.some((e) => e.name === 'messageCreate')).toBe(true);
		expect(cat.events.some((e) => e.name === 'voiceStateUpdate')).toBe(true);
		expect(cat.events.some((e) => e.name === 'guildUpdate')).toBe(true);
		expect(cat.events.some((e) => e.name === 'typingStart')).toBe(true);
		const msgCreate = cat.events.find((e) => e.name === 'messageCreate');
		expect(msgCreate?.requiredIntents).toEqual(['GuildMessages']);
		expect(cat.subscriptionFilters).toContain('guildId');
		expect(cat.subscriptionFilters).toContain('threadId');
		expect(cat.subscriptionFilters).toContain('voiceChannelId');
		expect(cat.subscriptionFilters).toContain('messageId');
		expect(cat.subscriptionFilters).toContain('interactionId');
		expect(cat.subscriptionFilters).toContain('emoji');
		expect(cat.actions).toContain('moveMemberVoice');
		expect(cat.actions).toContain('sendDirectMessage');
		expect(cat.actions).toContain('bulkDeleteMessages');
		expect(cat.actions).toContain('fetchGuild');
		expect(cat.actions).toContain('fetchVoiceState');
		expect(cat.actions).toContain('unbanMember');
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

describe('defineShardwireApp', () => {
	it('normalizes and validates manifests', () => {
		const manifest = defineShardwireApp({
			name: 'moderation-worker',
			events: ['messageCreate', 'messageBulkDelete', 'messageCreate'],
			actions: ['deleteMessage', 'timeoutMember'],
			filters: {
				messageCreate: ['guildId', 'channelId'],
			},
		});
		expect(manifest.name).toBe('moderation-worker');
		expect(manifest.events).toEqual(['messageCreate', 'messageBulkDelete']);
		expect(manifest.actions).toEqual(['deleteMessage', 'timeoutMember']);
		expect(manifest.filters?.messageCreate).toEqual(['guildId', 'channelId']);
	});

	it('defaults name when omitted or whitespace-only', () => {
		expect(defineShardwireApp({ events: ['ready'], actions: [] }).name).toBe('shardwire-app');
		expect(defineShardwireApp({ name: '   ', events: ['ready'], actions: [] }).name).toBe('shardwire-app');
		expect(defineShardwireApp({ name: 'my-app', events: ['ready'], actions: [] }).name).toBe('my-app');
	});

	it('throws on unknown event', () => {
		expect(() =>
			defineShardwireApp({
				name: 'x',
				events: ['notAnEvent' as BotEventName],
				actions: [],
			}),
		).toThrow(/unknown event/);
	});

	it('throws when filters reference an event not listed in events', () => {
		expect(() =>
			defineShardwireApp({
				name: 'x',
				events: ['ready'],
				actions: [],
				filters: { messageCreate: ['guildId'] },
			}),
		).toThrow(/not listed in `events`/);
	});

	it('throws on unsupported filter key', () => {
		expect(() =>
			defineShardwireApp({
				name: 'x',
				events: ['messageCreate'],
				actions: [],
				filters: { messageCreate: ['notACatalogFilter' as ShardwireSubscriptionFilterKey] },
			}),
		).toThrow(/unsupported subscription filter key/);
	});
});

describe('generateSecretScope', () => {
	it('returns minimum SecretPermissions from manifest', () => {
		const manifest = defineShardwireApp({
			name: 'app',
			events: ['messageCreate'],
			actions: ['sendMessage'],
		});
		expect(generateSecretScope(manifest)).toEqual({
			events: ['messageCreate'],
			actions: ['sendMessage'],
		});
	});
});

describe('diagnoseShardwireApp', () => {
	const manifest = defineShardwireApp({
		name: 'mod',
		events: ['messageCreate', 'messageBulkDelete'],
		actions: ['deleteMessage', 'timeoutMember'],
		filters: {
			messageCreate: ['guildId'],
		},
	});

	it('flags missing negotiated events/actions (manifest contract)', () => {
		const report = diagnoseShardwireApp(
			manifest,
			{ events: ['messageCreate'], actions: ['deleteMessage'] },
			{ botIntents: ['GuildMessages'] },
		);
		expect(report.ok).toBe(false);
		expect(
			report.issues.some((i) => i.code === 'missing_action_capability' && i.context?.action === 'timeoutMember'),
		).toBe(true);
		expect(
			report.issues.some((i) => i.code === 'missing_event_capability' && i.context?.event === 'messageBulkDelete'),
		).toBe(true);
		expect(report.requiredIntents).toContain('GuildMessages');
		expect(report.minimumScope.events).toContain('messageCreate');
	});

	it('warns when bot intents are omitted (non-strict)', () => {
		const report = diagnoseShardwireApp(manifest, {
			events: ['messageCreate', 'messageBulkDelete'],
			actions: ['deleteMessage', 'timeoutMember'],
		});
		expect(report.issues.some((i) => i.code === 'bot_intents_unknown')).toBe(true);
	});

	it('errors on strictIntentCheck without botIntents', () => {
		const report = diagnoseShardwireApp(
			manifest,
			{ events: ['messageCreate', 'messageBulkDelete'], actions: ['deleteMessage', 'timeoutMember'] },
			{ strictIntentCheck: true },
		);
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'strict_requires_bot_intents')).toBe(true);
	});

	it('flags missing gateway intent when botIntents are too narrow', () => {
		const report = diagnoseShardwireApp(
			manifest,
			{ events: ['messageCreate', 'messageBulkDelete'], actions: ['deleteMessage', 'timeoutMember'] },
			{ botIntents: ['Guilds'] },
		);
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'missing_intent' && i.context?.intent === 'GuildMessages')).toBe(true);
	});

	it('does not flag a narrow but metadata-valid filter key on the manifest', () => {
		const m = defineShardwireApp({
			name: 'narrow',
			events: ['messageCreate'],
			actions: [],
			filters: { messageCreate: ['guildId'] },
		});
		const report = diagnoseShardwireApp(
			m,
			{ events: ['messageCreate'], actions: [] },
			{ botIntents: ['GuildMessages'] },
		);
		expect(report.ok).toBe(true);
		expect(report.issues.some((i) => i.code === 'filter_key_absent_from_event_metadata')).toBe(false);
	});

	it('flags filter keys absent from event subscription metadata (manifest filters)', () => {
		const bad = defineShardwireApp({
			name: 'bad',
			events: ['messageCreate'],
			actions: [],
			filters: { messageCreate: ['commandName'] },
		});
		const report = diagnoseShardwireApp(
			bad,
			{ events: ['messageCreate'], actions: [] },
			{ botIntents: ['GuildMessages'] },
		);
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'filter_key_absent_from_event_metadata')).toBe(true);
	});

	it('flags subscriptions whose event is not on the manifest', () => {
		const report = diagnoseShardwireApp(
			defineShardwireApp({ name: 's', events: ['ready'], actions: [] }),
			{ events: ['ready'], actions: [] },
			{
				botIntents: [],
				subscriptions: [{ name: 'messageCreate', filter: { commandName: 'x' } }],
			},
		);
		expect(report.issues.some((i) => i.code === 'subscription_event_not_in_manifest')).toBe(true);
	});

	it('requires manifest.filters when a subscription uses a filter', () => {
		const report = diagnoseShardwireApp(
			defineShardwireApp({ name: 's', events: ['messageCreate'], actions: [] }),
			{ events: ['messageCreate'], actions: [] },
			{
				botIntents: ['GuildMessages'],
				subscriptions: [{ name: 'messageCreate', filter: { guildId: '1' } }],
			},
		);
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'manifest_filters_required_for_subscription')).toBe(true);
	});

	it('flags subscription filter keys not declared on the manifest', () => {
		const m = defineShardwireApp({
			name: 's',
			events: ['messageCreate'],
			actions: [],
			filters: { messageCreate: ['guildId'] },
		});
		const report = diagnoseShardwireApp(
			m,
			{ events: ['messageCreate'], actions: [] },
			{
				botIntents: ['GuildMessages'],
				subscriptions: [{ name: 'messageCreate', filter: { channelId: '1' } }],
			},
		);
		expect(report.ok).toBe(false);
		expect(report.issues.some((i) => i.code === 'subscription_filter_key_not_declared_in_manifest')).toBe(true);
	});

	it('flags negotiated surface broader than expectedScope', () => {
		const report = diagnoseShardwireApp(
			defineShardwireApp({ name: 'x', events: ['messageCreate'], actions: [] }),
			{ events: ['messageCreate', 'guildCreate'], actions: [] },
			{
				botIntents: ['GuildMessages', 'Guilds'],
				expectedScope: { events: ['messageCreate'] },
			},
		);
		expect(report.ok).toBe(false);
		expect(
			report.issues.some((i) => i.code === 'scope_broader_than_expected' && i.context?.event === 'guildCreate'),
		).toBe(true);
	});

	it('passes when manifest matches negotiated capabilities', () => {
		const report = diagnoseShardwireApp(
			manifest,
			{ events: ['messageCreate', 'messageBulkDelete'], actions: ['deleteMessage', 'timeoutMember'] },
			{ botIntents: ['GuildMessages'] },
		);
		expect(report.ok).toBe(true);
	});

	it('warns on surplus negotiated events and actions without failing the report', () => {
		const report = diagnoseShardwireApp(
			defineShardwireApp({ name: 'minimal', events: ['ready'], actions: [] }),
			{ events: ['ready', 'guildCreate'], actions: ['sendMessage'] },
			{ botIntents: ['Guilds'] },
		);
		expect(report.ok).toBe(true);
		const unused = report.issues.filter((i) => i.code.startsWith('unused_negotiated'));
		expect(unused.length).toBeGreaterThanOrEqual(2);
		expect(unused.every((i) => i.severity === 'warning')).toBe(true);
	});
});

describe('formatShardwireDiagnosis', () => {
	it('prints FAILED and error section when report is not ok', () => {
		const manifest = defineShardwireApp({
			name: 'fmt-test',
			events: ['messageCreate'],
			actions: ['deleteMessage'],
		});
		const report = diagnoseShardwireApp(
			manifest,
			{ events: [], actions: [] },
			{ strictIntentCheck: true, botIntents: ['GuildMessages'] },
		);
		expect(report.ok).toBe(false);
		const text = formatShardwireDiagnosis(report, { title: 'CI check' });
		expect(text.startsWith('CI check: FAILED')).toBe(true);
		expect(text).toContain('Errors');
		expect(text).toContain('missing_event_capability');
	});

	it('prints ok and no issues when diagnosis is clean', () => {
		const manifest = defineShardwireApp({ name: 'clean', events: ['ready'], actions: [] });
		const report = diagnoseShardwireApp(manifest, { events: ['ready'], actions: [] }, {});
		expect(report.ok).toBe(true);
		const text = formatShardwireDiagnosis(report);
		expect(text).toContain('ok');
		expect(text).toContain('No issues.');
	});

	it('respects omitScopeSummary', () => {
		const manifest = defineShardwireApp({ name: 'x', events: ['ready'], actions: [] });
		const report = diagnoseShardwireApp(manifest, { events: ['ready'], actions: [] }, {});
		const text = formatShardwireDiagnosis(report, { omitScopeSummary: true });
		expect(text).not.toContain('Minimum scope');
	});
});
