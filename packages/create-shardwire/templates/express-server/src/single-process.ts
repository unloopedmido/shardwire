import 'dotenv/config';
import { createBotBridge } from 'shardwire';

const token = process.env.DISCORD_TOKEN;

if (!token) {
	console.error('Missing DISCORD_TOKEN (.env or environment)');
	process.exit(1);
}

const bridge = createBotBridge({
	mode: 'single-process',
	token,
	intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
});

const app = bridge.app();
if (!app) {
	console.error('single-process app bridge unavailable');
	process.exit(1);
}

app.on('messageCreate', async ({ message }) => {
	console.log('message', message.channelId, message.content);
	if (!message.content?.includes('!ping')) return;
	const result = await app.actions.sendMessage({
		channelId: message.channelId,
		content: 'pong',
	});
	if (!result.ok) {
		console.error('sendMessage failed', result.error.code, result.error.message);
	}
});

await bridge.ready();
console.log('single-process bridge ready');
console.log('capabilities', app.capabilities());
