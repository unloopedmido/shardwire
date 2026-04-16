import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/cli.ts'],
	format: ['esm'],
	platform: 'node',
	target: 'node22',
	sourcemap: true,
	clean: true,
	dts: false,
	bundle: true,
	shims: false,
	banner: {
		js: '#!/usr/bin/env node',
	},
});
