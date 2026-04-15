import {
	BOT_ACTION_NAMES,
	BOT_EVENT_NAMES,
	EVENT_REQUIRED_INTENTS,
	SUBSCRIPTION_FILTER_KEYS,
} from '../discord/catalog';
import type { ShardwireCatalog, ShardwireSubscriptionFilterKey } from '../discord/types';

/**
 * Returns the full static Shardwire catalog (not negotiated per-connection).
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/get-shardwire-catalog/
 */
export function getShardwireCatalog(): ShardwireCatalog {
	return {
		events: BOT_EVENT_NAMES.map((name) => ({
			name,
			requiredIntents: EVENT_REQUIRED_INTENTS[name],
		})),
		actions: [...BOT_ACTION_NAMES],
		subscriptionFilters: [...SUBSCRIPTION_FILTER_KEYS] as readonly ShardwireSubscriptionFilterKey[],
	};
}
