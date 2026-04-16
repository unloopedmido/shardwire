import validate from 'validate-npm-package-name';

/** Whether `name` is valid for a new package on the public npm registry. */
export function isValidNpmName(name: string): boolean {
	return validate(name).validForNewPackages;
}

/** Normalize user input into a safe npm package name segment (unscoped). */
export function slugifyProjectName(input: string): string {
	const s = input
		.trim()
		.toLowerCase()
		.replace(/\./g, '-')
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!s || s === '.' || s === '..') {
		return 'shardwire-app';
	}
	return s.slice(0, 214);
}

/** Stable manifest / appName string from the project slug (defineShardwireApp, connectBotBridge). */
export function manifestNameFromSlug(slug: string): string {
	const n = slug
		.replace(/[^a-z0-9-]/gi, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
		.slice(0, 32);
	return n || 'shardwire-app';
}
