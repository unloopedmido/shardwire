import { EVENT_REQUIRED_INTENTS, SUBSCRIPTION_FILTER_KEYS } from '../discord/catalog';
import type {
	BotEventName,
	BotIntentName,
	BridgeCapabilities,
	DiagnoseShardwireAppOptions,
	EventSubscriptionFilter,
	ShardwireAppDiagnosisIssue,
	ShardwireAppDiagnosisReport,
	ShardwireAppManifest,
	ShardwireSubscriptionFilterKey,
} from '../discord/types';
import { generateSecretScope } from './app-manifest';

const KNOWN_FILTER_KEY_SET = new Set<string>(SUBSCRIPTION_FILTER_KEYS);

/**
 * For each built-in event, subscription-filter keys that the bridge’s `eventMetadata` may supply when matching handlers.
 * Keys **not** listed for an event are **never** present in matching metadata for that event — filtering on them is
 * structurally impossible (not “unlikely” or “suspicious”).
 *
 * @see `matchesEventSubscription` / `eventMetadata` in `../bridge/subscriptions`.
 */
export const EVENT_SUBSCRIPTION_METADATA_KEYS: Record<BotEventName, ReadonlySet<ShardwireSubscriptionFilterKey>> = {
	ready: new Set(),
	interactionCreate: new Set([
		'guildId',
		'channelId',
		'userId',
		'interactionId',
		'commandName',
		'customId',
		'interactionKind',
		'channelType',
		'parentChannelId',
		'threadId',
	]),
	messageCreate: new Set(['guildId', 'channelId', 'userId', 'messageId', 'channelType', 'parentChannelId', 'threadId']),
	messageUpdate: new Set(['guildId', 'channelId', 'userId', 'messageId', 'channelType', 'parentChannelId', 'threadId']),
	messageDelete: new Set(['guildId', 'channelId', 'messageId', 'channelType', 'parentChannelId', 'threadId']),
	messageBulkDelete: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId', 'threadId']),
	messageReactionAdd: new Set(['guildId', 'channelId', 'userId', 'messageId', 'emoji']),
	messageReactionRemove: new Set(['guildId', 'channelId', 'userId', 'messageId', 'emoji']),
	messageReactionRemoveAll: new Set(['guildId', 'channelId', 'messageId']),
	messageReactionRemoveEmoji: new Set(['guildId', 'channelId', 'messageId', 'emoji']),
	guildCreate: new Set(['guildId']),
	guildDelete: new Set(['guildId']),
	guildUpdate: new Set(['guildId']),
	guildMemberAdd: new Set(['guildId', 'userId']),
	guildMemberRemove: new Set(['guildId', 'userId']),
	guildMemberUpdate: new Set(['guildId', 'userId']),
	threadCreate: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId', 'threadId']),
	threadUpdate: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId', 'threadId']),
	threadDelete: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId', 'threadId']),
	channelCreate: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId']),
	channelUpdate: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId']),
	channelDelete: new Set(['guildId', 'channelId', 'channelType', 'parentChannelId']),
	typingStart: new Set(['guildId', 'channelId', 'userId']),
	webhooksUpdate: new Set(['guildId', 'channelId']),
	voiceStateUpdate: new Set(['guildId', 'channelId', 'userId', 'voiceChannelId']),
};

/** @deprecated Use {@link EVENT_SUBSCRIPTION_METADATA_KEYS}. */
export const SUBSCRIPTION_FILTER_KEYS_POPULATED_BY_EVENT = EVENT_SUBSCRIPTION_METADATA_KEYS;

function unionRequiredIntents(events: readonly BotEventName[]): BotIntentName[] {
	const out = new Set<BotIntentName>();
	for (const ev of events) {
		for (const intent of EVENT_REQUIRED_INTENTS[ev]) {
			out.add(intent);
		}
	}
	return [...out];
}

function filterKeysFromObject(filter: EventSubscriptionFilter | undefined): ShardwireSubscriptionFilterKey[] {
	if (!filter) {
		return [];
	}
	const keys: ShardwireSubscriptionFilterKey[] = [];
	for (const k of Object.keys(filter) as ShardwireSubscriptionFilterKey[]) {
		if (filter[k] !== undefined) {
			keys.push(k);
		}
	}
	return keys;
}

/** Validates manifest-declared filter keys: catalog membership, then structural availability on event metadata. */
function checkManifestDeclaredFilterKeys(
	issues: ShardwireAppDiagnosisIssue[],
	eventName: BotEventName,
	keys: readonly ShardwireSubscriptionFilterKey[],
): void {
	const metadataKeys = EVENT_SUBSCRIPTION_METADATA_KEYS[eventName];
	for (const key of keys) {
		if (!KNOWN_FILTER_KEY_SET.has(key)) {
			issues.push({
				severity: 'error',
				code: 'unsupported_filter_key',
				category: 'subscription',
				message: `Manifest declares "${key}" for event "${eventName}" but it is not a built-in Shardwire subscription filter key.`,
				remediation: 'Use keys from `app.catalog().subscriptionFilters`.',
				context: { eventName, key },
			});
			continue;
		}
		if (!metadataKeys.has(key)) {
			issues.push({
				severity: 'error',
				code: 'filter_key_absent_from_event_metadata',
				category: 'subscription',
				message: `Manifest declares filter key "${key}" for "${eventName}", but the bridge never supplies that field on subscription matching metadata for this event — the filter cannot match any payload.`,
				remediation:
					'Remove the key from `manifest.filters` or use an event that exposes it in metadata (see `EVENT_SUBSCRIPTION_METADATA_KEYS` / bridge `eventMetadata`).',
				context: { eventName, key },
			});
		}
	}
}

function negotiatedSubsetOfExpected(
	negotiated: readonly string[],
	expected: readonly string[] | '*' | undefined,
): string[] {
	if (expected === undefined || expected === '*') {
		return [];
	}
	const allowed = new Set(expected);
	return negotiated.filter((x) => !allowed.has(x));
}

/**
 * Compares the manifest contract to negotiated capabilities, optional `expectedScope`, optional `botIntents`,
 * and optional runtime subscriptions.
 *
 * **`report.ok`** is `true` iff there are zero issues with `severity: 'error'` (warnings never flip it).
 *
 * **Surplus negotiation** (events or actions granted but not listed on the manifest) emits **`unused_negotiated_*`**
 * issues with `severity: 'warning'` only — useful for review, never treated as a hard failure and never affects `report.ok`.
 * **`expectedScope`** is the only way to turn “broader than I want” into **`severity: 'error'`** (`scope_broader_than_expected`).
 *
 * **Manifest filter keys:** `unsupported_filter_key` means not in the Shardwire catalog. `filter_key_absent_from_event_metadata`
 * means the key is catalog-valid but **never** appears on matching metadata for that event (structurally impossible), not
 * “might rarely match” or other traffic heuristics.
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/diagnose-shardwire-app/
 */
export function diagnoseShardwireApp(
	manifest: ShardwireAppManifest,
	negotiated: BridgeCapabilities,
	options?: DiagnoseShardwireAppOptions,
): ShardwireAppDiagnosisReport {
	const issues: ShardwireAppDiagnosisIssue[] = [];
	const requiredIntents = unionRequiredIntents(manifest.events);
	const minimumScope = generateSecretScope(manifest);

	const negotiatedEvents = new Set(negotiated.events);
	const negotiatedActions = new Set(negotiated.actions);
	const manifestEventSet = new Set(manifest.events);
	const manifestActionSet = new Set(manifest.actions);
	const manifestEventList = [...manifest.events];
	const manifestEventsQuoted =
		manifestEventList.length > 0
			? manifestEventList.map((e) => `'${e}'`).join(', ')
			: '(none — list every event your `app.on(...)` handlers use under `events` in `defineShardwireApp`)';
	const negotiatedEventList = [...negotiated.events];
	const negotiatedEventsQuoted =
		negotiatedEventList.length > 0
			? negotiatedEventList.map((e) => `'${e}'`).join(', ')
			: '(none — widen bot `intents` and/or scoped secret `allow.events` until the bridge negotiates events)';

	const strictIntent = options?.strictIntentCheck === true;
	const needsIntentInfo = requiredIntents.length > 0;
	if (needsIntentInfo && (!options?.botIntents || options.botIntents.length === 0)) {
		if (strictIntent) {
			issues.push({
				severity: 'error',
				code: 'strict_requires_bot_intents',
				category: 'intent',
				message:
					'Strict startup: manifest events require gateway intents; pass `botIntents` matching `createBotBridge({ intents })`.',
				remediation: 'Call `app.ready({ strict: true, manifest, botIntents: [...] })`.',
				context: { requiredIntents },
			});
		} else {
			issues.push({
				severity: 'warning',
				code: 'bot_intents_unknown',
				category: 'intent',
				message:
					'Manifest events require gateway intents; `botIntents` was not provided so intent coverage could not be checked.',
				remediation: 'Pass `botIntents` into `diagnoseShardwireApp` to verify intents.',
				context: { requiredIntents },
			});
		}
	} else if (options?.botIntents && options.botIntents.length > 0) {
		const enabled = new Set(options.botIntents);
		for (const intent of requiredIntents) {
			if (!enabled.has(intent)) {
				issues.push({
					severity: 'error',
					code: 'missing_intent',
					category: 'intent',
					message: `Gateway intent "${intent}" is required for manifest events but is not enabled on the bot bridge.`,
					remediation: `Add "${intent}" to \`createBotBridge({ intents: [...] })\`.`,
					context: { intent, requiredIntents },
				});
			}
		}
	}

	for (const ev of manifest.events) {
		if (!negotiatedEvents.has(ev)) {
			issues.push({
				severity: 'error',
				code: 'missing_event_capability',
				category: 'secret_scope',
				message: `Negotiated capabilities do not include required event "${ev}".`,
				remediation:
					'Widen scoped secret `allow.events` and/or bot gateway intents so this event is produced and allowed.',
				context: { event: ev },
			});
		}
	}

	for (const act of manifest.actions) {
		if (!negotiatedActions.has(act)) {
			issues.push({
				severity: 'error',
				code: 'missing_action_capability',
				category: 'action',
				message: `Action "${act}" is declared by the manifest but is not in negotiated capabilities; it cannot succeed in this configuration.`,
				remediation: 'Include this action in scoped secret `allow.actions` (or use a full-access secret).',
				context: { action: act },
			});
		}
	}

	for (const ev of negotiated.events) {
		if (!manifestEventSet.has(ev)) {
			issues.push({
				severity: 'warning',
				code: 'unused_negotiated_event',
				category: 'unused_capability',
				message: `Negotiated capabilities include event "${ev}" which is not listed on the manifest (often fine for shared secrets / deployment simplicity).`,
				remediation:
					'Ignore if intentional. To fail startup when negotiation is too broad, pass `expectedScope` (or narrow the scoped secret / intents).',
				context: { event: ev },
			});
		}
	}

	for (const act of negotiated.actions) {
		if (!manifestActionSet.has(act)) {
			issues.push({
				severity: 'warning',
				code: 'unused_negotiated_action',
				category: 'unused_capability',
				message: `Negotiated capabilities include action "${act}" which is not listed on the manifest (often fine for shared secrets / deployment simplicity).`,
				remediation:
					'Ignore if intentional. To fail startup when negotiation is too broad, pass `expectedScope` (or narrow the scoped secret).',
				context: { action: act },
			});
		}
	}

	if (manifest.filters) {
		for (const [ev, keys] of Object.entries(manifest.filters) as [
			BotEventName,
			readonly ShardwireSubscriptionFilterKey[] | undefined,
		][]) {
			if (!keys?.length) {
				continue;
			}
			checkManifestDeclaredFilterKeys(issues, ev, keys);
		}
	}

	const subscriptions = options?.subscriptions;
	if (subscriptions?.length) {
		for (const sub of subscriptions) {
			if (!manifestEventSet.has(sub.name)) {
				issues.push({
					severity: 'error',
					code: 'subscription_event_not_in_manifest',
					category: 'subscription',
					message: `Handler is registered for \`${sub.name}\` (e.g. \`app.on('${sub.name}', ...)\`), but that event is not listed in \`manifest.events\`. The manifest currently declares only: ${manifestEventsQuoted}.`,
					remediation: `Add \`'${sub.name}'\` to the \`events\` array in \`defineShardwireApp({ ... })\`, or remove this \`app.on\` subscription if it was registered by mistake.`,
					context: {
						subscribedEvent: sub.name,
						event: sub.name,
						manifestEvents: manifestEventList,
					},
				});
				continue;
			}

			const usedKeys = filterKeysFromObject(sub.filter);
			if (usedKeys.length > 0) {
				const declared = manifest.filters?.[sub.name];
				if (!declared?.length) {
					const keysExample = usedKeys.map((k) => `'${k}'`).join(', ');
					issues.push({
						severity: 'error',
						code: 'manifest_filters_required_for_subscription',
						category: 'subscription',
						message: `Handler for \`${sub.name}\` passes a non-empty \`filter\` object with keys: ${usedKeys
							.map((k) => `'${k}'`)
							.join(
								', ',
							)}. Strict mode requires those keys to be listed under \`manifest.filters['${sub.name}']\`, but that entry is missing or empty. \`manifest.events\` currently includes: ${manifestEventsQuoted}.`,
						remediation: `In \`defineShardwireApp\`, add e.g. \`filters: { ${sub.name}: [${keysExample}] }\` (include every filter key this handler may pass).`,
						context: {
							subscribedEvent: sub.name,
							event: sub.name,
							subscriptionFilterKeys: usedKeys,
							manifestEvents: manifestEventList,
						},
					});
				} else {
					const declaredSet = new Set(declared);
					for (const key of usedKeys) {
						if (!declaredSet.has(key)) {
							const declaredQuoted = declared.map((k) => `'${k}'`).join(', ');
							issues.push({
								severity: 'error',
								code: 'subscription_filter_key_not_declared_in_manifest',
								category: 'subscription',
								message: `Handler for \`${sub.name}\` uses filter key \`${key}\`, which is not listed under \`manifest.filters['${sub.name}']\`. Declared keys for that event: ${declaredQuoted}. \`manifest.events\` includes: ${manifestEventsQuoted}.`,
								remediation: `Add \`'${key}'\` to \`manifest.filters['${sub.name}']\` alongside the other keys you use, or stop passing \`${key}\` in the handler's filter object.`,
								context: {
									subscribedEvent: sub.name,
									event: sub.name,
									filterKey: key,
									key,
									subscriptionFilterKeys: usedKeys,
									declaredFilterKeys: [...declared],
									manifestEvents: manifestEventList,
								},
							});
						}
					}
				}
			}

			if (!negotiatedEvents.has(sub.name)) {
				issues.push({
					severity: 'error',
					code: 'missing_event_capability',
					category: 'subscription',
					message: `Handler is registered for \`${sub.name}\` (\`app.on('${sub.name}', ...)\`), but negotiated bridge capabilities do not include that event, so it will never receive payloads. Negotiated events: ${negotiatedEventsQuoted}.`,
					remediation:
						'Widen `createBotBridge({ intents })` and/or the scoped secret `allow.events` until this event is negotiated, or remove the handler.',
					context: {
						subscribedEvent: sub.name,
						event: sub.name,
						manifestEvents: manifestEventList,
						negotiatedEvents: negotiatedEventList,
					},
				});
			}
		}
	}

	const expected = options?.expectedScope;
	if (expected) {
		const extraEvents = negotiatedSubsetOfExpected(negotiated.events, expected.events);
		for (const ev of extraEvents) {
			issues.push({
				severity: 'error',
				code: 'scope_broader_than_expected',
				category: 'secret_scope',
				message: `Negotiated event "${ev}" is outside \`expectedScope.events\` (secret/intents grant more than the declared maximum).`,
				remediation: 'Tighten bot intents and/or scoped secret `allow.events`, or widen `expectedScope.events`.',
				context: { event: ev },
			});
		}
		const extraActions = negotiatedSubsetOfExpected(negotiated.actions, expected.actions);
		for (const act of extraActions) {
			issues.push({
				severity: 'error',
				code: 'scope_broader_than_expected',
				category: 'secret_scope',
				message: `Negotiated action "${act}" is outside \`expectedScope.actions\`.`,
				remediation: 'Tighten scoped secret `allow.actions`, or widen `expectedScope.actions`.',
				context: { action: act },
			});
		}
	}

	const hasError = issues.some((i) => i.severity === 'error');
	return {
		ok: !hasError,
		issues,
		requiredIntents,
		minimumScope,
	};
}
