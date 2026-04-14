import { BOT_ACTION_NAMES, BOT_EVENT_NAMES, SUBSCRIPTION_FILTER_KEYS } from '../discord/catalog';
import type {
	BotEventName,
	SecretPermissions,
	ShardwireAppManifest,
	ShardwireAppManifestDefinition,
	ShardwireSubscriptionFilterKey,
} from '../discord/types';

const knownEvents = new Set<string>(BOT_EVENT_NAMES);
const knownActions = new Set<string>(BOT_ACTION_NAMES);
const knownFilterKeys = new Set<string>(SUBSCRIPTION_FILTER_KEYS);

function dedupePreserve<T extends string>(items: readonly T[]): T[] {
	const seen = new Set<string>();
	const out: T[] = [];
	for (const item of items) {
		if (seen.has(item)) {
			continue;
		}
		seen.add(item);
		out.push(item);
	}
	return out;
}

/** Default label when {@link ShardwireAppManifestDefinition.name} is omitted. */
const DEFAULT_MANIFEST_NAME = 'shardwire-app';

/**
 * Declares a minimal app contract: required **`events`** / **`actions`**, optional **`filters`** per event, optional **`name`**.
 * Do not use this for transport, secrets, intents, or startup policy — keep those elsewhere.
 */
export function defineShardwireApp(definition: ShardwireAppManifestDefinition): ShardwireAppManifest {
	const trimmed = definition.name?.trim() ?? '';
	const name = trimmed.length > 0 ? trimmed : DEFAULT_MANIFEST_NAME;

	const events = dedupePreserve(definition.events);
	const actions = dedupePreserve(definition.actions);

	for (const ev of events) {
		if (!knownEvents.has(ev)) {
			throw new Error(
				`defineShardwireApp: unknown event "${String(ev)}". Use names from the Shardwire catalog (see \`getShardwireCatalog()\`).`,
			);
		}
	}
	for (const act of actions) {
		if (!knownActions.has(act)) {
			throw new Error(
				`defineShardwireApp: unknown action "${String(act)}". Use names from the Shardwire catalog (see \`getShardwireCatalog()\`).`,
			);
		}
	}

	const eventSet = new Set(events);
	const filters: Partial<Record<BotEventName, readonly ShardwireSubscriptionFilterKey[]>> = {};

	if (definition.filters) {
		for (const [rawEvent, keys] of Object.entries(definition.filters)) {
			if (keys === undefined || keys.length === 0) {
				continue;
			}
			if (!knownEvents.has(rawEvent)) {
				throw new Error(
					`defineShardwireApp: filters include unknown event "${rawEvent}". Declare the event in \`events\` and use a built-in event name.`,
				);
			}
			const ev = rawEvent as BotEventName;
			if (!eventSet.has(ev)) {
				throw new Error(
					`defineShardwireApp: filters are declared for event "${rawEvent}" but that event is not listed in \`events\`.`,
				);
			}
			const dedupedKeys = dedupePreserve(keys);
			for (const key of dedupedKeys) {
				if (!knownFilterKeys.has(key)) {
					throw new Error(
						`defineShardwireApp: unsupported subscription filter key "${String(key)}" for event "${rawEvent}". See \`app.catalog().subscriptionFilters\`.`,
					);
				}
			}
			filters[ev] = dedupedKeys;
		}
	}

	return {
		name,
		events,
		actions,
		...(Object.keys(filters).length > 0 ? { filters } : {}),
	};
}

/**
 * Minimum `SecretPermissions` implied by a manifest (required events and actions).
 * Use inside `server.secrets[].allow` when authoring scoped secrets.
 */
export function generateSecretScope(manifest: ShardwireAppManifest): SecretPermissions {
	return {
		events: [...manifest.events],
		actions: [...manifest.actions],
	};
}
