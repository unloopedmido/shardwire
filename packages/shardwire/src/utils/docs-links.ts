/** Origin of the published Shardwire docs (no trailing slash). */
export const SHARDWIRE_DOCS_ORIGIN = 'https://unloopedmido.github.io/shardwire' as const;

/**
 * Canonical documentation URLs for IDE `@see` tags and runtime links.
 * Keep page paths aligned with the docs site so hovers stay accurate.
 */
export const SHARDWIRE_DOCS = {
	home: `${SHARDWIRE_DOCS_ORIGIN}/docs/`,
	gettingStarted: `${SHARDWIRE_DOCS_ORIGIN}/docs/getting-started/`,
	botSetup: `${SHARDWIRE_DOCS_ORIGIN}/docs/guides/bot-bridge/`,
	appSetup: `${SHARDWIRE_DOCS_ORIGIN}/docs/guides/app-bridge/`,
	manifests: `${SHARDWIRE_DOCS_ORIGIN}/docs/guides/manifests/`,
	strictStartup: `${SHARDWIRE_DOCS_ORIGIN}/docs/guides/strict-startup/`,
	diagnostics: `${SHARDWIRE_DOCS_ORIGIN}/docs/operations/diagnostics/`,
	scopedSecrets: `${SHARDWIRE_DOCS_ORIGIN}/docs/concepts/capabilities-and-scopes/`,
	deployment: `${SHARDWIRE_DOCS_ORIGIN}/docs/operations/deployment/`,
	troubleshooting: `${SHARDWIRE_DOCS_ORIGIN}/docs/operations/troubleshooting/`,
	errors: `${SHARDWIRE_DOCS_ORIGIN}/docs/operations/troubleshooting/`,
	examples: `${SHARDWIRE_DOCS_ORIGIN}/docs/getting-started/`,
	changelog: `${SHARDWIRE_DOCS_ORIGIN}/docs/changelog/`,
	/** @deprecated Prefer {@link SHARDWIRE_DOCS.changelog}. Kept as an alias for the same URL. */
	releaseNotes: `${SHARDWIRE_DOCS_ORIGIN}/docs/changelog/`,
} as const;

const ERROR_DOCS_BASE_URL = SHARDWIRE_DOCS.errors;

export function docsErrorLink(anchor: string): string {
	return `${ERROR_DOCS_BASE_URL}#${anchor}`;
}

export function withErrorDocsLink(message: string, anchor: string): string {
	if (message.includes('See: http://') || message.includes('See: https://')) {
		return message;
	}
	return `${message} See: ${docsErrorLink(anchor)}`;
}
