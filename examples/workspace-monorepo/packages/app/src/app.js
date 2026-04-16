import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { connectBotBridge } from 'shardwire/client';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
config({ path: join(rootDir, '.env') });

const secret = process.env.SHARDWIRE_SECRET;
const url = process.env.SHARDWIRE_URL ?? 'ws://127.0.0.1:3001/shardwire';

if (!secret) {
	console.error('Missing SHARDWIRE_SECRET in the workspace root .env');
	process.exit(1);
}

const app = connectBotBridge({
	url,
	secret,
	appName: 'workspace-tutorial-app',
});

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

app.on('interactionCreate', async ({ interaction }) => {
	if (interaction.kind !== 'chatInput' || interaction.commandName !== 'hello') return;
	const result = await app.actions.replyToInteraction({
		interactionId: interaction.id,
		content: 'Hello from Shardwire!',
	});
	if (!result.ok) {
		console.error('replyToInteraction failed', result.error.code, result.error.message);
	}
});

await app.ready();
console.log('app bridge ready');
console.log('capabilities', app.capabilities());
