import 'dotenv/config';
import { createBotBridge } from 'shardwire';
import { browserSecretId, browserSecretScope } from '../src/shardwire-manifest.js';

const browserSecret = process.env.SHARDWIRE_BROWSER_SECRET;
const token = process.env.DISCORD_TOKEN;

if (!browserSecret || !token) {
	console.error('Missing DISCORD_TOKEN or SHARDWIRE_BROWSER_SECRET (.env or environment)');
	process.exit(1);
}

const bridge = createBotBridge({
	token,
	intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
	server: {
		port: 3001,
		secrets: [
			{
				id: browserSecretId,
				value: browserSecret,
				allow: browserSecretScope,
			},
		],
	},
});

await bridge.ready();
console.log('bot bridge ready');
