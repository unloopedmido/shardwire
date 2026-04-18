import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
	scripts?: Record<string, string>;
};

describe('package metadata and docs', () => {
	it('documents the current bridge startup API', () => {
		expect(readme).toContain('await bridge.ready();');
		expect(readme).not.toContain('await bridge.start();');
		expect(readme).not.toContain('const session = await connectBotBridge(');
	});

	it('cleans dist as part of the build script', () => {
		expect(packageJson.scripts?.build).toContain('--clean');
	});
});
