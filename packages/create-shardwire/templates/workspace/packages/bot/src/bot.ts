import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { createBotBridge } from 'shardwire';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
config({ path: join(rootDir, '.env') });

const secret = process.env.SHARDWIRE_SECRET;
const token = process.env.DISCORD_TOKEN;

if (!secret || !token) {
	console.error('Missing DISCORD_TOKEN or SHARDWIRE_SECRET in the workspace root .env');
	process.exit(1);
}

const bridge = createBotBridge({
	token,
	intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
	server: {
		port: 3001,
		secrets: [secret],
	},
});

await bridge.ready();
console.log('bot bridge ready');
