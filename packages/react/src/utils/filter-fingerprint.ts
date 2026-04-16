import type { EventSubscriptionFilter, ShardwireSubscriptionFilterKey } from 'shardwire/client';

const FILTER_KEYS: readonly ShardwireSubscriptionFilterKey[] = [
	'guildId',
	'channelId',
	'userId',
	'messageId',
	'interactionId',
	'commandName',
	'customId',
	'interactionKind',
	'emoji',
	'channelType',
	'parentChannelId',
	'threadId',
	'voiceChannelId',
];

/**
 * Stable string for `useEffect` deps so inline `{ guildId }` objects do not churn subscriptions every render.
 */
export function shardwireFilterFingerprint(filter: EventSubscriptionFilter | undefined): string {
	if (!filter) return '';

	const normalized: Record<string, unknown> = {};
	for (const key of FILTER_KEYS) {
		const v = filter[key];
		if (v === undefined) continue;
		normalized[key] = normalizeFilterValue(v);
	}

	return JSON.stringify(
		Object.keys(normalized)
			.sort()
			.reduce<Record<string, unknown>>((acc, k) => {
				acc[k] = normalized[k];
				return acc;
			}, {}),
	);
}

function normalizeFilterValue(value: EventSubscriptionFilter[ShardwireSubscriptionFilterKey]): unknown {
	if (Array.isArray(value)) {
		return [...value].map((x) => String(x)).sort();
	}
	if (typeof value === 'object' && value !== null) {
		return String(value);
	}
	return value;
}
