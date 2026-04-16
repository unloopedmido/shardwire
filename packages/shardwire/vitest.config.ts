import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: ['./test/setup-crypto.ts', './test/setup-websocket.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			include: ['src/**/*.ts'],
			exclude: ['**/*.d.ts'],
			thresholds: {
				lines: 50,
				functions: 43,
				branches: 43,
				statements: 50,
			},
		},
	},
});
