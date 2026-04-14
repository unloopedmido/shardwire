/** Origin of the published Shardwire docs (no trailing slash). */
export const SHARDWIRE_DOCS_ORIGIN = 'https://unloopedmido.github.io/shardwire' as const;

/**
 * Canonical documentation URLs for IDE `@see` tags and runtime links.
 * Keep page paths aligned with the docs site so hovers stay accurate.
 */
export const SHARDWIRE_DOCS = {
	home: `${SHARDWIRE_DOCS_ORIGIN}/`,
	gettingStarted: `${SHARDWIRE_DOCS_ORIGIN}/getting-started/`,
	botSetup: `${SHARDWIRE_DOCS_ORIGIN}/bot-setup/`,
	appSetup: `${SHARDWIRE_DOCS_ORIGIN}/app-setup/`,
	manifests: `${SHARDWIRE_DOCS_ORIGIN}/manifests/`,
	strictStartup: `${SHARDWIRE_DOCS_ORIGIN}/strict-startup/`,
	diagnostics: `${SHARDWIRE_DOCS_ORIGIN}/diagnostics/`,
	scopedSecrets: `${SHARDWIRE_DOCS_ORIGIN}/scoped-secrets/`,
	deployment: `${SHARDWIRE_DOCS_ORIGIN}/deployment/`,
	troubleshooting: `${SHARDWIRE_DOCS_ORIGIN}/troubleshooting/`,
	errors: `${SHARDWIRE_DOCS_ORIGIN}/errors/`,
	examples: `${SHARDWIRE_DOCS_ORIGIN}/examples/`,
	changelog: `${SHARDWIRE_DOCS_ORIGIN}/changelog/`,
	/** @deprecated Prefer {@link SHARDWIRE_DOCS.changelog}. Kept as an alias for the same URL. */
	releaseNotes: `${SHARDWIRE_DOCS_ORIGIN}/changelog/`,
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
