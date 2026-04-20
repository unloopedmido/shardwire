import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: [
			{
				find: 'shardwire/client',
				replacement: fileURLToPath(new URL('../shardwire/src/client.ts', import.meta.url)),
			},
			{
				find: 'shardwire',
				replacement: fileURLToPath(new URL('../shardwire/src/index.ts', import.meta.url)),
			},
		],
	},
	test: {
		environment: 'jsdom',
	},
});
