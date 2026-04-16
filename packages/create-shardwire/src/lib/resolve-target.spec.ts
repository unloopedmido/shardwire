import { describe, expect, it } from 'vitest';

import { resolveTarget } from './resolve-target.js';

describe('resolveTarget', () => {
	it('uses basename for slug when path is nested', () => {
		const { projectSlug, targetDir } = resolveTarget('/tmp/my-cool-app', '/home/u');
		expect(projectSlug).toBe('my-cool-app');
		expect(targetDir.endsWith('my-cool-app')).toBe(true);
	});

	it('uses simple name under cwd', () => {
		const { projectSlug, targetDir } = resolveTarget('hello-world', '/home/u/proj');
		expect(projectSlug).toBe('hello-world');
		expect(targetDir).toBe('/home/u/proj/hello-world');
	});
});
