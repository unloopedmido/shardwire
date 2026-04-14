import { SHARDWIRE_DOCS_ORIGIN } from './docs-links';

/**
 * Kept in sync with `apps/website/scripts/reference/routing.mjs` (reference doc generator).
 * When categories or slug rules change, update both places and run website tests.
 */
export function slugifyReferenceSymbol(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

/** Same routing as the generated reference section folders. */
export function getReferenceCategoryId(name: string): string {
	if (name.startsWith('createThreadThen') || name.startsWith('defer')) {
		return 'workflows';
	}

	if (
		name === 'defineShardwireApp' ||
		name === 'generateSecretScope' ||
		name === 'diagnoseShardwireApp' ||
		name === 'getShardwireCatalog' ||
		name.startsWith('ShardwireApp') ||
		name.startsWith('DiagnoseShardwire') ||
		name.startsWith('CapabilityExplanation') ||
		name.startsWith('Preflight') ||
		name === 'ShardwireCatalog'
	) {
		return 'contracts-and-diagnostics';
	}

	if (
		name.includes('Error') ||
		name.includes('Failure') ||
		name === 'ActionResult' ||
		name === 'ActionSuccess' ||
		name === 'ActionFailure'
	) {
		return 'errors-and-failures';
	}

	if (
		name.includes('Action') ||
		name === 'BotActionName' ||
		name === 'BotActionPayloadMap' ||
		name === 'BotActionResultDataMap'
	) {
		return 'action-models';
	}

	if (
		name.includes('Event') ||
		name.startsWith('Bridge') ||
		name === 'BotIntentName' ||
		name === 'BotEventName' ||
		name === 'ShardwireSubscriptionFilterKey'
	) {
		return 'event-and-data-models';
	}

	return 'bridge-apis';
}

/**
 * Absolute URL of the generated reference page for a **public export** symbol
 * (same slug as the docs site under `/docs/reference/<section>/<slug>/`).
 */
export function docsReferenceAbsoluteUrl(exportName: string, origin: string = SHARDWIRE_DOCS_ORIGIN): string {
	const category = getReferenceCategoryId(exportName);
	const slug = slugifyReferenceSymbol(exportName);
	return `${origin}/docs/reference/${category}/${slug}/`;
}
