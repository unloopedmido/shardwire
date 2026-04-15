import { BOT_ACTION_NAMES, BOT_EVENT_NAMES, SUBSCRIPTION_FILTER_KEYS } from '../discord/catalog';
import { withErrorDocsLink } from '../utils/docs-links';
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
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/define-shardwire-app/
 */
export function defineShardwireApp(definition: ShardwireAppManifestDefinition): ShardwireAppManifest {
	const trimmed = definition.name?.trim() ?? '';
	const name = trimmed.length > 0 ? trimmed : DEFAULT_MANIFEST_NAME;

	const events = dedupePreserve(definition.events);
	const actions = dedupePreserve(definition.actions);

	for (const ev of events) {
		if (!knownEvents.has(ev)) {
			throw new Error(
				withErrorDocsLink(
					`defineShardwireApp: unknown event "${String(ev)}". Use names from the Shardwire catalog (see \`getShardwireCatalog()\`).`,
					'manifest-unknown-event',
				),
			);
		}
	}
	for (const act of actions) {
		if (!knownActions.has(act)) {
			throw new Error(
				withErrorDocsLink(
					`defineShardwireApp: unknown action "${String(act)}". Use names from the Shardwire catalog (see \`getShardwireCatalog()\`).`,
					'manifest-unknown-action',
				),
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
					withErrorDocsLink(
						`defineShardwireApp: filters include unknown event "${rawEvent}". Declare the event in \`events\` and use a built-in event name.`,
						'manifest-filter-unknown-event',
					),
				);
			}
			const ev = rawEvent as BotEventName;
			if (!eventSet.has(ev)) {
				throw new Error(
					withErrorDocsLink(
						`defineShardwireApp: filters are declared for event "${rawEvent}" but that event is not listed in \`events\`.`,
						'manifest-filter-event-not-listed',
					),
				);
			}
			const dedupedKeys = dedupePreserve(keys);
			for (const key of dedupedKeys) {
				if (!knownFilterKeys.has(key)) {
					throw new Error(
						withErrorDocsLink(
							`defineShardwireApp: unsupported subscription filter key "${String(key)}" for event "${rawEvent}". See \`app.catalog().subscriptionFilters\`.`,
							'manifest-filter-key-unsupported',
						),
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
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/generate-secret-scope/
 */
export function generateSecretScope(manifest: ShardwireAppManifest): SecretPermissions {
	return {
		events: [...manifest.events],
		actions: [...manifest.actions],
	};
}
