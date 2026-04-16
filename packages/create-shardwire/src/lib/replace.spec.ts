import { describe, expect, it } from 'vitest';

import { applyTemplateVars, assertNoUnresolvedPlaceholders } from './replace.js';

describe('applyTemplateVars', () => {
	it('replaces known keys', () => {
		expect(applyTemplateVars('hello {{FOO}}', { FOO: 'world' })).toBe('hello world');
	});

	it('leaves unknown tokens', () => {
		expect(applyTemplateVars('{{A}} {{B}}', { A: '1' })).toBe('1 {{B}}');
	});
});

describe('assertNoUnresolvedPlaceholders', () => {
	it('throws when placeholders remain', () => {
		expect(() => assertNoUnresolvedPlaceholders('x {{Y}} z', 't')).toThrow(/Unresolved/);
	});

	it('passes when clean', () => {
		expect(() => assertNoUnresolvedPlaceholders('ok', 't')).not.toThrow();
	});
});
