import { describe, expect, it } from 'vitest';

import { isValidNpmName, manifestNameFromSlug, slugifyProjectName } from './validate.js';

describe('slugifyProjectName', () => {
	it('normalizes spaces and casing', () => {
		expect(slugifyProjectName('  My Cool App  ')).toBe('my-cool-app');
	});

	it('falls back when empty', () => {
		expect(slugifyProjectName('...')).toBe('shardwire-app');
	});
});

describe('isValidNpmName', () => {
	it('accepts unscoped names', () => {
		expect(isValidNpmName('my-app')).toBe(true);
	});

	it('accepts scoped names', () => {
		expect(isValidNpmName('@acme/cool-bot')).toBe(true);
	});

	it('rejects empty', () => {
		expect(isValidNpmName('')).toBe(false);
	});
});

describe('manifestNameFromSlug', () => {
	it('produces a stable manifest id', () => {
		expect(manifestNameFromSlug('my-app')).toBe('my-app');
	});
});
