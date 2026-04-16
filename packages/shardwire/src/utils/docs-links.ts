/** Origin of the published Shardwire docs (no trailing slash). */
export const SHARDWIRE_DOCS_ORIGIN = 'https://shardwire.js.org' as const;

/**
 * Canonical documentation URLs for IDE `@see` tags and runtime links.
 * Keep page paths aligned with the docs site so hovers stay accurate.
 */
export const SHARDWIRE_DOCS = {
	home: `${SHARDWIRE_DOCS_ORIGIN}/docs/`,
	gettingStarted: `${SHARDWIRE_DOCS_ORIGIN}/docs/getting-started/`,
	botSetup: `${SHARDWIRE_DOCS_ORIGIN}/docs/reference/bridge-apis/create-bot-bridge/`,
	appSetup: `${SHARDWIRE_DOCS_ORIGIN}/docs/reference/bridge-apis/connect-bot-bridge/`,
	manifests: `${SHARDWIRE_DOCS_ORIGIN}/docs/reference/contracts-and-diagnostics/define-shardwire-app/`,
	strictStartup: `${SHARDWIRE_DOCS_ORIGIN}/docs/reference/contracts-and-diagnostics/diagnose-shardwire-app/`,
	diagnostics: `${SHARDWIRE_DOCS_ORIGIN}/docs/reference/contracts-and-diagnostics/diagnose-shardwire-app/`,
	scopedSecrets: `${SHARDWIRE_DOCS_ORIGIN}/docs/concepts/how-it-works/`,
	deployment: `${SHARDWIRE_DOCS_ORIGIN}/docs/guides/keeping-it-alive/`,
	troubleshooting: `${SHARDWIRE_DOCS_ORIGIN}/docs/troubleshooting/`,
	errors: `${SHARDWIRE_DOCS_ORIGIN}/docs/troubleshooting/`,
	tutorial: `${SHARDWIRE_DOCS_ORIGIN}/docs/tutorial/first-interaction/`,
	howShardwireWorks: `${SHARDWIRE_DOCS_ORIGIN}/docs/concepts/how-it-works/`,
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
